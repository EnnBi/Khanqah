# Content Credit Field + In-Category Search Filter

**Date:** 2026-04-20
**Status:** Approved for implementation

## Goal

Add a single bilingual "credit" field to every content item that names the speaker (for bayans, clips, nazams, hamd/naat), the reciter (for quran), or the author (for books). Surface credit in card and detail views, and let users search each library category page by title **or** credit.

## Non-Goals

- No speakers/authors table or FK — credit is plain text.
- No backfill of existing rows. Credit is nullable; rows stay null until an admin edits.
- No changes to home-screen rails, admin analytics, or collection views beyond what `ContentCard` already shows everywhere it's rendered.

## Schema

New migration: `supabase/migrations/007_content_credit.sql`.

```sql
ALTER TABLE public.content
  ADD COLUMN credit_en TEXT,
  ADD COLUMN credit_ur TEXT;
```

Both columns are nullable. No indexes — search uses `ilike` against a library page's already-narrow category slice (typical N ≤ few hundred).

RLS: the existing `content` policies cover the new columns; no policy change.

## Types

`lib/types.ts` — extend the `Content` interface:

```ts
credit_en: string | null;
credit_ur: string | null;
```

## Admin form

`app/admin/upload.tsx`:

- Add a `CREDIT` section below `TITLE`, same visual treatment as the title pair: English input on top, Urdu input (RTL) below.
- Placeholder EN: "Speaker, reciter, author…". Placeholder UR: "مقرر، قاری، مصنف…".
- Optional on submit (null if trimmed-empty).
- Wired into both `insert` payload (new content) and `update` payload (edit mode).
- Shown for every content type — one field works for bayan / clip / nazam / quran / hamd_naat / book alike.

## Display

Add a single-line credit below the title wherever the user sees a content item:

- `components/ContentCard.tsx` — one line under the existing title row, `textMuted` color, smaller font. Render nothing when both credit fields are null.
- `app/book/[id].tsx` top bar — render below the title in the top bar when present.
- `app/player/[id].tsx` — render below the track title in the now-playing view.

Language selection follows the existing pattern: prefer `credit_ur` when `language === 'ur'` and it is non-empty; otherwise prefer `credit_en`; otherwise don't render.

## In-category search (category listing page)

`app/library/[categoryId].tsx`:

- Add a `TextInput` inside `ListHeaderComponent`, rendered immediately after the hero block (scrolls with the list — no sticky behaviour).
- Local state `query`, 300 ms `setTimeout` debounce before firing the filtered fetch (matches `useSearchContent`).
- Sanitize the query with `query.replace(/[,%()\\]/g, '')` — same sanitiser used in `useSearchContent` to prevent PostgREST filter injection.
- Fetch behaviour:
  - **Empty query** — unchanged: paginated fetch scoped to `category_id`.
  - **Non-empty query** — filtered fetch scoped to the same `category_id`:
    ```ts
    .eq('category_id', categoryId)
    .or(`title_en.ilike.%${q}%,title_ur.ilike.%${q}%,credit_en.ilike.%${q}%,credit_ur.ilike.%${q}%`)
    .order('created_at', { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1)
    ```
- Pagination (`handleEndReached`) keeps working — it uses the current filter state.
- The hero count updates to "N ITEMS MATCHING" when a query is active, "N ITEMS" when empty.
- Clearing the input reverts to the unfiltered fetch.

## Global search

`hooks/useContent.ts` — update `useSearchContent`'s `.or(...)` clause:

```ts
.or(`title_en.ilike.%${sanitized}%,title_ur.ilike.%${sanitized}%,credit_en.ilike.%${sanitized}%,credit_ur.ilike.%${sanitized}%`)
```

No other changes needed — `app/library/search.tsx` picks up the extended match automatically.

## Error handling

- Input sanitisation prevents PostgREST filter injection (matches existing behaviour).
- Supabase errors on the filtered fetch surface via the existing loading/empty/error states.
- Null/empty credit renders nothing rather than "—" or blank lines.

## Testing

Manual smoke tests after implementation:

1. Run migration on dev DB — `credit_en` / `credit_ur` columns exist, existing rows unaffected.
2. Admin upload a new bayan with credit "Hazrat Thanwi" / "حضرت تھانوی" — row has both columns set.
3. Admin edit an existing book, add an author — row updates.
4. `ContentCard` in library shows the credit line; clearing credit hides it.
5. Book viewer + player screen show credit in the header.
6. On the Bayans category page, type "Thanwi" — only bayans with matching credit/title return. Clear query — full list returns.
7. Global `/library/search` — typing "Thanwi" matches by credit across all types.
8. Pagination: load a category with many items, apply a filter that matches a lot, scroll — more results load under the filter.

## Out of scope (future)

- A distinct-credits filter chip / dropdown on category pages (YAGNI until we have the data to justify it).
- A dedicated speakers/authors table with a profile page.
- Sorting by credit, grouping by credit.
