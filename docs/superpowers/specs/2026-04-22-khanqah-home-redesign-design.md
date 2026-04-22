# Khanqah Home Redesign + Navigation Rework

**Date:** 2026-04-22
**Status:** Approved for implementation

## Goal

Rebrand the app from "Ar-Rashid" to "Khanqah", swap the logo to the
supplied calligraphy (recoloured gold), and rebuild the home page around
a scrollable banner + live card + 6-tile quick-action grid + latest-bayanaat
rail, sitting on a floating 5-tab pill bar (Home · Bayanaat · Clips ·
Ashaar · Books). Profile moves off the bottom bar onto a top-right icon;
admins get an extra shield icon beside it.

## Non-goals

- No theme changes — Calm Architecture tokens (light + dark) stay exact.
- Real Salah Timings / Ask Hazrat features — the tiles open a generic
  "Coming soon" screen until separate specs land.
- No change to player, library, book viewer, admin, or auth flows beyond
  the nav entry-points listed below.

## Brand

- `app.json` → `expo.name`: **"Khanqah"**.
- New logo file at `assets/images/khanqah-logo.png` (already committed):
  gold calligraphy of "خانقاہ مسیح الامت" on transparent background.
- System icon assets (`icon.png`, `adaptive-icon.png`, `splash-icon.png`)
  replaced with the Khanqah calligraphy. `favicon.png` downscaled.
- Login page: swap the existing logo `Image` source to the new Khanqah
  calligraphy (same slot, same size). Subtitle text "SEEKING NEARNESS
  THROUGH SOUND" stays.

## Navigation

- Keep the `app/(tabs)/` route group. Tab screens:
  - `index.tsx` — Home (rewritten).
  - `bayanaat.tsx` — filtered content list (`type = 'bayan'`). New.
  - `clips.tsx` — filtered content list (`type = 'clip'`). New.
  - `ashaar.tsx` — filtered content list (`type IN ('nazam','hamd_naat')`). New.
  - `books.tsx` — filtered content list (`type = 'book'`). New.
- Removed from `(tabs)`:
  - `library.tsx` → moved to flat `app/library.tsx` (accessed via home tile
    "Explore Categories").
  - `collection.tsx` → removed from bottom bar; feature re-surfaces on the
    profile page as a "Saved" row (no code deletion — the route file stays
    as-is but isn't wired to the tab bar).
  - `profile.tsx` → moved to flat `app/profile.tsx`, accessed via the
    top-right icon on the home.
- **Floating pill tab bar** (`components/CustomTabBar.tsx`, rewritten):
  - Rendered absolutely at bottom-center, 24px above the home indicator.
  - Dark forest-green pill (`c.primary`), 5 slots, active tab in gold
    (`c.accent`), inactive in cream-translucent.
  - Same visual in light + dark themes.
  - Uses the existing stroke icon family (see component spec below).

## Home page (`app/(tabs)/index.tsx`)

Scroll container with the following blocks, top to bottom:

### Top bar
Three-column grid (language toggle / empty / icons):
- **Left**: globe icon + `اردو` / `English` text (the "other" language). Tap
  calls `setLanguage` from `useI18n()`.
- **Right** (stacked horizontally, 8px gap):
  - Shield icon (only visible when `isAdmin || isEditor`) → `router.push('/admin')`.
  - Profile icon with a small gold dot → `router.push('/profile')`.

### Banner
Forest-green rounded panel (16px radius) with two soft gold-tinted
concentric circles bleeding off the top-right corner. Inside, centered:
- `<Image source={require('../../assets/images/khanqah-logo.png')}/>`, 120×170,
  `resizeMode: "contain"`.
- Italic serif subtitle "Khanqah Maseeh-ul-Ummah" flanked by 18px
  hairline rules fading to transparent and two small `◆` ornaments in
  gold. Single line; `numberOfLines={1}` + small letterSpacing.

### Live card
One tappable card. State-driven:
- If `useLiveSession()` returns a live session → kicker "ON AIR", title =
  session title, subtitle = "Tap to join". Red pulsing dot. Tap → `/player/live`.
- Else if `useNextScheduledSession()` returns a session → kicker "OFF AIR
  · NEXT MAJLIS", title = session title, subtitle relative time
  ("Starting soon", "in 45 min", "today at 4:30 PM", "tomorrow at 6 AM").
  Dot in textMuted. Inert for non-admins; admins tap → `/admin/schedule`.
- Else → kicker "OFF AIR", title "No sessions scheduled", subtitle empty.
  Inert.

Left-side icon: calendar glyph inside a `surface2` squircle.

### Quick-action grid (2×3, 10px gap)
All tiles share a layout: 38×38 rounded-square icon holder on top, 11px
caption below, cream surface background, subtle border. The **Mamulat**
tile uses the accent-tinted icon holder; the rest use the default
`surface2` holder.

| Slot | Label | Icon | Route |
|------|-------|------|-------|
| 1 | Mamulat | 8-pointed star | `/library/<mamulat-category-id>` (resolved at runtime via the same `categories` lookup as today) |
| 2 | Live Sessions | Radio-wave circle | `/player/live` if live, else `/library/<live-sessions-category-id>` |
| 3 | Salah Timings | Clock | `/coming-soon?feature=salah` |
| 4 | Majlis Timings | Group silhouettes | `/admin/schedule` for admins/editors, `/schedule` otherwise |
| 5 | Explore Categories | 2×2 grid | `/library` |
| 6 | Ask Hazrat | Speech bubble | `/coming-soon?feature=ask` |

### Latest Bayanaat rail
- Section header "Latest Bayanaat" + chevron right (tap → `/bayanaat`).
- Horizontal `FlatList` of `useLatestContent('bayan', 10)`. Each card is
  the existing `ContentCard`'s portrait cousin (260px wide) showing
  title, credit, date, duration, type tag, and three-icon action row
  (bookmark / download / share).
- `paddingBottom` = 120 so content clears the floating pill.

## Profile page (flat `app/profile.tsx`)

Existing file modified. Sections top to bottom:
1. Back button (← Back) linking to previous route.
2. Hero: avatar (80px circle, gold ring) + display name + email.
3. **Admin console** row — only when `isAdmin || isEditor`. Icon: shield.
4. **My Content** group: `Saved` (count from bookmarks table) and
   `Downloads` (count from downloads table). Each row links to the
   existing collection/downloads view (re-use `app/(tabs)/collection.tsx`
   contents, rendered as `/saved` flat route).
5. **Preferences** group: `Language` (English / اردو; tap opens current
   language modal or toggles directly), `Theme` (System / Light / Dark;
   tap opens the existing theme picker).
6. **Danger**: Sign out row, red icon + red label, `signOut()` on tap.

## Tab content screens (Bayanaat / Clips / Ashaar / Books)

Four new screens. Each is a thin wrapper around a shared
`components/FilteredContentList.tsx` component that takes a prop
`types: ContentType[]`, fetches with an `ilike`/ `in` query on
`content.type`, paginates, and renders rows via `ContentCard`. Example:

```tsx
// app/(tabs)/bayanaat.tsx
export default function BayanaatScreen() {
  return <FilteredContentList kicker="BAYANAAT" types={['bayan']} />;
}
```

Shared screen chrome:
- Dark hero stripe with kicker and count.
- Inline search input (debounced 300ms) filtering by title or credit
  inside the current type scope (mirrors the category page's inline
  filter from the credit feature).
- Paginated FlatList.

## New placeholder screens

- `app/coming-soon.tsx` — takes `feature` query param. Renders back
  button, gold glyph, title "<Feature> — coming soon", subtitle "We're
  working on this." Matches the Calm Architecture card styling.
- `app/schedule.tsx` — read-only list of upcoming `scheduled_sessions`
  rows for non-privileged users (admins keep using `/admin/schedule`).

## Components to add / rewrite

- `components/BrandBanner.tsx` — the home banner block.
- `components/HomeTopBar.tsx` — top bar with language + admin + profile.
- `components/FloatingTabBar.tsx` — replaces `CustomTabBar.tsx`.
- `components/FilteredContentList.tsx` — shared tab-screen body.
- `components/QuickActionTile.tsx` — home tile.
- `components/LiveStatusCard.tsx` — home live/next card.

## Error / empty states

- Live card when both hooks error: show "OFF AIR · Unable to load
  schedule" and make the card inert.
- Rail when empty: show one placeholder "No bayanaat yet" card.
- Tab screens when empty: existing `ContentCard` empty-state pattern.

## Testing

Manual smoke (no automated tests added this cycle; codebase convention):
1. `npm run web` — all tab routes render.
2. Home renders banner with the gold calligraphy, subtitle on one line.
3. Top-right shows shield+profile for admin, profile-only for regular.
4. Language toggle flips between EN and UR.
5. Every tile navigates (Salah/Ask Hazrat → coming soon; Mamulat → its
   category; etc.).
6. Floating pill shows on all 5 tab screens; active tab is gold.
7. Profile page shows correct admin row for privileged users only.
8. Dark mode: every component respects theme tokens, no hard-coded
   colors leak through.

## Out of scope (for separate specs)

- Real Salah Timings feature (location + API integration).
- Real Ask Hazrat feature (message/Q&A flow).
- Re-enabling the Collection/Saved flow beyond the profile link.
- Home page pull-to-refresh.
- Empty-state illustrations.
