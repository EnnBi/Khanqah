# Auth Bootstrap Fix — Design

**Status:** Design approved · ready for implementation plan
**Date:** 2026-04-18

## 1. Problem

On cold load, `supabase.auth.getSession()` hangs even when a valid, unexpired session exists in `localStorage`. The `AuthProvider` races the call against a 3-second timeout and, on timeout, calls `supabase.auth.signOut()` as "recovery" — destroying the valid cached tokens. The symptom chain is:

- Public routes: 3 s of blocked render, then guest fallback. `useLatestContent` requests eventually fire and return 200.
- Admin routes: 3 s of blocked render, then `signOut()` → session state = `null` → the `AuthGate` shows a spinner forever because the admin-only UI has no user to render for. Navigating directly to `/admin/schedule` briefly redirects to `/admin` and back as the gate re-evaluates on the cleared session.
- Hard reload reproduces the bug consistently.

The stored session is intact at the point of the hang (`access_token` + `refresh_token` populated, `expires_at` ~57 min in the future, `role: 'authenticated'`), so the problem is not token freshness — it is `getSession()` itself not resolving.

Probable root cause: on web, `getSession()` in `@supabase/supabase-js` v2 acquires a `navigator.locks`-backed mutex before reading storage. In certain scenarios (stale lock from a prior navigation, interaction with React Native Web's AsyncStorage bridge) the lock acquisition never returns. Because no auth network requests are observed in the hang window, the client is stuck internally, not on the wire.

## 2. Scope

- **In scope:** rewrite the bootstrap flow in `providers/AuthProvider.tsx` so it does not call `getSession()` and does not destructively `signOut()` on any timeout.
- **Out of scope:** mixed-content config fetch (future-proofing), bad `media_url` data rows (admin data fix), `expo-av` deprecation (separate library migration).

## 3. Architecture

```
mount
 ├─ subscribe to supabase.auth.onAuthStateChange
 │   (Supabase delivers INITIAL_SESSION on the next microtask
 │    with the current cached session or null — no network, no lock)
 └─ start 2 s safety timer
      └─ if fires before any auth event: loading = false
         (app renders as guest; tokens are NOT touched)

auth event fires (INITIAL_SESSION | SIGNED_IN | TOKEN_REFRESHED | SIGNED_OUT | USER_UPDATED)
 ├─ setSession(event.session)
 ├─ if session.user: fetchUserProfile(session.user.id) → setUser(profile | null)
 ├─ setLoading(false)
 └─ clear safety timer

unmount
 ├─ subscription.unsubscribe()
 └─ clear safety timer
```

**Key design decision:** the listener is the source of truth for initial session state. `INITIAL_SESSION` is delivered by Supabase as the first callback after you subscribe, asynchronously on the next microtask — it reads the same cached session `getSession()` would return, but without going through the `navigator.locks` path that is hanging. There is no need to additionally call `getSession()`.

**What the safety timer does and does not do:**
- It flips `loading = false` so the UI becomes interactive even if the listener never fires.
- It never calls `signOut()`, never clears tokens, never touches the Supabase client. The listener is still active; if a session emerges later, state updates and authenticated UI takes over.

## 4. File changes

Single file: `providers/AuthProvider.tsx`.

### What gets removed

- The `Promise.race(getSession(), setTimeout(reject, 3000))` block.
- The destructive `supabase.auth.signOut()` inside the `catch (err)` branch.
- The manual `bootstrapSession()` async function.

### What gets kept (unchanged)

- `signInWithEmail`, `signUpWithEmail`, `signInWithPhone`, `verifyOtp`, `signInWithGoogle`, `signOut` — the auth actions exported to consumers.
- `fetchUserProfile` helper.
- The `isAdmin` / `isEditor` derived booleans.
- The `cancelled` guard so async callbacks do not set state on an unmounted component.
- `subscription.unsubscribe()` on cleanup.

### What is new

- A 2-second safety timer started at mount and cleared on first auth event or on unmount.
- A single try/catch around the listener callback body so a single bad event cannot tear the provider down.
- `setUser(null)` inside the `SIGNED_OUT` / null-session branch (already there for the null path; retained explicitly).

### Sketch of the new `useEffect` body

```tsx
let cancelled = false;
let safetyTimer: ReturnType<typeof setTimeout> | null = setTimeout(() => {
  if (!cancelled) setLoading(false);
  safetyTimer = null;
}, 2000);

const { data: { subscription } } = supabase.auth.onAuthStateChange(
  async (_event, s) => {
    if (cancelled) return;
    try {
      setSession(s);
      if (s?.user) {
        const profile = await fetchUserProfile(s.user.id);
        if (!cancelled) setUser(profile);
      } else {
        if (!cancelled) setUser(null);
      }
    } catch (err) {
      console.warn('[auth] onAuthStateChange failed:', err);
    } finally {
      if (!cancelled) setLoading(false);
      if (safetyTimer) { clearTimeout(safetyTimer); safetyTimer = null; }
    }
  },
);

return () => {
  cancelled = true;
  subscription.unsubscribe();
  if (safetyTimer) clearTimeout(safetyTimer);
};
```

The sketch will be translated into the final form in the implementation plan.

## 5. Error handling

- **Profile fetch failure inside the listener callback:** the existing `console.warn` path is preserved, plus `loading` still flips to `false` (we have a session; we just failed to enrich with the profile row).
- **Listener callback throws:** wrapped in try/catch; logged; state not corrupted. `loading` still flips to `false`.
- **Listener never fires at all:** the safety timer flips `loading` to `false` so the UI renders as guest. Tokens stay intact; the listener stays subscribed; a later-arriving event will upgrade the UI to signed-in. This is a soft failure with no destructive consequence.

## 6. Testing

Manual browser test plan after implementation:

1. **Hard-reload `/admin` while signed in** → admin UI renders within ~200 ms, no infinite spinner.
2. **Hard-reload `/` while signed out** → home renders, `Recent bayans` fetches complete.
3. **Hard-reload `/admin` signed in, DevTools "Offline" toggled** → admin shell still renders (session comes from storage); individual API calls inside admin show their own error states, not a loader lock.
4. **Sign out via UI** → session becomes `null`, redirect to `/login` works.
5. **Fresh sign in** → `SIGNED_IN` event fires → state updates → post-login redirect works.
6. **Leave tab idle > 1 hour** → Supabase auto-refreshes the token (`autoRefreshToken: true`); a subsequent interaction still has a valid session.

No new unit tests — `AuthProvider.tsx` has no existing test harness and adding one for a small provider is disproportionate to the change.

## 7. Risk assessment

| Risk | Mitigation |
|---|---|
| `INITIAL_SESSION` behaviour differs across `@supabase/supabase-js` minor versions | Pinned at `^2.102.1`; listener-delivered initial session is stable since v2.0. If a future upgrade changes this, safety timer ensures we do not block bootstrap. |
| Race where listener fires AFTER safety timer | Benign: `loading` is already `false`, listener still updates session/user state. The UI transitions from guest to signed-in visibly. |
| Profile fetch takes longer than 2 s | UI becomes interactive first (via safety timer), then `user` populates later. Acceptable degradation over the current "admin stuck on spinner" behaviour. |
| Existing consumers depend on `loading` being `true` until `user` is populated | Reviewed: nothing in the codebase blocks on `user` alone — all gating is on `session` + `loading`. Not a regression. |

## 8. Deferred

- **Mixed-content config fetch.** `http://165.22.208.103/api/config.json` will break if the app ever runs behind HTTPS. Tracked separately.
- **Player `media_url` data cleanup.** The Jummah Bayan row has a YouTube page URL in `media_url` and `thumbnail_url`. Admin deletes and re-uploads through the new mirror pipeline.
- **`expo-av` deprecation.** Migration to `expo-audio` / `expo-video` for SDK 54 — separate ticket.
