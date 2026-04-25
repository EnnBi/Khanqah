# Complete Urdu RTL — Design

**Date:** 2026-04-25
**Status:** Draft, awaiting approval

## Goal

Make Urdu a first-class language: every user-facing screen reads right-to-left, every UI string is translated, and the language preference persists across launches and devices. Admin/internal surfaces remain in English (fall-through), since admins do not need translations.

## Constraints

- Reuse existing infra: i18next + `lib/strings/{en,ur}.ts`, `useI18n()` hook, `BilingualText`, Nastaleeq font.
- Native and web must both work.
- Language toggle must trigger an app restart (acceptable UX) so `I18nManager.forceRTL` takes effect.
- Admin screens (`/admin/*`) keep English text via i18next `fallbackLng`. Layout still flips.

## Non-goals

- Pixel-perfect Urdu typography for admin tools.
- Translation of debug-only screens (manage-content, etc.).
- Right-to-left chart/graph rendering (no charts in scope).
- Auto-switch language based on system locale (manual toggle only).
- Translation of dynamic content rows from the DB (`title_en`/`title_ur` already covered by `pickCredit`).

## Architecture

```
        ┌─────────────────────────────┐
        │ App launch (rtl-bootstrap)  │
        │   1. Read storedLang from   │
        │      AsyncStorage           │
        │   2. const isRTL =          │
        │      storedLang === 'ur'    │
        │   3. If I18nManager.isRTL   │
        │      != isRTL → forceRTL +  │
        │      Updates.reloadAsync()  │
        │   4. Otherwise, render app  │
        └─────────────┬───────────────┘
                      │
                      ▼
        ┌─────────────────────────────┐
        │ I18nProvider                │
        │   i18next.init({            │
        │     lng: storedLang,        │
        │     fallbackLng: 'en'       │
        │   })                        │
        └─────────────┬───────────────┘
                      │
                      ▼
                  ... app UI ...
                      │
        User taps Profile → Toggle
                      │
                      ▼
        ┌─────────────────────────────┐
        │ useLanguageToggle:          │
        │  1. AsyncStorage save       │
        │  2. supabase.users.update   │
        │     (if signed in)          │
        │  3. Confirm "Restart" alert │
        │  4. forceRTL + reloadAsync  │
        └─────────────────────────────┘
```

The boot-time check is the load-bearing piece: every launch reapplies the correct RTL state from persisted preferences. If a user changed language and the app died before restart, the next launch silently fixes it.

## File map

### New

| File | Purpose |
|---|---|
| `lib/language-pref.ts` | `loadStoredLanguage()` and `saveStoredLanguage(lang)` over AsyncStorage key `app.languagePref`. Returns `'en'` if unset. |
| `lib/rtl-bootstrap.ts` | Pure side-effect helper. Called from `app/_layout.tsx` before any React render. Reads stored lang; if mismatched with `I18nManager.isRTL`, calls `forceRTL(isUrdu)` then `Updates.reloadAsync()`. Idempotent. |
| `hooks/useLanguageToggle.ts` | Returns `(nextLang) => Promise<void>`: persists to AsyncStorage + Supabase `users.language_pref` (best-effort if signed in) + shows native `Alert.alert` confirm + reloads on confirm. |
| `__tests__/lib/language-pref.test.ts` | Round-trip save/load via mocked AsyncStorage. |
| `__tests__/lib/rtl-bootstrap.test.ts` | Three branches: no-op when matched, no-op when no stored lang, reload when mismatched. |

### Modified

| File | Change |
|---|---|
| `app/_layout.tsx` | Call `rtlBootstrap()` at module top, before `loadConfig()`. Switch the existing language switch button on profile to use `useLanguageToggle`. |
| `providers/I18nProvider.tsx` | Boot i18next with stored language; expose `isRTL` (derived from `language === 'ur'`); add `fallbackLng: 'en'`. |
| `app/(tabs)/profile.tsx` | Replace direct `setLanguage` call with `useLanguageToggle`. |
| `lib/strings/en.ts` + `lib/strings/ur.ts` | Add the new translation keys (see "Translation keys" section). |
| `components/CustomTabBar.tsx` | Replace hardcoded `LABELS` with `t('tabs.*')`. |
| `app/(tabs)/index.tsx` | Replace hardcoded QuickActionTile labels and rail headings with `t()`. |
| `app/player/[id].tsx` | Replace `SAVE` / `SHARE` / `QUEUE` / `SPEED` labels and any other hardcoded strings with `t('player.*')`. |
| `app/(auth)/login.tsx` | Replace hardcoded button/title strings with `t('auth.*')`. |
| `components/BilingualText.tsx` | Drop the `textAlign: 'right'` and `writingDirection: 'rtl'` from `urduTextStyle`; keep only the font swap. (Layout RTL is now global.) |
| `app/library/[categoryId].tsx`, `app/admin/go-live.tsx` | Same simplification — drop inline RTL styles, keep Nastaleeq font. |
| Anywhere `›` / `‹` is rendered inside `<Text>` for navigation arrows | Replace with `<Ionicons name="chevron-forward" />` (or `chevron-back`); these auto-mirror under RTL. |
| Timestamp `<Text>` like `0:42 / 12:00` in player | Add `writingDirection: 'ltr'` so digits read in natural order. |

### Untouched

- `/admin/*` screen text. i18next `fallbackLng: 'en'` keeps them readable.
- DB schema (`users.language_pref` already exists).
- Native plugins/manifest. `I18nManager` is built-in.

## Translation keys

Approximately 40 new keys. Authoritative list (English values shown — Urdu translations supplied at implementation time, default fall-through to English so missing UR keys don't break the UI):

```ts
// tabs
'tabs.home'                    → 'Home'
'tabs.bayanaat'                → 'Bayanaat'
'tabs.clips'                   → 'Clips'
'tabs.ashaar'                  → 'Ashaar'
'tabs.books'                   → 'Books'

// home
'home.quickActions.mamulat'         → 'Mamulat'
'home.quickActions.liveSessions'    → 'Live Sessions'
'home.quickActions.salahTimings'    → 'Salah Timings'
'home.quickActions.majlisTimings'   → 'Majlis Timings'
'home.quickActions.exploreCategories' → 'Explore Categories'
'home.quickActions.askHazrat'       → 'Ask Hazrat'
'home.recents'                      → 'Recents'
'home.noContent'                    → 'No content yet.'

// player
'player.save'                  → 'SAVE'
'player.saved'                 → 'SAVED'
'player.share'                 → 'SHARE'
'player.queue'                 → 'QUEUE'
'player.speed'                 → 'SPEED'
'player.loading'               → 'Loading…'
'player.downloading'           → 'Downloading…'
'player.shareUnavailable'      → 'Sharing unavailable on this device.'
'player.downloadFailed'        → 'Download failed'
'player.shareFailed'           → 'Share failed'

// profile
'profile.title'                → 'Profile'
'profile.signedInAs'           → 'Signed in as {{name}}'
'profile.signOut'              → 'Sign out'
'profile.language.label'       → 'Language'
'profile.language.restart'     → 'Restart needed to apply'

// auth
'auth.signInTitle'             → 'Sign in'
'auth.signInSubtitle'          → 'to access live sessions'
'auth.googleButton'            → 'Continue with Google'
'auth.continueAsGuest'         → 'Continue as guest'

// errors
'errors.network'               → 'Network error. Please try again.'
'errors.permissionMic'         → 'Microphone access denied. Open settings to allow.'
'errors.permissionMicAction'   → 'Open Settings'
'empty.library'                → 'No items here yet.'
'empty.recents'                → 'Your listening history is empty.'

// confirms
'confirm.languageRestart.title'   → 'Switch language?'
'confirm.languageRestart.body'    → 'The app needs to restart to apply.'
'confirm.languageRestart.ok'      → 'Restart'
'confirm.cancel'                  → 'Cancel'
```

Implementation translates these into Urdu in `ur.ts`. If any key is missing in `ur.ts`, i18next falls back to `en.ts` automatically.

## State machine — language toggle

```
    [profile screen]
         │
         │ user taps Urdu / English toggle
         ▼
    [useLanguageToggle.set('ur')]
         │
         ├── AsyncStorage.setItem('app.languagePref', 'ur')
         ├── supabase.users.update({language_pref: 'ur'}) [fire-and-forget; no failure surfaces]
         │
         ▼
    Alert.alert('Switch language?', 'App will restart…')
         │
         ├── Cancel → return (preferences saved but no restart)
         └── OK → continue
                  │
                  ▼
              I18nManager.forceRTL(true)
                  │
                  ▼
              Updates.reloadAsync()
                  │
                  ▼
            (app reboots, rtl-bootstrap re-confirms state)
```

If user cancels the alert, AsyncStorage is already updated. Next launch will rtl-bootstrap into Urdu automatically.

## RTL gotchas (manual fixes that `forceRTL` doesn't cover)

| Gotcha | Fix |
|---|---|
| `›` / `‹` Unicode glyphs in nav arrows | Replace with `<Ionicons name="chevron-forward"/>`; auto-mirrors. |
| Decorative arrow images | Apply `transform:[{scaleX: I18nManager.isRTL ? -1 : 1}]`. None in current code; flag during impl if added. |
| Timestamp text (`0:42 / 12:00`) | Inline `writingDirection:'ltr'` to keep digits in natural reading order. |
| Animation `translateX` constants | Multiply by `I18nManager.isRTL ? -1 : 1` at call sites. Audit during impl. |

## Web behavior

`I18nManager.forceRTL` on web sets `<html dir>` and emits CSS `direction: rtl` on the root. Layout flip works identically to native because RN-web honors `flex-direction` reversal under `rtl`.

Reload mechanism is explicit per-platform:

```ts
if (Platform.OS === 'web') {
  window.location.reload();
} else {
  Updates.reloadAsync();
}
```

`expo-updates` must be installed (`npm install expo-updates`) — it is not currently a dependency. The implementation plan adds it as a prerequisite step.

## Persistence + DB sync

- **Source of truth:** AsyncStorage (`app.languagePref`).
- **DB sync:** Best-effort `users.language_pref` update on toggle. If it fails, no UX consequence; AsyncStorage is authoritative on this device.
- **Cross-device:** Out of scope for v1. Each device toggles independently. Future: on app launch, after sign-in, optionally diff `users.language_pref` against AsyncStorage and prompt user.

## Testing

### Unit (Jest)

- `__tests__/lib/language-pref.test.ts` — `saveStoredLanguage('ur')` then `loadStoredLanguage()` returns `'ur'`. Empty store returns `'en'`.
- `__tests__/lib/rtl-bootstrap.test.ts` — mocks `I18nManager`, `Updates`, AsyncStorage. Three cases: matched (no calls), unmatched (`forceRTL` + `reloadAsync` called), no stored value (no calls).
- `__tests__/hooks/useLanguageToggle.test.ts` — mocks all three external dependencies; verifies AsyncStorage + Supabase write happen, alert is shown, reload fires only on confirm.

### Manual device matrix

| Device / surface | Case | Expected |
|---|---|---|
| Android (cdb4...) | Fresh install | LTR layout, English strings |
| | Toggle Urdu → confirm → restart | Layout flipped, Urdu strings, chevrons mirrored |
| | Kill + relaunch | Stays in Urdu |
| | Toggle back to English | LTR + English after restart |
| | Open content with Urdu title + English credit | Title right-aligned + Nastaleeq, credit readable in English |
| | Player action row | SAVE/SHARE/QUEUE/SPEED in Urdu |
| | Admin go-live screen | English text on flipped layout |
| Web (Chrome) | Toggle Urdu | `<html dir="rtl">` set, layout flips, page reloads |

## Rollout

1. Implement language-pref + rtl-bootstrap + useLanguageToggle, ship a build.
2. Translation sweep + chevron replacement in one PR per surface (5 PRs: tabs, home, player, profile, auth+errors).
3. Drop the inline RTL styling from `BilingualText` etc. once `forceRTL` is in place.
4. After all surfaces are done, manual device-matrix run and tick boxes.

## Open questions

None at draft time.
