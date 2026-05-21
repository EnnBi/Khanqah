# Android User App — Full Sweep Design

**Date:** 2026-05-21  
**App:** `android/` — `com.khanqah.app`  
**API base:** `https://arrashid.ennbi.com/api/`

---

## Scope

Six areas: theme + branding, login/register, library + categories, progress tracking, profile screen, navigation.

No backend changes required — all endpoints already exist.

---

## 1. Theme & Branding

### Colors

Match web CSS variables exactly:

| Token | Light | Dark |
|-------|-------|------|
| Background | `#F7F5F0` | `#0A1F18` |
| Surface/Card | `#FFFFFF` | `#112820` |
| Primary (fg) | `#0F2E24` | `#E8DFC8` |
| Muted | `#4A5F58` | `#8FA89E` |
| Accent/Button | `#0F2E24` | `#E8DFC8` |
| Gold | `#D4A853` | `#D4A853` |
| Gold light | `#F5E9C8` | `#2A2010` |
| Border | `rgba(15,46,36,0.1)` | `rgba(255,255,255,0.08)` |

Replace current Material3 color scheme in `ui/theme/Color.kt` and `Theme.kt`.

### Logo

- Copy `assets/images/khanqah-logo.png` → `android/app/src/main/res/drawable/khanqah_logo.png`
- Used on: LoginScreen (above card), ProfileScreen (header), SplashScreen (if added)

### Nastaleeq Font

- Copy `assets/fonts/JameelNooriNastaleeq.ttf` → `android/app/src/main/assets/fonts/`
- Load via `androidx.compose.ui.text.font.Font` with `AssetManager`
- Create a `nastaleeqFontFamily` in `Typography.kt`
- Apply to all Urdu text: app name subtitle, category Urdu names

### App Name Display

Wherever the app name appears (Login, Profile):
```
[logo image]
Khanqah Maseeh-ul-Ummah        ← Cormorant/serif or default
خانقاہ مسیح الامۃ               ← Nastaleeq, rtl, gold-muted color
```

---

## 2. Login / Register

### Current State
Two-step: phone → OTP. No name field. No register/sign-in distinction.

### Change
Add a `SegmentedControl` (two tabs) at the top of the login card:

- **Sign In** tab: phone input → Send OTP → OTP input → Verify
- **Register** tab: name input (required) + phone input → Send OTP → OTP input → Verify

When on **Register** tab:
- `name` field is mandatory — Send OTP button disabled until both name and phone are filled
- `name` is passed in the `VerifyOTP` request body (`{ phone, otp, name }`)
- Backend creates user with that display name on first login

When on **Sign In** tab:
- No name field shown
- Behaviour unchanged

### DataStore
Add `display_name: String` to `TokenManager` / `UserPreferences` DataStore. Populated from `VerifyOTP` response field `display_name`.

### OTP Screen
No name shown on OTP step — clean, just the 6-digit input + phone confirmation + "Use a different number" back link. Same for both tabs.

---

## 3. Library Screen + Category Detail

### Library Screen (currently stubbed)

Replace placeholder with a vertical list of category cards.

**Card layout:**
```
┌─────────────────────────────────┐
│  [icon or colour swatch]        │
│  Bayan                  [12] →  │
│  بیان  (Nastaleeq)              │
└─────────────────────────────────┘
```

- Fetch `GET /categories` on load
- Show all categories sorted by `sort_order`
- Content count badge: fetch `GET /content` once and count per `category_id` client-side (avoids a new API)
- Tap → `CategoryDetailScreen`

### CategoryDetailScreen (new)

Route: `category/{categoryId}/{categoryNameEn}`

- Fetch `GET /content` filtered by `category_id` query param (check if backend supports; if not, filter client-side from full list)
- List of content rows identical to HomeScreen rows: title, duration, date, gold progress bar (if progress > 0)
- Tap → `PlayerScreen/{contentId}`
- Top bar: category English name + Urdu name in Nastaleeq

**Backend:** `GET /content?category_id={id}` — check if supported; if not, fetch all and filter in ViewModel.

---

## 4. Progress Tracking

### On Player Open
1. Fetch `GET /me/progress/{contentId}` (authenticated)
2. If response has `position_seconds > 0` and `completed == false` → seek ExoPlayer to that position
3. If `completed == true` → play from beginning (re-listen)

### While Playing
- Every 10 seconds, call `PUT /me/progress/{contentId}` with `{ position_seconds: currentPosition, completed: false }`
- On playback completion (player reaches end): call with `{ position_seconds: duration, completed: true }`

### Progress Bar in Content Rows
- Store progress map in `ContentRepository` (in-memory cache from `/me/progress` response)
- Each content row shows a thin gold bar at the bottom: width = `position / duration`
- Fully completed items show a full gold bar (or a checkmark overlay)

### Error Handling
- Progress save failures are silent (fire-and-forget) — never interrupt playback
- Progress load failure → play from beginning

---

## 5. Profile Screen

Replace current minimal profile with:

```
┌──────────────────────────────┐
│   [logo image, centered]     │
│   Display Name               │
│   خانقاہ مسیح الامۃ (small) │
│   +91 98765 43210            │
│   [Listener] badge (gold)    │
│                              │
│   [Logout button]            │
└──────────────────────────────┘
```

- `display_name` and `phone` from DataStore
- Role badge: gold pill with role string
- Logout clears DataStore, navigates to Login

---

## 6. Navigation

Add to `NavGraph`:
- `"category/{categoryId}/{categoryNameEn}"` → `CategoryDetailScreen`

Existing routes unchanged:
- `login`, `home`, `library`, `schedule`, `live`, `player/{contentId}`, `profile`

Bottom nav: unchanged (Home, Library, Schedule, Live, Profile).

---

## Implementation Order

1. Theme + colors (`Color.kt`, `Theme.kt`)
2. Branding assets (logo drawable, Nastaleeq font)
3. Login/Register redesign (`LoginScreen.kt`, `AuthViewModel.kt`, `TokenManager.kt`)
4. Library screen (`LibraryScreen.kt`, `LibraryViewModel.kt`)
5. CategoryDetail screen (`CategoryDetailScreen.kt`, `CategoryDetailViewModel.kt`)
6. Progress tracking (`PlayerViewModel.kt`, `ProgressRepository.kt`)
7. Profile screen (`ProfileScreen.kt`)
8. Nav graph update (`NavGraph.kt`)

---

## Files to Create
- `ui/screens/CategoryDetailScreen.kt`
- `ui/viewmodels/CategoryDetailViewModel.kt`
- `ui/viewmodels/LibraryViewModel.kt`

## Files to Modify
- `ui/theme/Color.kt`
- `ui/theme/Theme.kt`
- `ui/theme/Typography.kt`
- `ui/screens/LoginScreen.kt`
- `ui/screens/LibraryScreen.kt`
- `ui/screens/ProfileScreen.kt`
- `ui/screens/PlayerScreen.kt`
- `ui/viewmodels/AuthViewModel.kt`
- `ui/viewmodels/PlayerViewModel.kt`
- `data/local/TokenManager.kt` (or equivalent DataStore)
- `ui/navigation/NavGraph.kt`
