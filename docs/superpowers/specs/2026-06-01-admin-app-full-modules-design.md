# Admin App — Full Modules Design

**Date:** 2026-06-01  
**Branch:** `feature/admin-app-modules` (off `main`)  
**Scope:** Add full admin panel functionality to `android-admin/` — content, schedule, team, categories, bugs — with a bottom tab nav and dashboard home screen.

---

## Overview

The admin app currently only has two reachable screens: Login and Live. All other screens (ContentList, Upload, Schedule, Team, Bugs) exist as Kotlin files but are unwired. This work wires them all into a proper bottom tab navigation, upgrades each screen to full CRUD parity with the web admin panel, and adds two new screens (HomeScreen dashboard, MoreScreen hub, CategoryScreen).

---

## Navigation Architecture

**Pattern:** Flat routes in a single `AdminNavGraph`, `Scaffold` with `BottomNavBar` shown only on the 4 tab-level routes, hidden on sub-screens.

**4 tabs:**
| Tab | Route | Icon |
|-----|-------|------|
| Live | `home` | broadcast icon |
| Content | `content` | list icon |
| Schedule | `schedule` | calendar icon |
| More | `more` | dots/menu icon |

**Sub-routes (bottom nav hidden):**
- `upload` — file pick + metadata form + upload progress
- `team` — team management
- `categories` — category CRUD
- `bugs` — bug reports list

**Login flow:** `login` → `home` (replaces back stack, same as now)  
**Auth expiry:** redirect to `login` from any screen (existing pattern preserved)

---

## HomeScreen (Dashboard)

**Route:** `home`  
**Data sources:** `liveViewModel` (existing, on `AdminApp`) + a new `HomeViewModel` that makes its own lightweight API calls for dashboard stats on init.

**Layout:**
1. **Live card** — full width, gold border when on-air. Shows: status dot, "ON AIR" / "NOT LIVE" label, session title (when live), listener count, elapsed timer (when live), Start / Stop button. This replaces the current `LiveScreen` as the primary broadcast UI.
2. **Stats row** — 2 tiles side by side:
   - *Content* — count of items from `contentViewModel.items`
   - *Next session* — title + formatted time of nearest upcoming `ScheduledSession` from `scheduleViewModel.sessions` (null-safe, shows "None scheduled" if empty)
3. **Bug alert** — only visible when `bugsViewModel.bugs` has items with `status == "open"`. Tappable, navigates to `bugs`.

**Note:** `LiveScreen.kt` is retired — its broadcast logic moves into `HomeScreen`. `LiveViewModel` is unchanged.

---

## ContentScreen

**Route:** `content`  
**Behaviour:** Unified list + edit + upload entry point.

- Top bar has **"Upload"** button (text button, top-right) → navigates to `upload` route
- List of content cards. Each card shows: title (EN), category name, type badge, date
- **Tap a card** → expands inline (same card, no new screen) to show edit form:
  - Title EN / Title UR text fields
  - Category dropdown
  - "View file" link (media_url)
  - Save / Delete / Cancel buttons
- Only one card expanded at a time; tapping another collapses the current

**UploadScreen** (route: `upload`):
- Back arrow in top bar (returns to `content`)
- File picker area (tap to open system file picker, `*/*`)
- Title EN, Title UR fields
- Category dropdown
- Type auto-detected from MIME (video → `isVideo = true`), user can override via type dropdown
- Upload progress bar
- No change to `UploadViewModel` logic

---

## ScheduleScreen

**Route:** `schedule`  
**Behaviour:** Full CRUD — create, edit, delete.

- List of sessions; each shows title, formatted date/time, recurrence label (Once / Daily / Weekly / Monthly)
- **FAB** → reveals an inline create form at the top of the list (same pattern as Categories)
- **Tap a session** → expands inline to edit, same pattern as ContentScreen
- **Form fields:** Title EN, Title UR, Date (DatePickerDialog), Time (TimePickerDialog), Frequency dropdown (Once / Daily / Weekly / Monthly)
- Frequency maps to `recurrence_rule`: Once → null, Daily → `FREQ=DAILY`, Weekly → `FREQ=WEEKLY`, Monthly → `FREQ=MONTHLY`

**API addition needed in `AdminApiService`:**
```kotlin
@PUT("admin/schedule/{id}")
suspend fun updateSession(@Path("id") id: String, @Body body: Map<String, Any?>): ScheduledSession
```

**`ScheduleRepository`** gets a corresponding `updateSession(id, ...)` method.  
**`ScheduleViewModel`** gets an `update(id, ...)` method.

---

## MoreScreen

**Route:** `more`  
**Layout:** Simple screen with 3 navigation cards — Team, Categories, Bug Reports. Each card has a title, short description, and chevron. Tap → navigate to respective sub-route.

---

## TeamScreen

**Route:** `team` (sub-screen, bottom nav hidden)  
**Upgrades over current:** Add delete user + name edit.

- Each user card: display name (or phone), phone number, role dropdown (existing)
- Add **Delete** button (with confirmation dialog before calling `DELETE /admin/team/{id}`)
- Add **Edit name** — inline tap on the name opens a single-field edit dialog

**API addition needed in `AdminApiService`:**
```kotlin
@PUT("admin/team/{id}/name")
suspend fun updateUserName(@Path("id") id: String, @Body body: Map<String, String>): User
```

**`TeamRepository`** gets `updateName(id, name)` and `deleteUser(id)` methods.  
**`TeamViewModel`** gets corresponding methods.

---

## CategoryScreen (new)

**Route:** `categories` (sub-screen, bottom nav hidden)  
**New files:** `CategoryScreen.kt`, `CategoryViewModel.kt`

- Create form at top: Name EN + Name UR fields + Create button
- List of categories below
- Each category: name EN, name UR, "system" badge if `slug != null`
- **Rename** — tap name or rename button → inline edit fields for both names + Save/Cancel
- **Delete** — only shown for non-system categories (no slug). Confirmation dialog before delete.

Uses existing `AdminApiService` category endpoints (all already defined).

**`AdminApp`** gets `val categoryViewModel: CategoryViewModel` added.

---

## BugsScreen

**Route:** `bugs` (sub-screen, bottom nav hidden)  
**Change:** Wire into nav via More → Bugs. No functional change to the screen itself.

---

## Files Changed / Created

| File | Change |
|------|--------|
| `AdminNavGraph.kt` | Full rewrite — all routes, BottomNavBar, Scaffold |
| `AdminApp.kt` | Add `CategoryViewModel` |
| `ui/home/HomeScreen.kt` | **New** — dashboard |
| `ui/home/HomeViewModel.kt` | **New** — loads content count, next session, open bug count |
| `ui/more/MoreScreen.kt` | **New** — navigation hub |
| `ui/content/ContentListScreen.kt` | Add inline edit expand |
| `ui/schedule/ScheduleScreen.kt` | Add edit, DatePickerDialog, TimePickerDialog |
| `ui/team/TeamScreen.kt` | Add delete + name edit |
| `ui/categories/CategoryScreen.kt` | **New** |
| `ui/categories/CategoryViewModel.kt` | **New** |
| `data/api/AdminApiService.kt` | Add `updateSession`, `updateUserName` |
| `data/repository/ScheduleRepository.kt` | Add `updateSession` |
| `data/repository/TeamRepository.kt` | Add `deleteUser`, `updateName` |
| `data/repository/CategoryRepository.kt` | Already exists — no change needed |

---

## Out of Scope

- Settings / push notification toggles (web-only for now)
- Offline support / caching
- Pagination on content list (load all, same as web)
- Dark/light theme toggle
- Image/thumbnail upload

---

## Branch Strategy

All work on branch `feature/admin-app-modules`. No changes to `backend/`, `web/`, or `android/`. Single PR to `main` when complete.
