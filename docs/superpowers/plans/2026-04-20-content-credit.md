# Content Credit Field + In-Category Search Filter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a bilingual `credit_en` / `credit_ur` field to every content item (speaker for bayan/clip/nazam/hamd_naat, reciter for quran, author for book), surface it in card + detail views, and let users search each library category page by title **or** credit.

**Architecture:** One new nullable Postgres column pair on `public.content`, an extension to the `Content` TypeScript type, one bilingual input in the admin upload form, three small display touch-ups (card, book top bar, player screen), one hook extension for the global search, and one inline filter on the category listing page. No new tables, no backfill, no migration of existing rows.

**Tech Stack:** Expo SDK 54 + React Native Web, Supabase (Postgres + RLS), TypeScript. Supabase migrations are applied by pasting SQL into the dashboard's SQL editor (no local supabase CLI in this repo).

---

## File Structure

**Create:**
- `supabase/migrations/007_content_credit.sql` — ALTER TABLE adding `credit_en` / `credit_ur`.

**Modify:**
- `lib/types.ts` — extend `Content` interface with the two new fields.
- `app/admin/upload.tsx` — add credit inputs, include in insert + update payloads.
- `components/ContentCard.tsx` — render a muted credit line under the title.
- `app/book/[id].tsx` — show credit beneath title in the top bar.
- `app/player/[id].tsx` — replace the hardcoded `trackArtist` string with the credit, hide when null.
- `hooks/useContent.ts` — extend `useSearchContent`'s `.or()` to match `credit_en` / `credit_ur`.
- `app/library/[categoryId].tsx` — inline `TextInput` in the list header; debounced filter scoped to `category_id` that matches title or credit.

---

## Task 1: DB migration — add credit columns

**Files:**
- Create: `supabase/migrations/007_content_credit.sql`

- [ ] **Step 1: Write the migration file**

Create `supabase/migrations/007_content_credit.sql` with this content:

```sql
-- 007_content_credit.sql — bilingual credit field on content rows.
-- Used to record the speaker (bayan/clip/nazam/hamd_naat), the reciter
-- (quran), or the author (book). Nullable — existing rows stay NULL
-- until an admin edits them.

ALTER TABLE public.content
  ADD COLUMN IF NOT EXISTS credit_en TEXT,
  ADD COLUMN IF NOT EXISTS credit_ur TEXT;
```

- [ ] **Step 2: Apply the migration to the hosted Supabase project**

Open the Supabase dashboard → SQL Editor → paste the file contents → Run.

- [ ] **Step 3: Verify the columns exist**

In the same SQL Editor, run:

```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'content'
  AND column_name IN ('credit_en', 'credit_ur');
```

Expected: two rows, both `text`, both `is_nullable = YES`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/007_content_credit.sql
git commit -m "feat(db): add credit_en/credit_ur columns to content"
```

---

## Task 2: Extend the Content type

**Files:**
- Modify: `lib/types.ts` (the `Content` interface, around lines 27–40)

- [ ] **Step 1: Add the fields to the Content interface**

Find the `Content` interface and add the two credit fields right after `description_ur`:

```ts
export interface Content {
  id: string; title_en: string; title_ur: string;
  description_en: string | null; description_ur: string | null;
  credit_en: string | null; credit_ur: string | null;
  type: ContentType; category_id: string; media_url: string;
  thumbnail_url: string | null; duration: number | null;
  file_size: number | null; is_video: boolean;
  uploaded_by: string; created_at: string; updated_at: string;
  mirror_status: MirrorStatus;
  mirror_format: MirrorFormat | null;
  mirror_source_url: string | null;
  mirror_error: string | null;
  mirror_attempts: number;
  mirror_updated_at: string;
}
```

- [ ] **Step 2: Verify the app still type-checks**

Run the Expo dev bundler — it reports TypeScript errors in the terminal and in the browser overlay:

```bash
npm run web
```

Expected: no new type errors involving `Content`, `credit_en`, or `credit_ur`. Stop the dev server (Ctrl-C) when you're done.

- [ ] **Step 3: Commit**

```bash
git add lib/types.ts
git commit -m "feat(types): add credit_en/credit_ur to Content"
```

---

## Task 3: Admin upload form — credit inputs

**Files:**
- Modify: `app/admin/upload.tsx`

- [ ] **Step 1: Add credit state and wire into fetchContent (edit mode)**

At the top of the component with the other `useState` calls (near `mediaUrl` / `thumbnailUrl`), add:

```tsx
const [creditEn, setCreditEn] = useState('');
const [creditUr, setCreditUr] = useState('');
```

In the `fetchContent` effect (the one that runs when `editId` is present), after the existing `setThumbnailUrl(data.thumbnail_url ?? '');` line, add:

```tsx
setCreditEn(data.credit_en ?? '');
setCreditUr(data.credit_ur ?? '');
```

- [ ] **Step 2: Include credit in the update payload (edit mode)**

In `handlePublish`, inside the `if (editId) { ... supabase.from('content').update({ ... }) }` branch, add two lines to the object passed to `.update(...)`:

```tsx
({ error } = await supabase.from('content').update({
  title_en: titleEn.trim(),
  title_ur: titleUr.trim(),
  type: selectedType,
  category_id: selectedCategory.id,
  media_url: mediaUrl.trim(),
  thumbnail_url: thumbnailUrl.trim() || null,
  credit_en: creditEn.trim() || null,
  credit_ur: creditUr.trim() || null,
  is_video: isVideo,
}).eq('id', editId));
```

- [ ] **Step 3: Include credit in the insert payload (new mode)**

In the same `handlePublish`, inside the `else { const payload: Record<string, any> = { ... } }` branch, add the two lines to the `payload` object (alongside the other bilingual fields):

```tsx
const payload: Record<string, any> = {
  title_en: titleEn.trim(),
  title_ur: titleUr.trim(),
  type: selectedType,
  category_id: selectedCategory.id,
  thumbnail_url: thumbnailUrl.trim() || null,
  credit_en: creditEn.trim() || null,
  credit_ur: creditUr.trim() || null,
  description_en: null,
  description_ur: null,
  duration: null,
  file_size: null,
  uploaded_by: user!.id,
};
```

- [ ] **Step 4: Render the bilingual credit inputs**

In the JSX, find the two `TITLE` TextInputs (the English one and the RTL Urdu one). Immediately after the closing `</View>` of the Urdu title's wrapping `<View style={{ marginTop: 10 }}>`, insert the new CREDIT section:

```tsx
{/* Credit (English) */}
<Text style={styles.sectionLabel}>CREDIT</Text>
<TextInput
  style={styles.input}
  placeholder="Speaker, reciter, author…"
  placeholderTextColor={c.textMuted}
  value={creditEn}
  onChangeText={setCreditEn}
  returnKeyType="next"
/>

{/* Credit (Urdu) */}
<View style={{ marginTop: 10 }}>
  <TextInput
    style={[styles.input, styles.inputRtl]}
    placeholder="مقرر، قاری، مصنف…"
    placeholderTextColor={c.textMuted}
    value={creditUr}
    onChangeText={setCreditUr}
    textAlign="right"
    returnKeyType="next"
  />
</View>
```

- [ ] **Step 5: Verify manually**

Run `npm run web`, sign in as admin, go to `/admin/upload`:

1. Create a new bayan with title "Test bayan", Urdu title "ٹیسٹ", credit "Hazrat Thanwi" / "حضرت تھانوی". Publish.
2. Open the Supabase SQL Editor and run `SELECT title_en, credit_en, credit_ur FROM content WHERE title_en='Test bayan';`. Both credit fields should match what you typed.
3. From `/admin/manage-content`, tap Edit on that row. The credit fields should be pre-filled. Change the English credit to "Updated Name", save. Re-query — `credit_en` should now read "Updated Name".
4. Delete the test row (Supabase SQL Editor): `DELETE FROM content WHERE title_en='Test bayan';`.

- [ ] **Step 6: Commit**

```bash
git add app/admin/upload.tsx
git commit -m "feat(admin): credit inputs on upload + edit form"
```

---

## Task 4: Credit helper + ContentCard display

**Files:**
- Modify: `lib/types.ts` (export a small helper so all display sites use the same logic)
- Modify: `components/ContentCard.tsx`

- [ ] **Step 1: Add a shared `pickCredit` helper to `lib/types.ts`**

At the bottom of `lib/types.ts`, append:

```ts
// Picks the credit string to display for a content item. Prefers the
// user's current language; falls back to the other language so a row
// with only one credit filled in still shows something; returns null
// when both are empty, so the caller can skip rendering.
export function pickCredit(
  content: Pick<Content, 'credit_en' | 'credit_ur'>,
  language: 'en' | 'ur',
): string | null {
  const primary = language === 'ur' ? content.credit_ur : content.credit_en;
  const fallback = language === 'ur' ? content.credit_en : content.credit_ur;
  const value = (primary && primary.trim()) || (fallback && fallback.trim()) || null;
  return value;
}
```

- [ ] **Step 2: Render the credit line in ContentCard**

In `components/ContentCard.tsx`, update the imports to include `pickCredit`:

```tsx
import { Content, ContentType, pickCredit } from '../lib/types';
```

Inside the `ContentCard` component, after the existing `const typeLabel = ...` line, compute the credit:

```tsx
const credit = pickCredit(content, language);
```

Then in the JSX, inside the `<View style={styles.body}>`, between the `<BilingualText ... />` (title) and the `<Text style={[styles.meta, ...]}>` (meta line), insert:

```tsx
{credit ? (
  <Text
    style={[styles.credit, { color: c.textMuted }]}
    numberOfLines={1}
  >
    {credit}
  </Text>
) : null}
```

- [ ] **Step 3: Add the `credit` style**

In the `StyleSheet.create(...)` block at the bottom of `components/ContentCard.tsx`, add an entry between `title` and `meta`:

```tsx
credit: {
  fontFamily: 'CrimsonPro-Italic',
  fontSize: 13,
  lineHeight: 16,
  marginTop: 2,
},
```

- [ ] **Step 4: Verify manually**

Start `npm run web`. On the hosted Supabase DB, seed a credit on any existing row you can easily find in the library:

```sql
UPDATE public.content
SET credit_en = 'Hazrat Thanwi', credit_ur = 'حضرت تھانوی'
WHERE id = '<pick one id you can see on the home page>'
RETURNING title_en, credit_en;
```

Reload the web app home page. The seeded row's card should now show "Hazrat Thanwi" (or the Urdu version if you're in Urdu mode) as a muted italic line below the title. Cards for rows with no credit show no extra line.

- [ ] **Step 5: Commit**

```bash
git add lib/types.ts components/ContentCard.tsx
git commit -m "feat(ui): render credit on ContentCard"
```

---

## Task 5: Book viewer top bar — credit under title

**Files:**
- Modify: `app/book/[id].tsx`

- [ ] **Step 1: Import the helper**

In the imports at the top of `app/book/[id].tsx`, add `pickCredit` to the import from `../../lib/types`:

```tsx
import { Content, pickCredit } from '../../lib/types';
```

(If the file already imports `Content` from that path, just add `pickCredit` to the existing import list.)

- [ ] **Step 2: Use `useI18n` to get the current language**

At the top of the imports add (if not already present):

```tsx
import { useI18n } from '../../providers/I18nProvider';
```

Inside `BookViewerScreen`, near the other hook calls (after `useTheme()`), add:

```tsx
const { language } = useI18n();
```

- [ ] **Step 3: Compute credit for display**

After `const title = content ? content.title_en || content.title_ur || 'Book' : 'Book';`, add:

```tsx
const credit = content ? pickCredit(content, language as 'en' | 'ur') : null;
```

- [ ] **Step 4: Wrap the top-bar title in a column and add the credit line**

Find this block in the success-state return (around `<Text style={[styles.topBarTitle, ...]}>`):

```tsx
{/* Title */}
<Text style={[styles.topBarTitle, { color: c.text }]} numberOfLines={1}>
  {title}
</Text>
```

Replace it with a `<View>` that stacks title + credit:

```tsx
{/* Title + credit */}
<View style={styles.topBarTitleWrap}>
  <Text style={[styles.topBarTitle, { color: c.text }]} numberOfLines={1}>
    {title}
  </Text>
  {credit ? (
    <Text
      style={[styles.topBarCredit, { color: c.textMuted }]}
      numberOfLines={1}
    >
      {credit}
    </Text>
  ) : null}
</View>
```

- [ ] **Step 5: Add the new styles**

In the `StyleSheet.create({...})` block at the bottom of the file, add next to the existing `topBarTitle` entry:

```tsx
topBarTitleWrap: {
  flex: 1,
  marginHorizontal: 4,
  alignItems: 'center',
},
topBarCredit: {
  fontFamily: 'CrimsonPro-Italic',
  fontSize: 12,
  marginTop: 2,
  textAlign: 'center',
},
```

Also in the existing `topBarTitle` style, **remove** the `flex: 1`, `marginHorizontal: 4`, and `textAlign: 'center'` entries if they're there — those responsibilities move to `topBarTitleWrap`. Keep the font-related ones (`fontFamily`, `fontSize`). Final `topBarTitle` should be:

```tsx
topBarTitle: {
  fontFamily: 'CrimsonPro-Medium',
  fontSize: 17,
},
```

- [ ] **Step 6: Verify manually**

Run `npm run web`. Open a book row that has credit seeded. The top bar should show the title on the first line and the credit in muted italic directly beneath it, both centred. Open a book whose credit is null — the layout should be unchanged from before this task (just the title, no extra line).

- [ ] **Step 7: Commit**

```bash
git add app/book/[id].tsx
git commit -m "feat(book): show credit under title in top bar"
```

---

## Task 6: Player screen — real credit instead of hardcoded string

**Files:**
- Modify: `app/player/[id].tsx`

- [ ] **Step 1: Import the helper**

Update the import of `Content, ContentType` from `../../lib/types` to also pull in `pickCredit`:

```tsx
import { Content, ContentType, pickCredit } from '../../lib/types';
```

- [ ] **Step 2: Compute credit**

Near the existing `const title = ...` derivation (around line 220), add below it:

```tsx
const credit = content ? pickCredit(content, language as 'en' | 'ur') : null;
```

- [ ] **Step 3: Replace the hardcoded `trackArtist` line**

Find this block (around line 366 in the existing file):

```tsx
<Text style={[styles.trackArtist, { color: c.textMuted }]} numberOfLines={1}>
  Hazrat Mufti Abdur Rasheed Miftahi Sahab
</Text>
```

Replace it with:

```tsx
{credit ? (
  <Text style={[styles.trackArtist, { color: c.textMuted }]} numberOfLines={1}>
    {credit}
  </Text>
) : null}
```

- [ ] **Step 4: Verify manually**

Run `npm run web`. Open a player screen for a content row with credit seeded — the former hardcoded "Hazrat Mufti Abdur Rasheed Miftahi Sahab" should now show the row's credit. Open a player screen for a row with no credit — the line should disappear cleanly (no gap or placeholder).

- [ ] **Step 5: Commit**

```bash
git add app/player/[id].tsx
git commit -m "feat(player): show content credit instead of hardcoded string"
```

---

## Task 7: Extend global search to match credit

**Files:**
- Modify: `hooks/useContent.ts` (the `useSearchContent` function, around lines 151–184)

- [ ] **Step 1: Widen the `.or(...)` filter**

Find this line inside `useSearchContent`:

```tsx
.or(`title_en.ilike.%${sanitized}%,title_ur.ilike.%${sanitized}%`)
```

Replace it with:

```tsx
.or(
  `title_en.ilike.%${sanitized}%,title_ur.ilike.%${sanitized}%,credit_en.ilike.%${sanitized}%,credit_ur.ilike.%${sanitized}%`,
)
```

- [ ] **Step 2: Verify manually**

Run `npm run web`. Ensure at least one row has credit "Hazrat Thanwi". Navigate to the library search screen (`/library/search`). Type "Thanwi" — that row should appear in the results. Type a title-only term — existing results still return. Clear the input — results clear as before.

- [ ] **Step 3: Commit**

```bash
git add hooks/useContent.ts
git commit -m "feat(search): match credit_en/credit_ur in global library search"
```

---

## Task 8: Category page inline filter

**Files:**
- Modify: `app/library/[categoryId].tsx`

- [ ] **Step 1: Add the sanitiser constant and query state**

At the top of the file (just below the `PAGE_SIZE` constant at line 20), add the shared sanitiser regex so it lives next to the other page-level constants:

```tsx
// Same set as hooks/useContent.ts::useSearchContent — strip chars that
// would break out of a PostgREST filter expression.
const SANITIZE_RE = /[,%()\\]/g;
```

Inside `CategoryListingScreen`, with the other `useState` calls, add:

```tsx
const [query, setQuery] = useState('');
const [debouncedQuery, setDebouncedQuery] = useState('');
```

- [ ] **Step 2: Debounce the input**

After the existing `useEffect`s, add a debounce effect:

```tsx
// Debounce typed input by 300ms so each keystroke doesn't fire a fetch.
useEffect(() => {
  const t = setTimeout(() => {
    setDebouncedQuery(query.trim().replace(SANITIZE_RE, ''));
  }, 300);
  return () => clearTimeout(t);
}, [query]);
```

- [ ] **Step 3: Apply the filter inside the fetchers**

Replace the entire existing `fetchContent` callback with this version (it conditionally adds the `.or(...)` clause when `debouncedQuery` is non-empty):

```tsx
const fetchContent = useCallback(
  async (fromStart = true) => {
    if (!categoryId) return;

    if (fromStart) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }

    const offset = fromStart ? 0 : content.length;

    let builder = supabase
      .from('content')
      .select('*')
      .eq('category_id', categoryId);

    if (debouncedQuery) {
      const q = debouncedQuery;
      builder = builder.or(
        `title_en.ilike.%${q}%,title_ur.ilike.%${q}%,credit_en.ilike.%${q}%,credit_ur.ilike.%${q}%`,
      );
    }

    const { data, error } = await builder
      .order('created_at', { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1);

    if (!error && data) {
      if (fromStart) {
        setContent(data);
      } else {
        setContent((prev) => [...prev, ...data]);
      }
      setHasMore(data.length === PAGE_SIZE);
    }

    if (fromStart) setLoading(false);
    else setLoadingMore(false);
  },
  [categoryId, content.length, debouncedQuery],
);
```

Replace the entire existing `handleRefresh` callback with this version (same filter logic applied to the refresh path):

```tsx
const handleRefresh = useCallback(async () => {
  setRefreshing(true);
  if (!categoryId) { setRefreshing(false); return; }

  let builder = supabase
    .from('content')
    .select('*')
    .eq('category_id', categoryId);

  if (debouncedQuery) {
    const q = debouncedQuery;
    builder = builder.or(
      `title_en.ilike.%${q}%,title_ur.ilike.%${q}%,credit_en.ilike.%${q}%,credit_ur.ilike.%${q}%`,
    );
  }

  const { data, error } = await builder
    .order('created_at', { ascending: false })
    .range(0, PAGE_SIZE - 1);

  if (!error && data) {
    setContent(data);
    setHasMore(data.length === PAGE_SIZE);
  }
  setRefreshing(false);
}, [categoryId, debouncedQuery]);
```

- [ ] **Step 4: Re-run the initial fetch when the filter changes**

Replace the existing `useEffect(() => { fetchContent(true); /* eslint ... */ }, [categoryId]);` block with one that also re-runs when the query changes:

```tsx
useEffect(() => {
  fetchContent(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [categoryId, debouncedQuery]);
```

- [ ] **Step 5: Add the search input to the list header**

Import `TextInput` from `react-native` (add to the existing import list at the top of the file).

Inside the `renderHeader` function, replace the block from `{!loading && (...)}` (the hero count) through the closing `</View>` of `<View style={[styles.hero, ...]}>` with the following — it keeps the count and adds the search input just below it, still inside the hero:

```tsx
      {/* Count */}
      {!loading && (
        <Text style={[styles.heroCount, { color: 'rgba(247,245,240,0.55)' }]}>
          {contentCount} {contentCount === 1 ? 'ITEM' : 'ITEMS'}
          {debouncedQuery ? ' MATCHING' : ''}
        </Text>
      )}

      {/* Inline search — title or credit, scoped to this category */}
      <TextInput
        style={[
          styles.searchInput,
          { backgroundColor: 'rgba(247,245,240,0.12)', color: '#f7f5f0' },
        ]}
        placeholder="Search title or credit…"
        placeholderTextColor="rgba(247,245,240,0.55)"
        value={query}
        onChangeText={setQuery}
        autoCapitalize="none"
        returnKeyType="search"
      />
    </View>
```

- [ ] **Step 6: Add the `searchInput` style**

In the `StyleSheet.create({...})` block at the bottom of the file, add an entry after `heroCount`:

```tsx
searchInput: {
  marginTop: 16,
  paddingHorizontal: 14,
  paddingVertical: 10,
  borderRadius: 8,
  fontFamily: 'DMSans',
  fontSize: 14,
},
```

- [ ] **Step 7: Verify manually**

Run `npm run web`. In Supabase, seed two rows in the same category (say "Bayans") with different credits — e.g. row A: `credit_en = 'Hazrat Thanwi'`, row B: `credit_en = 'Mufti Pholpuri'`. Navigate to that category:

1. Both rows visible, hero reads "2 ITEMS".
2. Type "Thanwi" — after ~300 ms only row A should remain; hero reads "1 ITEM MATCHING".
3. Clear the input — both rows return, hero reads "2 ITEMS".
4. Type a title substring from one of the rows — the matching row returns.
5. Pull-to-refresh (on web, a mouse drag from top) — results reload under the current filter.
6. If you have >20 matching rows, scroll to the bottom — pagination fetches more matches.

- [ ] **Step 8: Commit**

```bash
git add app/library/[categoryId].tsx
git commit -m "feat(library): inline category search — title or credit"
```

---

## Task 9: Push + watch the CI/CD deploy

**Files:** none.

- [ ] **Step 1: Push the branch**

```bash
git push origin main
```

- [ ] **Step 2: Watch the workflow run**

Switch to the `EnnBi` GitHub account and tail the latest run:

```bash
gh auth switch --user EnnBi
gh run list --repo EnnBi/Khanqah --limit 1
gh run watch --repo EnnBi/Khanqah $(gh run list --repo EnnBi/Khanqah --limit 1 --json databaseId --jq '.[0].databaseId')
gh auth switch --user nadeem-baba
```

Expected: `Deploy web + nginx to DO` reaches `completed success` in ~2 min.

- [ ] **Step 3: Smoke-test the live site**

Open `http://165.22.208.103/` in a fresh tab (or hard-reload). Seed at least one row with a credit (if you haven't already) and verify:

- The ContentCard on the home page shows the credit.
- The category page for that row's category includes the inline search box, and searching by the credit narrows results.
- The player screen and book viewer both show the credit.

If any of the above is wrong, the failing check is on the production `main` — investigate, fix, commit, push; CI redeploys automatically.

---

## Self-Review Notes

**Spec coverage check:**
- Schema (spec §1) → Task 1 ✓
- Types (spec §2) → Task 2 ✓
- Admin form (spec §3) → Task 3 ✓
- Display on ContentCard, book viewer, player (spec §4) → Tasks 4, 5, 6 ✓
- Category page filter (spec §5) → Task 8 ✓
- Global search extension (spec §6) → Task 7 ✓
- Testing plan (spec §Testing) → Manual-verify steps in each UI task + Task 9 live smoke ✓
- Deploy (CI/CD) → Task 9 ✓

**Placeholder scan:** No TBDs, no "add validation" hand-waves, no "similar to Task N". Every code step shows the code. ✓

**Type consistency:** `pickCredit(content, language)` is declared in Task 4 and used verbatim in Tasks 4, 5, 6. `credit_en` / `credit_ur` names match across schema, types, helper, form payload, `.or()` filters, and display sites. `debouncedQuery` and `SANITIZE_RE` are defined and used consistently within Task 8. ✓
