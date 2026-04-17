# Auth Bootstrap Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stop the auth bootstrap from destroying valid Supabase sessions — replace the `getSession()`+`signOut()` race in `AuthProvider` with an `onAuthStateChange` listener plus a UI-only safety timer.

**Architecture:** Subscribe to `onAuthStateChange` on mount; Supabase delivers `INITIAL_SESSION` on the next microtask with the cached session (or null) without going through the `navigator.locks` path that hangs. A 2-second safety timer flips `loading = false` if the listener has not fired yet, so the UI never spins forever. No code path calls `signOut()` during bootstrap.

**Tech Stack:** React 18 · Expo Router (web) · `@supabase/supabase-js` ^2.102.1 · React Native Web.

**Spec:** `docs/superpowers/specs/2026-04-18-auth-bootstrap-fix-design.md`

---

## File Structure

Only `providers/AuthProvider.tsx` changes. The file is ~190 lines and has one clear responsibility (wire Supabase auth into React context). The edit is scoped to the single `useEffect(() => { ... }, [])` hook that does the initial session bootstrap — everything else in the file (auth action helpers, `isAdmin`/`isEditor` derivations, context value wiring, the `useAuth` hook) is untouched.

No new files, no new exports, no new tests (the provider has no existing test harness; adding one for a small provider fix is disproportionate and not in scope).

---

## Task 1: Rewrite the bootstrap `useEffect`

**Files:**
- Modify: `providers/AuthProvider.tsx` — replace the contents of the single `useEffect(() => { ... }, [])` block (currently lines 55–119) with the listener-only implementation below.

- [ ] **Step 1: Inspect the current effect**

Run:
```bash
grep -n "useEffect\|bootstrapSession\|onAuthStateChange\|getSession\|signOut" providers/AuthProvider.tsx
```

Expected: lines showing the current structure — one `useEffect` starting around line 55, a nested `bootstrapSession` async function, the `Promise.race` against a timeout, and a second `onAuthStateChange` subscription inside the same effect. This is the block you will replace.

- [ ] **Step 2: Replace the effect body**

Open `providers/AuthProvider.tsx`. Replace the entire `useEffect(() => { ... }, []);` block (the one that contains `bootstrapSession`, the `Promise.race` with the 3-second timeout, the `supabase.auth.signOut()` recovery, and the `onAuthStateChange` subscription) with this exact block:

```tsx
  useEffect(() => {
    let cancelled = false;

    // Safety timer: if the auth listener hasn't fired within 2 s we flip
    // loading off so the UI becomes interactive as a guest. We never touch
    // the Supabase client or stored tokens from here — if a session shows
    // up later, onAuthStateChange updates state and the UI upgrades.
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
  }, []);
```

Leave every other part of the file alone: imports, interface, state declarations, `fetchUserProfile` helper, `signInWithEmail` / `signUpWithEmail` / `signInWithPhone` / `verifyOtp` / `signInWithGoogle` / `signOut` action helpers, `isAdmin` / `isEditor` derivations, the `AuthContext.Provider` JSX, the `useAuth` hook export.

- [ ] **Step 3: Type-check**

Run:
```bash
npx tsc --noEmit
```

Expected: no output (clean). The replacement uses the same `setSession`, `setUser`, `setLoading`, `fetchUserProfile`, and `supabase.auth.onAuthStateChange` references that were already in scope — no new imports needed.

- [ ] **Step 4: Commit**

```bash
git add providers/AuthProvider.tsx
git commit -m "fix(auth): replace destructive getSession bootstrap with listener + safety timer"
```

---

## Task 2: Manual verification in the browser

**Files:** none. This task validates Task 1 in a running app.

- [ ] **Step 1: Start the dev server**

Run:
```bash
npx expo start --web --clear
```

Wait for `Web is waiting on <url>`.

- [ ] **Step 2: Clear the stale remote-config cache (session clean-slate)**

In the browser DevTools console on the dev URL, paste:
```js
localStorage.removeItem('app_remote_config_v2'); location.reload();
```

Expected: the page reloads and re-fetches the config.

- [ ] **Step 3: Cold reload on `/admin` while signed in**

Pre-condition: you are signed in as an admin (if not, sign in first via `/login` then come back).

Action: hit `/admin` in the browser, hard-reload (Cmd+Shift+R).

Expected: admin UI renders in well under 2 s, no infinite spinner. Console shows no `[auth] getSession` warnings and no `Running application main` log appearing twice.

- [ ] **Step 4: Cold reload on `/` while signed out**

Action: open an incognito window, navigate to the dev URL.

Expected: home page renders; `Recent bayans` section populates within a second or two; no 5-second-long pre-content spinner.

- [ ] **Step 5: Sign-out / sign-in round-trip**

Action: from the signed-in admin window, sign out via the UI. Then sign back in.

Expected:
- Sign-out: session clears, UI redirects to the login screen.
- Sign-in: after submitting credentials, admin UI loads within ~500 ms. No double-bootstrap.

- [ ] **Step 6: Token-refresh smoke test (optional)**

If you can leave the tab idle > 1 hour, come back and confirm an authenticated API call (e.g. loading admin-only content in `manage-content`) still succeeds without forcing re-login. This exercises Supabase's `autoRefreshToken` path alongside the new listener.

- [ ] **Step 7: No code changes expected**

If any step above fails, go back to Task 1 and inspect — do not paper over symptoms with new timeouts or re-introduce `getSession()` / `signOut()` fallbacks.

---

## Spec coverage checklist

| Spec §                                            | Task(s) |
|---------------------------------------------------|---------|
| §3 Architecture (listener + safety timer)         | 1       |
| §4 What gets removed / kept / new                 | 1       |
| §4 Sketch → final `useEffect` body                | 1       |
| §5 Error handling (profile fetch, listener throw) | 1       |
| §6 Testing — manual browser checklist             | 2       |
| §7 Risks / mitigations                            | 1 (safety timer covers all listed risks) |
