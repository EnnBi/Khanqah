# YouTube → archive.org Mirror Pipeline — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When an admin uploads content via a YouTube URL, a server-side worker mirrors the file to archive.org and the resulting row in `content` ends up pointing at that archive URL — so the player only ever speaks plain HTTP audio/video and YouTube iframes disappear.

**Architecture:** Supabase row = queue. The admin form inserts a `mirror_status = 'pending'` row; a Node worker on the existing DO server polls, shells out to `yt-dlp`, uploads to the Internet Archive S3 endpoint (same pattern as `server/record-and-upload.sh`), and PATCHes the row to `ready` with the archive URL. RLS hides in-progress/failed rows from the public app; an admin chip shows the state in `manage-content`.

**Tech Stack:** PostgreSQL (Supabase) · Node 20 (CommonJS, built-in `node:test`) · `@supabase/supabase-js` · `yt-dlp` · `ffmpeg` (already installed via `deploy.sh`) · `systemd` · Expo React Native (admin UI).

**Spec:** `docs/superpowers/specs/2026-04-17-youtube-mirror-design.md`

---

## File Structure

### Files to create

| Path                                              | Responsibility                                                 |
|---------------------------------------------------|----------------------------------------------------------------|
| `supabase/migrations/005_yt_mirror.sql`           | Enum types, new `content.mirror_*` columns, index, updated RLS |
| `server/package.json`                             | Declares the worker's Node deps (`@supabase/supabase-js`)      |
| `server/mirror-lib.js`                            | Pure helpers: arg builders, URL builders, header builders, stderr tailer |
| `server/mirror-jobs.js`                           | Side-effecting jobs: claim pending row, update status, download, upload |
| `server/mirror-worker.js`                         | Entry point: loop + orchestration (`processOne`)               |
| `server/khanqah-mirror.service`                   | `systemd` unit (`Restart=always`, reads `/opt/khanqah/.env`)   |
| `server/__tests__/mirror-lib.test.js`             | Unit tests for pure helpers                                    |
| `server/__tests__/mirror-jobs.test.js`            | Unit tests for jobs with a mocked Supabase client              |
| `server/__tests__/mirror-worker.test.js`          | Integration tests for `processOne` (happy path + failure path) |
| `components/MirrorStatusChip.tsx`                 | Small status chip + colour mapping (QUEUED / MIRRORING / FAILED) |

### Files to modify

| Path                                              | Change                                                         |
|---------------------------------------------------|----------------------------------------------------------------|
| `server/deploy.sh`                                | `apt-get install -y yt-dlp`, copy worker + service, enable it  |
| `lib/types.ts`                                    | Add `MirrorStatus`, `MirrorFormat` types; extend `Content`     |
| `app/admin/upload.tsx`                            | Detect YouTube; show `Audio/Video` toggle; new insert shape    |
| `app/admin/manage-content.tsx`                    | Render `<MirrorStatusChip>`; retry-failed bottom sheet         |

The three worker files (`mirror-lib`, `mirror-jobs`, `mirror-worker`) split by responsibility so each test file can stay focused: pure helpers have no mocks, jobs only mock Supabase, the worker only mocks the internals it orchestrates.

---

## Task 1: Migration — enums, columns, index, RLS

**Files:**
- Create: `supabase/migrations/005_yt_mirror.sql`

- [ ] **Step 1: Write the migration**

Create `supabase/migrations/005_yt_mirror.sql`:

```sql
-- 005_yt_mirror.sql — YouTube → archive.org mirror pipeline
-- Adds the mirror_* columns that the server worker writes to, an index that
-- makes the poll query trivial, and swaps the public read policy so that
-- in-progress / failed mirror rows are invisible to the public app.

BEGIN;

-- ── Enum types ───────────────────────────────────────────────
CREATE TYPE mirror_status_t AS ENUM (
  'pending', 'downloading', 'uploading', 'ready', 'failed', 'not_applicable'
);

CREATE TYPE mirror_format_t AS ENUM ('audio', 'video');

-- ── New columns on content ───────────────────────────────────
ALTER TABLE public.content
  ADD COLUMN mirror_status     mirror_status_t NOT NULL DEFAULT 'not_applicable',
  ADD COLUMN mirror_format     mirror_format_t,
  ADD COLUMN mirror_source_url TEXT,
  ADD COLUMN mirror_error      TEXT,
  ADD COLUMN mirror_attempts   INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN mirror_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- ── Poll index: only rows that matter for the worker ─────────
CREATE INDEX content_mirror_pending_idx
  ON public.content (created_at)
  WHERE mirror_status = 'pending';

-- ── Replace the broad public read policy ─────────────────────
DROP POLICY IF EXISTS "content: anyone reads" ON public.content;

CREATE POLICY "content: public reads ready only"
  ON public.content FOR SELECT
  USING (
    mirror_status IN ('ready', 'not_applicable')
    OR public.get_user_role() IN ('editor', 'admin')
  );

COMMIT;
```

- [ ] **Step 2: Apply the migration to local Supabase**

Run:
```bash
supabase db reset   # if using local Supabase CLI — else paste the SQL into the Studio SQL editor
```

Expected: command completes with no errors, and migration 005 shows up in `supabase migration list`.

- [ ] **Step 3: Verify the backfill by hand**

Run in the Studio SQL editor:
```sql
SELECT mirror_status, count(*)
FROM public.content
GROUP BY 1;
```

Expected: every existing row lands in `not_applicable`. No other bucket.

- [ ] **Step 4: Verify the RLS effect by hand**

Insert a synthetic pending row (keep any category that exists — replace `<uid>` with an existing admin's id and `<cat>` with any category id):
```sql
INSERT INTO public.content
  (title_en, title_ur, type, category_id, media_url, uploaded_by,
   mirror_status, mirror_format, mirror_source_url)
VALUES
  ('RLS test', 'RLS test', 'clip', '<cat>', '', '<uid>',
   'pending', 'audio', 'https://youtu.be/abc');
```

As anon (use the Studio "Impersonate anon" option or the public REST URL with the anon key):
```sql
SELECT id, mirror_status FROM public.content WHERE title_en = 'RLS test';
```
Expected: 0 rows.

As an admin user:
Expected: 1 row.

Clean up:
```sql
DELETE FROM public.content WHERE title_en = 'RLS test';
```

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/005_yt_mirror.sql
git commit -m "feat(db): add mirror_* columns + RLS for YouTube mirror pipeline"
```

---

## Task 2: Server scaffolding

**Files:**
- Create: `server/package.json`
- Create: `server/mirror-lib.js` (empty exports)
- Create: `server/mirror-jobs.js` (empty exports)
- Create: `server/mirror-worker.js` (entry stub)
- Create: `server/__tests__/.gitkeep`

- [ ] **Step 1: Write `server/package.json`**

```json
{
  "name": "khanqah-server",
  "version": "1.0.0",
  "private": true,
  "main": "mirror-worker.js",
  "scripts": {
    "test": "node --test __tests__/"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.45.0"
  }
}
```

- [ ] **Step 2: Create empty module shells**

`server/mirror-lib.js`:
```js
// Pure helpers for the mirror worker. No IO. Unit-tested in isolation.
module.exports = {};
```

`server/mirror-jobs.js`:
```js
// Side-effecting jobs used by the mirror worker: Supabase reads/writes,
// yt-dlp execution, archive.org upload. Mockable dependencies are passed
// in so the worker tests can swap them out.
module.exports = {};
```

`server/mirror-worker.js`:
```js
// Entry point: polls Supabase for pending mirror jobs and processes them
// one at a time. Run by systemd as khanqah-mirror.service.
module.exports = {};
```

- [ ] **Step 3: Install deps**

Run from the repo root:
```bash
cd server && npm install
```
Expected: `node_modules/` appears; `package-lock.json` is created.

- [ ] **Step 4: Ignore the lockfile + modules if not already**

Check `.gitignore`. If `server/node_modules` and `server/package-lock.json` are not already ignored, add them:
```bash
echo "server/node_modules" >> .gitignore
echo "server/package-lock.json" >> .gitignore
```
(Decision: lockfile is reproduced at deploy time on the server; no need to track it in the repo for a 150-line worker with one dep.)

- [ ] **Step 5: Smoke-test the test runner**

Create `server/__tests__/smoke.test.js`:
```js
const test = require('node:test');
const assert = require('node:assert/strict');

test('node:test works', () => {
  assert.equal(1 + 1, 2);
});
```

Run:
```bash
cd server && npm test
```
Expected: `# pass 1` in the output.

Delete the smoke file:
```bash
rm server/__tests__/smoke.test.js
```

- [ ] **Step 6: Commit**

```bash
git add server/package.json server/mirror-lib.js server/mirror-jobs.js server/mirror-worker.js .gitignore
git commit -m "feat(server): scaffold mirror-worker module shells and node:test runner"
```

---

## Task 3: Pure helpers in `mirror-lib.js` (TDD)

**Files:**
- Modify: `server/mirror-lib.js`
- Create/Modify: `server/__tests__/mirror-lib.test.js`

- [ ] **Step 1: Write the failing tests**

Create `server/__tests__/mirror-lib.test.js`:
```js
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  buildYtDlpArgs,
  buildArchiveIdentifier,
  buildArchiveDownloadUrl,
  buildArchiveUploadUrl,
  buildArchiveHeaders,
  tailStderr,
} = require('../mirror-lib');

test('buildYtDlpArgs: audio', () => {
  const args = buildYtDlpArgs('audio', '/tmp/mirror/abc.%(ext)s', 'https://youtu.be/xyz');
  assert.deepEqual(args, [
    '-x', '--audio-format', 'mp3', '--audio-quality', '128K',
    '-o', '/tmp/mirror/abc.%(ext)s', 'https://youtu.be/xyz',
  ]);
});

test('buildYtDlpArgs: video is capped at 720p for disk + bandwidth sanity', () => {
  const args = buildYtDlpArgs('video', '/tmp/mirror/abc.%(ext)s', 'https://youtu.be/xyz');
  assert.deepEqual(args, [
    '-f', 'bv*[height<=720]+ba/b[height<=720]',
    '--merge-output-format', 'mp4',
    '-o', '/tmp/mirror/abc.%(ext)s', 'https://youtu.be/xyz',
  ]);
});

test('buildYtDlpArgs: unknown format throws', () => {
  assert.throws(() => buildYtDlpArgs('gif', '/tmp/x', 'url'), /unknown format/i);
});

test('buildArchiveIdentifier: prefixed with khanqah-yt-', () => {
  assert.equal(
    buildArchiveIdentifier('e3a2-4b1f-9c8d'),
    'khanqah-yt-e3a2-4b1f-9c8d',
  );
});

test('buildArchiveDownloadUrl', () => {
  assert.equal(
    buildArchiveDownloadUrl('khanqah-yt-abc', 'abc.mp3'),
    'https://archive.org/download/khanqah-yt-abc/abc.mp3',
  );
});

test('buildArchiveUploadUrl', () => {
  assert.equal(
    buildArchiveUploadUrl('khanqah-yt-abc', 'abc.mp3'),
    'http://s3.us.archive.org/khanqah-yt-abc/abc.mp3',
  );
});

test('buildArchiveHeaders: audio', () => {
  const h = buildArchiveHeaders({
    format: 'audio', title: 'Jummah Bayan', accessKey: 'AK', secretKey: 'SK',
  });
  assert.equal(h['x-amz-auto-make-bucket'], '1');
  assert.equal(h['x-archive-meta-collection'], 'opensource_audio');
  assert.equal(h['x-archive-meta-mediatype'], 'audio');
  assert.equal(h['x-archive-meta-title'], 'Jummah Bayan');
  assert.equal(h.authorization, 'LOW AK:SK');
});

test('buildArchiveHeaders: video uses the movies collection', () => {
  const h = buildArchiveHeaders({
    format: 'video', title: 'Short Clip', accessKey: 'AK', secretKey: 'SK',
  });
  assert.equal(h['x-archive-meta-collection'], 'opensource_movies');
  assert.equal(h['x-archive-meta-mediatype'], 'movies');
});

test('tailStderr: passes short strings through', () => {
  assert.equal(tailStderr('boom'), 'boom');
});

test('tailStderr: keeps only the trailing N chars for long strings', () => {
  const long = 'x'.repeat(5000);
  const tail = tailStderr(long, 2000);
  assert.equal(tail.length, 2000);
  assert.equal(tail, 'x'.repeat(2000));
});

test('tailStderr: handles empty / nullish input', () => {
  assert.equal(tailStderr(undefined), '');
  assert.equal(tailStderr(null), '');
  assert.equal(tailStderr(''), '');
});
```

- [ ] **Step 2: Run tests — expect failures**

Run:
```bash
cd server && npm test
```
Expected: every test fails with `TypeError: ... is not a function` because the exports from `mirror-lib.js` are empty.

- [ ] **Step 3: Implement `mirror-lib.js`**

Overwrite `server/mirror-lib.js`:
```js
// Pure helpers for the mirror worker. No IO. Unit-tested in isolation.

function buildYtDlpArgs(format, outPathTemplate, url) {
  if (format === 'audio') {
    return [
      '-x', '--audio-format', 'mp3', '--audio-quality', '128K',
      '-o', outPathTemplate, url,
    ];
  }
  if (format === 'video') {
    return [
      '-f', 'bv*[height<=720]+ba/b[height<=720]',
      '--merge-output-format', 'mp4',
      '-o', outPathTemplate, url,
    ];
  }
  throw new Error(`unknown format: ${format}`);
}

function buildArchiveIdentifier(contentId) {
  return `khanqah-yt-${contentId}`;
}

function buildArchiveDownloadUrl(identifier, filename) {
  return `https://archive.org/download/${identifier}/${filename}`;
}

function buildArchiveUploadUrl(identifier, filename) {
  return `http://s3.us.archive.org/${identifier}/${filename}`;
}

function buildArchiveHeaders({ format, title, accessKey, secretKey }) {
  const isAudio = format === 'audio';
  return {
    'x-amz-auto-make-bucket': '1',
    'x-archive-meta-collection': isAudio ? 'opensource_audio' : 'opensource_movies',
    'x-archive-meta-mediatype':  isAudio ? 'audio'             : 'movies',
    'x-archive-meta-title':      title,
    authorization:               `LOW ${accessKey}:${secretKey}`,
  };
}

function tailStderr(stderr, limit = 2000) {
  if (!stderr) return '';
  const s = String(stderr);
  return s.length <= limit ? s : s.slice(-limit);
}

module.exports = {
  buildYtDlpArgs,
  buildArchiveIdentifier,
  buildArchiveDownloadUrl,
  buildArchiveUploadUrl,
  buildArchiveHeaders,
  tailStderr,
};
```

- [ ] **Step 4: Run tests — expect all green**

Run:
```bash
cd server && npm test
```
Expected: `# pass 11`, no failures.

- [ ] **Step 5: Commit**

```bash
git add server/mirror-lib.js server/__tests__/mirror-lib.test.js
git commit -m "feat(mirror): add pure helper functions for yt-dlp args + archive.org URLs"
```

---

## Task 4: DB helpers in `mirror-jobs.js` (TDD)

**Files:**
- Modify: `server/mirror-jobs.js`
- Create: `server/__tests__/mirror-jobs.test.js`

`claimPendingJob`, `markStatus`, `markReady`, `markFailed` take a Supabase-compatible client so tests can inject a fake.

- [ ] **Step 1: Build a tiny in-memory fake Supabase client inside the test file**

The fake supports the narrow surface we use (`.from().select().eq()...`, `.update()...`). Each method returns `this`, except the terminal ones (`maybeSingle`, `.then`) which resolve the chain. Easier to read than to describe — the code below is self-contained.

Create `server/__tests__/mirror-jobs.test.js`:
```js
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  claimPendingJob,
  markStatus,
  markReady,
  markFailed,
  resetForRetry,
} = require('../mirror-jobs');

// ── Fake Supabase client ───────────────────────────────────────
function makeFakeDb(initialRows) {
  const rows = initialRows.map(r => ({ ...r }));
  const calls = { selects: [], updates: [] };

  function from(table) {
    assert.equal(table, 'content');
    return builder();
  }

  function builder() {
    const filters = [];
    const order = { column: null, ascending: true };
    let limit = null;
    let projection = null;
    let updatePayload = null;
    let mode = 'select';

    const api = {
      select(cols) { projection = cols; return api; },
      update(payload) { mode = 'update'; updatePayload = payload; return api; },
      eq(col, val) { filters.push({ col, op: 'eq', val }); return api; },
      lt(col, val) { filters.push({ col, op: 'lt', val }); return api; },
      order(col, opts) { order.column = col; order.ascending = !!opts?.ascending; return api; },
      limit(n) { limit = n; return api; },
      maybeSingle() { return execute().then(arr => ({ data: arr[0] ?? null, error: null })); },
    };

    function matches(row) {
      return filters.every(f => {
        if (f.op === 'eq') return row[f.col] === f.val;
        if (f.op === 'lt') return row[f.col] < f.val;
        return false;
      });
    }

    async function execute() {
      if (mode === 'select') {
        calls.selects.push({ filters: [...filters], order, limit, projection });
        let out = rows.filter(matches);
        if (order.column) {
          out = [...out].sort((a, b) =>
            order.ascending
              ? (a[order.column] > b[order.column] ? 1 : -1)
              : (a[order.column] < b[order.column] ? 1 : -1),
          );
        }
        if (limit) out = out.slice(0, limit);
        return out.map(r => ({ ...r }));
      }
      // update
      calls.updates.push({ filters: [...filters], payload: { ...updatePayload } });
      const updated = [];
      for (const row of rows) {
        if (matches(row)) {
          Object.assign(row, updatePayload);
          updated.push({ ...row });
        }
      }
      return updated;
    }

    return api;
  }

  return { client: { from }, rows, calls };
}

// ── claimPendingJob ────────────────────────────────────────────
test('claimPendingJob: selects oldest pending row, flips it to downloading', async () => {
  const { client, rows, calls } = makeFakeDb([
    { id: 'a', mirror_status: 'pending', mirror_attempts: 0, created_at: '2026-04-10', title_en: 'A',
      mirror_source_url: 'u-a', mirror_format: 'audio' },
    { id: 'b', mirror_status: 'pending', mirror_attempts: 0, created_at: '2026-04-09', title_en: 'B',
      mirror_source_url: 'u-b', mirror_format: 'audio' },
    { id: 'c', mirror_status: 'ready',   mirror_attempts: 0, created_at: '2026-04-08', title_en: 'C' },
  ]);

  const job = await claimPendingJob(client);

  assert.equal(job.id, 'b', 'picks oldest pending row');
  assert.equal(rows.find(r => r.id === 'b').mirror_status, 'downloading');
  assert.equal(rows.find(r => r.id === 'b').mirror_attempts, 1);
});

test('claimPendingJob: skips rows that already hit the attempt cap', async () => {
  const { client } = makeFakeDb([
    { id: 'burnt',  mirror_status: 'pending', mirror_attempts: 3, created_at: '2026-04-05', title_en: 'X' },
    { id: 'fresh',  mirror_status: 'pending', mirror_attempts: 0, created_at: '2026-04-06', title_en: 'Y',
      mirror_source_url: 'u-y', mirror_format: 'audio' },
  ]);
  const job = await claimPendingJob(client);
  assert.equal(job.id, 'fresh');
});

test('claimPendingJob: returns null when no pending rows', async () => {
  const { client } = makeFakeDb([
    { id: 'done', mirror_status: 'ready', mirror_attempts: 0, created_at: '2026-04-05', title_en: 'X' },
  ]);
  const job = await claimPendingJob(client);
  assert.equal(job, null);
});

// ── markStatus / markReady / markFailed / resetForRetry ───────
test('markStatus: updates status + updated_at', async () => {
  const { client, rows } = makeFakeDb([
    { id: 'x', mirror_status: 'downloading', mirror_updated_at: '2026-01-01' },
  ]);
  await markStatus(client, 'x', 'uploading');
  assert.equal(rows[0].mirror_status, 'uploading');
  assert.notEqual(rows[0].mirror_updated_at, '2026-01-01');
});

test('markReady: writes media_url + is_video + flips to ready', async () => {
  const { client, rows } = makeFakeDb([
    { id: 'x', mirror_status: 'uploading', media_url: '', is_video: false },
  ]);
  await markReady(client, 'x', 'https://archive.org/download/khanqah-yt-x/x.mp4', true);
  assert.equal(rows[0].mirror_status, 'ready');
  assert.equal(rows[0].media_url, 'https://archive.org/download/khanqah-yt-x/x.mp4');
  assert.equal(rows[0].is_video, true);
});

test('markFailed: records the error tail + flips to failed', async () => {
  const { client, rows } = makeFakeDb([
    { id: 'x', mirror_status: 'downloading' },
  ]);
  await markFailed(client, 'x', 'yt-dlp: Video unavailable');
  assert.equal(rows[0].mirror_status, 'failed');
  assert.equal(rows[0].mirror_error, 'yt-dlp: Video unavailable');
});

test('resetForRetry: flips failed back to pending and clears counters', async () => {
  const { client, rows } = makeFakeDb([
    { id: 'x', mirror_status: 'failed', mirror_attempts: 3, mirror_error: 'boom' },
  ]);
  await resetForRetry(client, 'x');
  assert.equal(rows[0].mirror_status, 'pending');
  assert.equal(rows[0].mirror_attempts, 0);
  assert.equal(rows[0].mirror_error, null);
});
```

- [ ] **Step 2: Run tests — expect failures**

Run:
```bash
cd server && npm test
```
Expected: all 7 tests fail (functions undefined).

- [ ] **Step 3: Implement the DB helpers**

Overwrite `server/mirror-jobs.js`:
```js
// Side-effecting jobs used by the mirror worker: Supabase reads/writes,
// yt-dlp execution, archive.org upload. Mockable dependencies are passed
// in so the worker tests can swap them out.

async function claimPendingJob(db) {
  // 1. Find the oldest pending row with attempts remaining
  const { data: row } = await db
    .from('content')
    .select('id, title_en, mirror_source_url, mirror_format, mirror_attempts')
    .eq('mirror_status', 'pending')
    .lt('mirror_attempts', 3)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!row) return null;

  // 2. Flip it to 'downloading' with a conditional update so two workers
  //    never double-claim a row. If the conditional update misses (row has
  //    already moved on) we just skip this poll cycle.
  const { data: claimed } = await db
    .from('content')
    .update({
      mirror_status: 'downloading',
      mirror_attempts: row.mirror_attempts + 1,
      mirror_updated_at: new Date().toISOString(),
    })
    .eq('id', row.id)
    .eq('mirror_status', 'pending')
    .select('id')
    .maybeSingle();

  return claimed ? row : null;
}

async function markStatus(db, id, status) {
  await db
    .from('content')
    .update({ mirror_status: status, mirror_updated_at: new Date().toISOString() })
    .eq('id', id);
}

async function markReady(db, id, mediaUrl, isVideo) {
  await db
    .from('content')
    .update({
      mirror_status: 'ready',
      media_url: mediaUrl,
      is_video: isVideo,
      mirror_updated_at: new Date().toISOString(),
    })
    .eq('id', id);
}

async function markFailed(db, id, errorMessage) {
  await db
    .from('content')
    .update({
      mirror_status: 'failed',
      mirror_error: errorMessage,
      mirror_updated_at: new Date().toISOString(),
    })
    .eq('id', id);
}

async function resetForRetry(db, id) {
  await db
    .from('content')
    .update({
      mirror_status: 'pending',
      mirror_attempts: 0,
      mirror_error: null,
      mirror_updated_at: new Date().toISOString(),
    })
    .eq('id', id);
}

module.exports = {
  claimPendingJob,
  markStatus,
  markReady,
  markFailed,
  resetForRetry,
};
```

- [ ] **Step 4: Run tests — expect all green**

Run:
```bash
cd server && npm test
```
Expected: `# pass 18`, no failures (11 from lib + 7 from jobs).

- [ ] **Step 5: Commit**

```bash
git add server/mirror-jobs.js server/__tests__/mirror-jobs.test.js
git commit -m "feat(mirror): add Supabase DB helpers (claim, markStatus, markReady, markFailed)"
```

---

## Task 5: YouTube download helper (TDD with injected `exec`)

**Files:**
- Modify: `server/mirror-jobs.js`
- Modify: `server/__tests__/mirror-jobs.test.js`

`downloadFromYouTube` shells out to `yt-dlp`. The shelling-out function is injected so the test uses a fake; real code passes `promisify(execFile)`.

- [ ] **Step 1: Write the failing tests — append to the existing file**

Append to `server/__tests__/mirror-jobs.test.js`:
```js
const { downloadFromYouTube } = require('../mirror-jobs');

function fakeExec(script) {
  // script receives (cmd, args, opts) and returns whatever the caller specifies
  return async (cmd, args, opts) => {
    const result = await script({ cmd, args, opts });
    return result;
  };
}

test('downloadFromYouTube: audio → yt-dlp -x mp3 args and expected path', async () => {
  const calls = [];
  const exec = fakeExec(async ({ cmd, args }) => {
    calls.push({ cmd, args });
    return { stdout: '', stderr: '' };
  });
  const fakeStat = async () => ({ size: 1234 });

  const result = await downloadFromYouTube({
    format: 'audio',
    id: 'abc',
    url: 'https://youtu.be/xyz',
    tempDir: '/tmp/mirror',
    exec,
    stat: fakeStat,
  });

  assert.equal(calls[0].cmd, 'yt-dlp');
  assert.ok(calls[0].args.includes('-x'));
  assert.ok(calls[0].args.includes('--audio-format'));
  assert.ok(calls[0].args.includes('mp3'));
  assert.ok(calls[0].args.includes('/tmp/mirror/abc.%(ext)s'));
  assert.equal(result.ext, 'mp3');
  assert.equal(result.filePath, '/tmp/mirror/abc.mp3');
});

test('downloadFromYouTube: video → yt-dlp mp4 args and expected path', async () => {
  const exec = fakeExec(async () => ({ stdout: '', stderr: '' }));
  const fakeStat = async () => ({ size: 5000 });

  const result = await downloadFromYouTube({
    format: 'video',
    id: 'vid',
    url: 'https://youtu.be/xyz',
    tempDir: '/tmp/mirror',
    exec,
    stat: fakeStat,
  });

  assert.equal(result.ext, 'mp4');
  assert.equal(result.filePath, '/tmp/mirror/vid.mp4');
});

test('downloadFromYouTube: yt-dlp error propagates with stderr preserved', async () => {
  const exec = fakeExec(async () => {
    const err = new Error('Command failed');
    err.stderr = 'ERROR: Video unavailable';
    throw err;
  });
  const fakeStat = async () => { throw new Error('should not be called'); };

  await assert.rejects(
    downloadFromYouTube({
      format: 'audio', id: 'dead', url: 'https://youtu.be/gone',
      tempDir: '/tmp/mirror', exec, stat: fakeStat,
    }),
    (err) => {
      assert.match(err.stderr, /Video unavailable/);
      return true;
    },
  );
});

test('downloadFromYouTube: missing output file throws', async () => {
  const exec = fakeExec(async () => ({ stdout: '', stderr: '' }));
  const fakeStat = async () => { const e = new Error('ENOENT'); e.code = 'ENOENT'; throw e; };

  await assert.rejects(
    downloadFromYouTube({
      format: 'audio', id: 'abc', url: 'url',
      tempDir: '/tmp/mirror', exec, stat: fakeStat,
    }),
    /ENOENT/,
  );
});
```

- [ ] **Step 2: Run tests — expect failures**

Run:
```bash
cd server && npm test
```
Expected: 4 new failures (`downloadFromYouTube is not a function`).

- [ ] **Step 3: Implement `downloadFromYouTube`**

Append to `server/mirror-jobs.js` (before the `module.exports`):
```js
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
const fs = require('node:fs/promises');
const { buildYtDlpArgs } = require('./mirror-lib');

const defaultExec = promisify(execFile);

async function downloadFromYouTube({
  format, id, url, tempDir,
  exec = defaultExec,
  stat = fs.stat,
}) {
  const outPathTemplate = `${tempDir}/${id}.%(ext)s`;
  const args = buildYtDlpArgs(format, outPathTemplate, url);

  // 256 MB stdout buffer is well above what yt-dlp prints even for chatty
  // progress output — prevents "stdout maxBuffer exceeded" on long downloads.
  await exec('yt-dlp', args, { maxBuffer: 256 * 1024 * 1024 });

  const ext = format === 'audio' ? 'mp3' : 'mp4';
  const filePath = `${tempDir}/${id}.${ext}`;
  await stat(filePath); // confirms the file actually exists post-download
  return { filePath, ext };
}
```

Replace the bottom `module.exports` with:
```js
module.exports = {
  claimPendingJob,
  markStatus,
  markReady,
  markFailed,
  resetForRetry,
  downloadFromYouTube,
};
```

- [ ] **Step 4: Run tests — expect all green**

Run:
```bash
cd server && npm test
```
Expected: `# pass 22`, no failures.

- [ ] **Step 5: Commit**

```bash
git add server/mirror-jobs.js server/__tests__/mirror-jobs.test.js
git commit -m "feat(mirror): add yt-dlp download helper with injected exec for testing"
```

---

## Task 6: archive.org upload helper (TDD with injected `fetch`)

**Files:**
- Modify: `server/mirror-jobs.js`
- Modify: `server/__tests__/mirror-jobs.test.js`

`uploadToArchive` streams the file to the IA S3 endpoint. `fetch` and `stat` are injected for tests.

- [ ] **Step 1: Write the failing tests — append**

Append to `server/__tests__/mirror-jobs.test.js`:
```js
const { uploadToArchive } = require('../mirror-jobs');

test('uploadToArchive: PUTs to the upload URL with the supplied headers and file body', async () => {
  const seen = {};
  const fakeFetch = async (url, init) => {
    seen.url = url;
    seen.method = init.method;
    seen.headers = init.headers;
    seen.hasBody = !!init.body;
    return { ok: true, status: 200, text: async () => '' };
  };
  const fakeStat = async () => ({ size: 42 });
  const fakeOpenStream = () => 'stream-sentinel';

  await uploadToArchive({
    filePath: '/tmp/mirror/abc.mp3',
    uploadUrl: 'http://s3.us.archive.org/khanqah-yt-abc/abc.mp3',
    headers: { authorization: 'LOW AK:SK', 'x-archive-meta-title': 'T' },
    fetch: fakeFetch,
    stat: fakeStat,
    openStream: fakeOpenStream,
  });

  assert.equal(seen.url, 'http://s3.us.archive.org/khanqah-yt-abc/abc.mp3');
  assert.equal(seen.method, 'PUT');
  assert.equal(seen.headers.authorization, 'LOW AK:SK');
  assert.equal(seen.headers['Content-Length'], '42');
  assert.equal(seen.headers['x-archive-meta-title'], 'T');
  assert.equal(seen.hasBody, true);
});

test('uploadToArchive: non-2xx response throws with status + body tail', async () => {
  const fakeFetch = async () => ({
    ok: false, status: 503, text: async () => 'rate limited, slow down',
  });
  const fakeStat = async () => ({ size: 1 });

  await assert.rejects(
    uploadToArchive({
      filePath: '/tmp/mirror/abc.mp3',
      uploadUrl: 'http://s3.us.archive.org/khanqah-yt-abc/abc.mp3',
      headers: {},
      fetch: fakeFetch,
      stat: fakeStat,
      openStream: () => 'stream',
    }),
    /archive upload 503.*rate limited/,
  );
});
```

- [ ] **Step 2: Run tests — expect failures**

Run:
```bash
cd server && npm test
```
Expected: 2 new failures (`uploadToArchive is not a function`).

- [ ] **Step 3: Implement `uploadToArchive`**

Append to `server/mirror-jobs.js` (before the `module.exports`):
```js
const { createReadStream } = require('node:fs');

async function uploadToArchive({
  filePath, uploadUrl, headers,
  fetch: fetchImpl = fetch,
  stat = fs.stat,
  openStream = (p) => createReadStream(p),
}) {
  const size = (await stat(filePath)).size;
  const res = await fetchImpl(uploadUrl, {
    method: 'PUT',
    headers: { ...headers, 'Content-Length': String(size) },
    body: openStream(filePath),
    // Node's undici requires this flag whenever the request body is a
    // streaming source and we want to start sending before the full body
    // is known — IA uploads happily consume a partial-send stream.
    duplex: 'half',
  });
  if (!res.ok) {
    const text = (await res.text().catch(() => '')).slice(0, 500);
    throw new Error(`archive upload ${res.status}: ${text}`);
  }
}
```

Replace `module.exports` with:
```js
module.exports = {
  claimPendingJob,
  markStatus,
  markReady,
  markFailed,
  resetForRetry,
  downloadFromYouTube,
  uploadToArchive,
};
```

- [ ] **Step 4: Run tests — expect all green**

Run:
```bash
cd server && npm test
```
Expected: `# pass 24`.

- [ ] **Step 5: Commit**

```bash
git add server/mirror-jobs.js server/__tests__/mirror-jobs.test.js
git commit -m "feat(mirror): add archive.org upload helper using fetch streaming"
```

---

## Task 7: Worker orchestration `processOne` (TDD happy + failure)

**Files:**
- Modify: `server/mirror-worker.js`
- Create: `server/__tests__/mirror-worker.test.js`

`processOne(deps)` runs one full cycle: claim → download → mark uploading → upload → mark ready OR mark failed. Everything that touches the outside world is injected through `deps` so the test uses fakes.

- [ ] **Step 1: Write the failing tests**

Create `server/__tests__/mirror-worker.test.js`:
```js
const test = require('node:test');
const assert = require('node:assert/strict');
const { processOne } = require('../mirror-worker');

// Reuse the same fake-db pattern from mirror-jobs.test.js but inline
// here so the files stay standalone (easier to read one at a time).
function makeFakeDb(initialRows) {
  const rows = initialRows.map(r => ({ ...r }));

  function from() { return builder(); }
  function builder() {
    const filters = [];
    const order = { column: null, ascending: true };
    let limit = null;
    let updatePayload = null;
    let mode = 'select';

    const api = {
      select() { return api; },
      update(p) { mode = 'update'; updatePayload = p; return api; },
      eq(col, val) { filters.push({ col, op: 'eq', val }); return api; },
      lt(col, val) { filters.push({ col, op: 'lt', val }); return api; },
      order(col, opts) { order.column = col; order.ascending = !!opts?.ascending; return api; },
      limit(n) { limit = n; return api; },
      maybeSingle() { return execute().then(arr => ({ data: arr[0] ?? null, error: null })); },
    };

    function matches(row) {
      return filters.every(f => {
        if (f.op === 'eq') return row[f.col] === f.val;
        if (f.op === 'lt') return row[f.col] < f.val;
        return false;
      });
    }

    async function execute() {
      if (mode === 'select') {
        let out = rows.filter(matches);
        if (order.column) {
          out = [...out].sort((a, b) =>
            order.ascending
              ? (a[order.column] > b[order.column] ? 1 : -1)
              : (a[order.column] < b[order.column] ? 1 : -1),
          );
        }
        if (limit) out = out.slice(0, limit);
        return out.map(r => ({ ...r }));
      }
      const updated = [];
      for (const row of rows) {
        if (matches(row)) {
          Object.assign(row, updatePayload);
          updated.push({ ...row });
        }
      }
      return updated;
    }

    return api;
  }

  return { client: { from }, rows };
}

function defaultDeps(overrides = {}) {
  const removedPaths = [];
  return {
    tempDir: '/tmp/mirror',
    iaAccessKey: 'AK',
    iaSecretKey: 'SK',
    exec: async () => ({ stdout: '', stderr: '' }),
    stat: async () => ({ size: 100 }),
    openStream: () => 'stream',
    fetch: async () => ({ ok: true, status: 200, text: async () => '' }),
    rm: async (p) => { removedPaths.push(p); },
    removedPaths,
    ...overrides,
  };
}

test('processOne: returns "idle" when no pending rows exist', async () => {
  const { client } = makeFakeDb([
    { id: 'a', mirror_status: 'ready', mirror_attempts: 0, created_at: '2026-04-10' },
  ]);
  const deps = defaultDeps();

  const result = await processOne({ db: client, ...deps });
  assert.equal(result, 'idle');
});

test('processOne: happy path audio → row ends at ready with archive URL and is_video=false', async () => {
  const { client, rows } = makeFakeDb([
    { id: 'abc', title_en: 'Test', mirror_status: 'pending', mirror_attempts: 0,
      mirror_source_url: 'https://youtu.be/xyz', mirror_format: 'audio',
      media_url: '', is_video: false, created_at: '2026-04-10' },
  ]);
  const deps = defaultDeps();

  const result = await processOne({ db: client, ...deps });

  assert.equal(result, 'done');
  const row = rows[0];
  assert.equal(row.mirror_status, 'ready');
  assert.equal(row.media_url, 'https://archive.org/download/khanqah-yt-abc/abc.mp3');
  assert.equal(row.is_video, false);
  assert.deepEqual(deps.removedPaths, ['/tmp/mirror/abc.mp3']);
});

test('processOne: happy path video → is_video flipped to true, mp4 URL', async () => {
  const { client, rows } = makeFakeDb([
    { id: 'vid', title_en: 'Clip', mirror_status: 'pending', mirror_attempts: 0,
      mirror_source_url: 'https://youtu.be/xyz', mirror_format: 'video',
      media_url: '', is_video: false, created_at: '2026-04-10' },
  ]);
  const deps = defaultDeps();

  await processOne({ db: client, ...deps });

  const row = rows[0];
  assert.equal(row.mirror_status, 'ready');
  assert.equal(row.media_url, 'https://archive.org/download/khanqah-yt-vid/vid.mp4');
  assert.equal(row.is_video, true);
});

test('processOne: yt-dlp failure → row lands on failed with error tail, attempts incremented', async () => {
  const { client, rows } = makeFakeDb([
    { id: 'x', title_en: 'T', mirror_status: 'pending', mirror_attempts: 0,
      mirror_source_url: 'u', mirror_format: 'audio', created_at: '2026-04-10' },
  ]);
  const deps = defaultDeps({
    exec: async () => {
      const err = new Error('Command failed');
      err.stderr = 'ERROR: Video unavailable';
      throw err;
    },
  });

  const result = await processOne({ db: client, ...deps });

  assert.equal(result, 'failed');
  assert.equal(rows[0].mirror_status, 'failed');
  assert.equal(rows[0].mirror_attempts, 1);
  assert.match(rows[0].mirror_error, /Video unavailable/);
});

test('processOne: archive upload failure → failed + attempts incremented, temp file still cleaned', async () => {
  const { client, rows } = makeFakeDb([
    { id: 'x', title_en: 'T', mirror_status: 'pending', mirror_attempts: 0,
      mirror_source_url: 'u', mirror_format: 'audio', created_at: '2026-04-10' },
  ]);
  const deps = defaultDeps({
    fetch: async () => ({ ok: false, status: 503, text: async () => 'rate limited' }),
  });

  await processOne({ db: client, ...deps });

  assert.equal(rows[0].mirror_status, 'failed');
  assert.match(rows[0].mirror_error, /archive upload 503/);
  assert.deepEqual(deps.removedPaths, ['/tmp/mirror/x.mp3']);
});

test('processOne: after 3 failed attempts the row stops being claimable', async () => {
  const { client, rows } = makeFakeDb([
    { id: 'x', title_en: 'T', mirror_status: 'pending', mirror_attempts: 3,
      mirror_source_url: 'u', mirror_format: 'audio', created_at: '2026-04-10' },
  ]);
  const deps = defaultDeps();

  const result = await processOne({ db: client, ...deps });

  assert.equal(result, 'idle');
  assert.equal(rows[0].mirror_status, 'pending'); // untouched
});
```

- [ ] **Step 2: Run tests — expect failures**

Run:
```bash
cd server && npm test
```
Expected: 6 new failures (`processOne is not a function`).

- [ ] **Step 3: Implement `processOne` + main loop**

Overwrite `server/mirror-worker.js`:
```js
// Entry point: polls Supabase for pending mirror jobs and processes them
// one at a time. Run by systemd as khanqah-mirror.service.

const {
  claimPendingJob,
  markStatus,
  markReady,
  markFailed,
  downloadFromYouTube,
  uploadToArchive,
} = require('./mirror-jobs');

const {
  buildArchiveIdentifier,
  buildArchiveDownloadUrl,
  buildArchiveUploadUrl,
  buildArchiveHeaders,
  tailStderr,
} = require('./mirror-lib');

async function processOne({
  db, tempDir, iaAccessKey, iaSecretKey,
  exec, stat, openStream, fetch, rm,
}) {
  const job = await claimPendingJob(db);
  if (!job) return 'idle';

  let filePath = null;
  try {
    const dl = await downloadFromYouTube({
      format: job.mirror_format,
      id: job.id,
      url: job.mirror_source_url,
      tempDir,
      exec,
      stat,
    });
    filePath = dl.filePath;

    await markStatus(db, job.id, 'uploading');

    const identifier = buildArchiveIdentifier(job.id);
    const filename = `${job.id}.${dl.ext}`;
    await uploadToArchive({
      filePath,
      uploadUrl: buildArchiveUploadUrl(identifier, filename),
      headers: buildArchiveHeaders({
        format: job.mirror_format,
        title: job.title_en,
        accessKey: iaAccessKey,
        secretKey: iaSecretKey,
      }),
      fetch,
      stat,
      openStream,
    });

    await markReady(
      db,
      job.id,
      buildArchiveDownloadUrl(identifier, filename),
      job.mirror_format === 'video',
    );
    return 'done';
  } catch (err) {
    const message = tailStderr(err.stderr || err.message || String(err));
    await markFailed(db, job.id, message);
    return 'failed';
  } finally {
    if (filePath) await rm(filePath).catch(() => {});
  }
}

module.exports = { processOne };

// ── Entry point (only runs when invoked directly, not when required in tests)
if (require.main === module) {
  const { createClient } = require('@supabase/supabase-js');
  const { execFile } = require('node:child_process');
  const { promisify } = require('node:util');
  const fs = require('node:fs/promises');
  const { createReadStream } = require('node:fs');

  const {
    SUPABASE_URL, SUPABASE_SERVICE_KEY,
    IA_ACCESS_KEY, IA_SECRET_KEY,
  } = process.env;

  for (const [k, v] of Object.entries({
    SUPABASE_URL, SUPABASE_SERVICE_KEY, IA_ACCESS_KEY, IA_SECRET_KEY,
  })) {
    if (!v) { console.error(`[mirror] missing env: ${k}`); process.exit(1); }
  }

  const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false },
  });

  const deps = {
    db,
    tempDir: '/tmp/mirror',
    iaAccessKey: IA_ACCESS_KEY,
    iaSecretKey: IA_SECRET_KEY,
    exec: promisify(execFile),
    stat: fs.stat,
    openStream: (p) => createReadStream(p),
    fetch: (...a) => fetch(...a),
    rm: (p) => fs.rm(p, { force: true }),
  };

  (async () => {
    await fs.mkdir('/tmp/mirror', { recursive: true });
    console.log('[mirror] worker started');
    while (true) {
      try {
        const result = await processOne(deps);
        if (result !== 'idle') console.log(`[mirror] ${result}`);
      } catch (err) {
        console.error('[mirror] loop error:', err);
      }
      await new Promise(r => setTimeout(r, 30_000));
    }
  })();
}
```

- [ ] **Step 4: Run tests — expect all green**

Run:
```bash
cd server && npm test
```
Expected: `# pass 30`, no failures.

- [ ] **Step 5: Commit**

```bash
git add server/mirror-worker.js server/__tests__/mirror-worker.test.js
git commit -m "feat(mirror): add processOne orchestration with happy + failure paths"
```

---

## Task 8: Systemd unit + deploy.sh

**Files:**
- Create: `server/khanqah-mirror.service`
- Modify: `server/deploy.sh`

- [ ] **Step 1: Write the systemd unit**

Create `server/khanqah-mirror.service`:
```ini
[Unit]
Description=Khanqah YouTube → archive.org mirror worker
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
WorkingDirectory=/opt/khanqah
EnvironmentFile=/opt/khanqah/.env
ExecStart=/usr/bin/node /opt/khanqah/mirror-worker.js
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

- [ ] **Step 2: Extend `deploy.sh`**

Open `server/deploy.sh` and locate the block that installs packages:
```bash
apt-get install -y nginx libnginx-mod-rtmp ffmpeg curl
```

Replace it with:
```bash
apt-get install -y nginx libnginx-mod-rtmp ffmpeg curl yt-dlp
```

Locate the block that copies helper scripts (`cp record-and-upload.sh ...`). Append below it:
```bash
# Mirror worker: copy sources, install deps, enable systemd unit.
cp mirror-worker.js /opt/khanqah/mirror-worker.js
cp mirror-jobs.js   /opt/khanqah/mirror-jobs.js
cp mirror-lib.js    /opt/khanqah/mirror-lib.js
cp package.json     /opt/khanqah/package.json
(cd /opt/khanqah && npm install --omit=dev --no-audit --no-fund)

cp khanqah-mirror.service /etc/systemd/system/khanqah-mirror.service
systemctl daemon-reload
systemctl enable --now khanqah-mirror
```

Locate the final `echo` block and append:
```bash
echo "Mirror worker:   systemctl status khanqah-mirror"
echo "Mirror logs:     journalctl -u khanqah-mirror -f"
```

- [ ] **Step 3: Local syntax check of the shell script**

Run:
```bash
bash -n server/deploy.sh
```
Expected: no output (valid syntax).

- [ ] **Step 4: Deploy to the DO server manually**

Run from your workstation:
```bash
scp server/deploy.sh server/mirror-worker.js server/mirror-jobs.js \
    server/mirror-lib.js server/package.json server/khanqah-mirror.service \
    root@165.22.208.103:/root/khanqah-deploy/
ssh root@165.22.208.103 "cd /root/khanqah-deploy && bash deploy.sh"
```
Expected: command finishes without errors; the final echo block mentions the mirror worker.

- [ ] **Step 5: Verify the worker is running**

Run on the server:
```bash
ssh root@165.22.208.103 "systemctl status khanqah-mirror --no-pager"
```
Expected: `Active: active (running)`. Also tail one poll cycle:
```bash
ssh root@165.22.208.103 "journalctl -u khanqah-mirror -n 20 --no-pager"
```
Expected: `[mirror] worker started` then periodic silent polls (no "job result" lines because no pending rows exist yet).

- [ ] **Step 6: Commit**

```bash
git add server/khanqah-mirror.service server/deploy.sh
git commit -m "feat(server): systemd unit + deploy.sh install for khanqah-mirror"
```

---

## Task 9: Type additions in `lib/types.ts`

**Files:**
- Modify: `lib/types.ts`

- [ ] **Step 1: Locate the existing `Content` type**

Run:
```bash
grep -n "export interface Content\|export type Content" lib/types.ts
```
Expected: a line number pointing at the `Content` interface.

- [ ] **Step 2: Add the mirror types and extend `Content`**

Open `lib/types.ts` and add these types near the other string-literal unions (ideally right before `export interface Content`):

```ts
export type MirrorStatus =
  | 'pending'
  | 'downloading'
  | 'uploading'
  | 'ready'
  | 'failed'
  | 'not_applicable';

export type MirrorFormat = 'audio' | 'video';
```

Inside `Content`, right after `updated_at: string;`, add:

```ts
  mirror_status: MirrorStatus;
  mirror_format: MirrorFormat | null;
  mirror_source_url: string | null;
  mirror_error: string | null;
  mirror_attempts: number;
  mirror_updated_at: string;
```

- [ ] **Step 3: Type-check**

Run:
```bash
npx tsc --noEmit
```
Expected: no output (clean).

- [ ] **Step 4: Commit**

```bash
git add lib/types.ts
git commit -m "feat(types): add MirrorStatus/MirrorFormat and extend Content"
```

---

## Task 10: `MirrorStatusChip` component

**Files:**
- Create: `components/MirrorStatusChip.tsx`

- [ ] **Step 1: Write the component**

Create `components/MirrorStatusChip.tsx`:
```tsx
import React from 'react';
import { Text, TouchableOpacity, View, StyleSheet } from 'react-native';
import { useTheme } from '../providers/ThemeProvider';
import type { MirrorStatus } from '../lib/types';

interface Props {
  status: MirrorStatus;
  onRetryPress?: () => void;
}

export function MirrorStatusChip({ status, onRetryPress }: Props) {
  const { theme } = useTheme();
  const c = theme.colors;

  if (status === 'not_applicable' || status === 'ready') return null;

  let label = '';
  let bg = '';
  let fg = '';
  switch (status) {
    case 'pending':
      label = 'QUEUED';
      bg = 'rgba(120, 120, 120, 0.15)';
      fg = c.textMuted;
      break;
    case 'downloading':
    case 'uploading':
      label = 'MIRRORING…';
      bg = 'rgba(212, 168, 83, 0.18)';
      fg = c.accent;
      break;
    case 'failed':
      label = 'FAILED — RETRY';
      bg = 'rgba(194, 62, 62, 0.15)';
      fg = c.liveRed;
      break;
  }

  const chip = (
    <View style={[styles.chip, { backgroundColor: bg }]}>
      <Text style={[styles.label, { color: fg }]}>{label}</Text>
    </View>
  );

  if (status === 'failed' && onRetryPress) {
    return (
      <TouchableOpacity onPress={onRetryPress} activeOpacity={0.7}>
        {chip}
      </TouchableOpacity>
    );
  }
  return chip;
}

const styles = StyleSheet.create({
  chip: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    marginTop: 4,
  },
  label: {
    fontFamily: 'DMSans-SemiBold',
    fontSize: 10,
    letterSpacing: 1.2,
  },
});
```

- [ ] **Step 2: Type-check**

Run:
```bash
npx tsc --noEmit
```
Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add components/MirrorStatusChip.tsx
git commit -m "feat(admin): add MirrorStatusChip component"
```

---

## Task 11: Upload form — YouTube detection + format toggle + new insert

**Files:**
- Modify: `app/admin/upload.tsx`

- [ ] **Step 1: Locate the state block**

Run:
```bash
grep -n "const \[selectedType" app/admin/upload.tsx
```
Expected: a line showing the existing `selectedType` state declaration.

- [ ] **Step 2: Add a format toggle state + helper**

In `app/admin/upload.tsx`, near the other `useState` declarations:
```tsx
import type { MirrorFormat } from '../../lib/types';

// ... inside the component body, with the other useState calls:
const [mirrorFormat, setMirrorFormat] = useState<MirrorFormat>('audio');
```

Add a helper near the top of the file (outside the component), reusing the existing import if present, else import from `../../components/YouTubeEmbed`:
```tsx
import { isYouTubeUrl } from '../../components/YouTubeEmbed';
```

Inside the component body, just after the existing `isYouTubeUrl(mediaUrl)` / `isVideo` usage (or before it if none exists yet), derive:
```tsx
const isYouTube = isYouTubeUrl(mediaUrl.trim());

// Default the toggle whenever the content type changes so clips prefer Video
// and everything else prefers Audio. Users can still override.
useEffect(() => {
  setMirrorFormat(selectedType === 'clip' ? 'video' : 'audio');
}, [selectedType]);
```

Make sure `useEffect` is imported from React.

- [ ] **Step 3: Render the toggle when the URL is YouTube**

Find the existing media-URL `<TextInput>` block. Immediately below it, add:
```tsx
{isYouTube && (
  <View style={styles.formatToggleRow}>
    <Text style={styles.formatLabel}>SAVE AS</Text>
    <View style={styles.formatPills}>
      {(['audio', 'video'] as MirrorFormat[]).map((f) => {
        const isActive = mirrorFormat === f;
        return (
          <TouchableOpacity
            key={f}
            onPress={() => setMirrorFormat(f)}
            style={[
              styles.formatPill,
              { borderColor: c.border, backgroundColor: isActive ? c.primary : 'transparent' },
            ]}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.formatPillLabel,
                { color: isActive ? c.onPrimary : c.textMuted },
              ]}
            >
              {f.toUpperCase()}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  </View>
)}
```

Add the supporting styles inside the `StyleSheet.create({ ... })` block:
```tsx
formatToggleRow: {
  marginTop: 20,
  gap: 8,
},
formatLabel: {
  fontFamily: 'DMSans-Medium',
  fontSize: 10,
  letterSpacing: 1.5,
  color: '#8a7d66',
},
formatPills: {
  flexDirection: 'row',
  gap: 8,
},
formatPill: {
  paddingHorizontal: 14,
  paddingVertical: 6,
  borderRadius: 100,
  borderWidth: 1,
},
formatPillLabel: {
  fontFamily: 'DMSans-SemiBold',
  fontSize: 11,
  letterSpacing: 1,
},
```

- [ ] **Step 4: Change the insert payload**

Find the `handlePublish` function (or however the insert is currently wired) and the `.insert({...})` call on `content`. Replace it so YouTube URLs insert empty `media_url` plus mirror fields:
```tsx
const isYouTubeSubmit = isYouTubeUrl(mediaUrl.trim());

const payload: Record<string, any> = {
  title_en: titleEn.trim(),
  title_ur: titleUr.trim(),
  type: selectedType,
  category_id: selectedCategory.id,
  thumbnail_url: thumbnailUrl.trim() || null,
  description_en: null,
  description_ur: null,
  duration: null,
  file_size: null,
  uploaded_by: user?.id ?? '',
};

if (isYouTubeSubmit) {
  payload.media_url         = '';
  payload.mirror_source_url = mediaUrl.trim();
  payload.mirror_status     = 'pending';
  payload.mirror_format     = mirrorFormat;
  payload.is_video          = mirrorFormat === 'video';
} else {
  payload.media_url         = mediaUrl.trim();
  payload.mirror_status     = 'not_applicable';
  payload.is_video          = selectedType === 'clip';
}

const { error } = await supabase.from('content').insert(payload);
```

If the file uses Alert on success, update the copy:
```tsx
Alert.alert(
  'Queued',
  isYouTubeSubmit
    ? 'YouTube mirror queued — it usually takes 5–15 minutes.'
    : 'Content published successfully!',
  [{ text: 'OK', onPress: () => { /* existing reset logic */ } }],
);
```

- [ ] **Step 5: Type-check**

Run:
```bash
npx tsc --noEmit
```
Expected: no output.

- [ ] **Step 6: Smoke-test the form locally**

Run:
```bash
npx expo start --web
```

Open the admin upload page, type title + Urdu title, paste a YouTube URL. Expected:
- The `SAVE AS` toggle appears with `Audio`/`Video` pills.
- The pill default matches content type (`clip` → Video; anything else → Audio).
- Submitting inserts a row in Supabase with `mirror_status = 'pending'`, `mirror_source_url = <url>`, `media_url = ''`.

Then paste an archive.org URL and submit. Expected: row has `mirror_status = 'not_applicable'` and `media_url` set normally.

Verify via the Supabase Studio `content` table.

- [ ] **Step 7: Commit**

```bash
git add app/admin/upload.tsx
git commit -m "feat(admin): route YouTube uploads through the mirror pipeline"
```

---

## Task 12: Manage-content — render mirror status chip

**Files:**
- Modify: `app/admin/manage-content.tsx`

- [ ] **Step 1: Import the chip and the supabase client**

At the top of `app/admin/manage-content.tsx`, add:
```tsx
import { MirrorStatusChip } from '../../components/MirrorStatusChip';
```

Make sure `supabase` is already imported (`import { supabase } from '../../lib/supabase'`).

- [ ] **Step 2: Locate the row renderer**

Run:
```bash
grep -n "renderItem\|listItem\|content\.title_en" app/admin/manage-content.tsx
```
Expected: a row-render function (e.g. returning a `<View>` or `<TouchableOpacity>` with `title_en` inside).

- [ ] **Step 3: Render the chip under the title**

Inside the row-render function, just below the title `<Text>`, add:
```tsx
<MirrorStatusChip
  status={item.mirror_status}
  onRetryPress={
    item.mirror_status === 'failed'
      ? () => setFailedRow(item)
      : undefined
  }
/>
```

Above the component, introduce `failedRow` state:
```tsx
const [failedRow, setFailedRow] = useState<Content | null>(null);
```

- [ ] **Step 4: Type-check**

Run:
```bash
npx tsc --noEmit
```
Expected: no output.

- [ ] **Step 5: Smoke-test locally**

Run:
```bash
npx expo start --web
```

On the admin manage-content screen, confirm:
- Rows with `mirror_status = 'not_applicable'` show no chip (existing direct-upload content looks unchanged).
- The pending/mirroring/failed rows inserted via Task 11's smoke test show the appropriate chip. (If you don't have a live worker yet, insert a test row manually via Studio with `mirror_status = 'pending'` to verify the chip renders.)

- [ ] **Step 6: Commit**

```bash
git add app/admin/manage-content.tsx
git commit -m "feat(admin): show MirrorStatusChip on each content row"
```

---

## Task 13: Manage-content — retry-failed bottom sheet

**Files:**
- Modify: `app/admin/manage-content.tsx`

- [ ] **Step 1: Render a Modal with the error + RETRY button**

Below the main list (sibling to the `FlatList` / `ScrollView`) in `app/admin/manage-content.tsx`:
```tsx
<Modal
  visible={!!failedRow}
  transparent
  animationType="slide"
  onRequestClose={() => setFailedRow(null)}
>
  <View style={styles.modalOverlay}>
    <View style={[styles.modalSheet, { backgroundColor: c.surface }]}>
      <Text style={[styles.modalTitle, { color: c.text }]}>Mirror failed</Text>
      <Text style={[styles.modalMessage, { color: c.textMuted }]}>
        {failedRow?.mirror_error ?? 'Unknown error'}
      </Text>
      <View style={styles.modalButtons}>
        <TouchableOpacity
          style={[styles.modalBtn]}
          onPress={() => setFailedRow(null)}
        >
          <Text style={[styles.modalBtnText, { color: c.textMuted }]}>CANCEL</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.modalBtn]}
          onPress={async () => {
            if (!failedRow) return;
            await supabase
              .from('content')
              .update({
                mirror_status: 'pending',
                mirror_attempts: 0,
                mirror_error: null,
                mirror_updated_at: new Date().toISOString(),
              })
              .eq('id', failedRow.id);
            setFailedRow(null);
          }}
        >
          <Text style={[styles.modalBtnText, { color: c.primary }]}>RETRY</Text>
        </TouchableOpacity>
      </View>
    </View>
  </View>
</Modal>
```

Make sure `Modal` is in the `react-native` import.

Add supporting styles:
```tsx
modalOverlay: {
  flex: 1,
  backgroundColor: 'rgba(0,0,0,0.5)',
  justifyContent: 'flex-end',
},
modalSheet: {
  borderTopLeftRadius: 18,
  borderTopRightRadius: 18,
  padding: 24,
  paddingBottom: 36,
  gap: 12,
},
modalTitle: {
  fontFamily: 'CrimsonPro-SemiBold',
  fontSize: 20,
},
modalMessage: {
  fontFamily: 'DMSans',
  fontSize: 13,
  lineHeight: 18,
},
modalButtons: {
  flexDirection: 'row',
  justifyContent: 'flex-end',
  gap: 24,
  marginTop: 8,
},
modalBtn: {
  paddingVertical: 8,
  paddingHorizontal: 4,
},
modalBtnText: {
  fontFamily: 'DMSans-SemiBold',
  fontSize: 12,
  letterSpacing: 1.5,
},
```

- [ ] **Step 2: Type-check**

Run:
```bash
npx tsc --noEmit
```
Expected: no output.

- [ ] **Step 3: Smoke-test locally**

In Supabase Studio, insert one synthetic failed row:
```sql
UPDATE public.content
SET mirror_status = 'failed',
    mirror_error  = 'test error: yt-dlp: Video unavailable',
    mirror_source_url = 'https://youtu.be/abc',
    mirror_format = 'audio'
WHERE id = <pick a test row id>;
```

Run:
```bash
npx expo start --web
```

On manage-content:
- The row shows `FAILED — RETRY`.
- Tapping it opens the sheet with the error text.
- Tapping `RETRY` closes the sheet and the row chip becomes `QUEUED`.

- [ ] **Step 4: Commit**

```bash
git add app/admin/manage-content.tsx
git commit -m "feat(admin): retry-failed sheet for mirror jobs"
```

---

## Task 14: End-to-end test on staging

**Files:**
- None (manual verification)

- [ ] **Step 1: Apply migration to staging Supabase**

Apply `supabase/migrations/005_yt_mirror.sql` to the staging project via Studio SQL editor. Confirm existing rows land in `mirror_status = 'not_applicable'`.

- [ ] **Step 2: Redeploy the DO server**

From the workstation:
```bash
ssh root@165.22.208.103 'mkdir -p /root/khanqah-deploy'
scp server/deploy.sh server/mirror-worker.js server/mirror-jobs.js \
    server/mirror-lib.js server/package.json server/khanqah-mirror.service \
    root@165.22.208.103:/root/khanqah-deploy/
ssh root@165.22.208.103 'cd /root/khanqah-deploy && bash deploy.sh'
ssh root@165.22.208.103 'systemctl status khanqah-mirror --no-pager'
```
Expected final line: `Active: active (running)`.

- [ ] **Step 3: End-to-end upload**

Pick a short (<2 min) public YouTube video. In the admin upload form:
- Title, Urdu title, category: anything.
- URL: paste the YouTube link.
- Save as: Audio.

Submit. Expected: the "Queued" alert fires.

- [ ] **Step 4: Observe DB transitions**

Open Supabase Studio → `content`. Refresh periodically. Expected sequence over the next 5–15 min:
- `mirror_status = 'pending'`
- → `downloading` (within 30 s)
- → `uploading` (once yt-dlp finishes)
- → `ready`, `media_url = https://archive.org/download/khanqah-yt-<id>/<id>.mp3`

Tail the worker log:
```bash
ssh root@165.22.208.103 'journalctl -u khanqah-mirror -f'
```
Expected: `[mirror] done` at the end of the cycle.

- [ ] **Step 5: Play it back in the app**

Open the public app. The new row should appear in the "Recent bayans" (or equivalent) list once `mirror_status = 'ready'`. Play it. Expected: plays through the existing HTML5 `<audio>` path — no iframe, scrubber + speed controls work.

- [ ] **Step 6: RLS check**

In the Studio SQL editor, run as anonymous / public user:
```sql
SET LOCAL role TO anon;
SELECT id, title_en, mirror_status
FROM public.content
WHERE id = '<the row you just mirrored>';
RESET role;
```
Expected: 1 row (`ready`). While the mirror is still in `pending`/`downloading`/`uploading`, the same query returns 0 rows.

- [ ] **Step 7: Force a failure and retry**

Upload another row with an intentionally broken URL (e.g. `https://youtu.be/this-video-does-not-exist-xyz`). Expected: row flips `pending → downloading → failed` with an error message visible in manage-content. Click the chip → sheet shows the `yt-dlp` error → RETRY flips it back to `pending`. (The retry will fail again after ~30 s, which is the correct behaviour; after 3 attempts it stops retrying automatically.)

- [ ] **Step 8: Nothing to commit**

If everything above passed, the plan is complete — no further code changes.

---

## Spec coverage checklist

| Spec §                                    | Task(s)       |
|-------------------------------------------|---------------|
| §3 Architecture (polling, Supabase queue) | 7             |
| §4 Data model (enums, columns, backfill)  | 1             |
| §5 Worker loop                            | 3–7           |
| §5 Failure path                           | 7             |
| §5 Concurrency (single-flight)            | 4 (`claimPendingJob`), 7 |
| §5 Deployment                             | 8             |
| §6 Upload form                            | 11            |
| §6 Manage-content chip                    | 12            |
| §6 Retry-failed sheet                     | 13            |
| §7 RLS                                    | 1             |
| §8 Worker unit tests                      | 3–7           |
| §8 Migration test                         | 1             |
| §8 Manual end-to-end                      | 14            |
| §8 RLS test                               | 1, 14         |
