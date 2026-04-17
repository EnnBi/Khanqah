# YouTube → archive.org Mirror Pipeline — Design

**Status:** Design approved · ready for implementation plan
**Date:** 2026-04-17

## 1. Problem

The admin upload form currently accepts any media URL, including YouTube. YouTube URLs cannot be played by the HTML5 `<audio>` element on web, so the player falls back to an embedded YouTube `<iframe>`. This fork is undesirable for three reasons:

- Two playback code paths to maintain (native/web `<audio>` vs. iframe).
- No offline download, no speed control, no scrubber for YouTube-hosted content.
- If a YouTube video is deleted/geo-blocked/age-gated, the content disappears from the app with no fallback.

We already mirror live-stream recordings to archive.org from the same DO server (see `server/record-and-upload.sh`). Extending the same pattern to YouTube uploads unifies playback: every public row in `content` points at an archive.org URL the player can stream natively.

## 2. Scope

- **In scope:** new uploads only. Admin pastes a YouTube URL on the upload form → server mirrors the file to archive.org → DB row gets the archive URL.
- **Out of scope:** migrating existing YouTube rows already in `content`. They keep their current behaviour (iframe on web, `Linking.openURL` on native). If the admin wants to mirror an existing row, they can delete it and re-upload via the new flow.
- **Out of scope:** any content that is not YouTube. Non-YouTube URLs continue to be stored directly in `media_url` with `mirror_status = 'not_applicable'`.

## 3. Architecture

```
┌─────────────┐   1. Insert row                ┌─────────────┐
│ Admin form  │ ─────────────────────────────► │  Supabase   │
│  (web/app)  │    media_url=''                │  `content`  │
│             │    mirror_status='pending'     │             │
│             │    mirror_source_url=<yt>      │             │
└─────────────┘                                └──────┬──────┘
                                                      │ 2. Poll every 30s
                                                      ▼
                                               ┌─────────────┐
                                               │  DO server  │
                                               │   worker    │
                                               │  (Node +    │
                                               │  systemd)   │
                                               └──────┬──────┘
                                    ┌─────────────────┼─────────────────┐
                                    ▼                 ▼                 ▼
                                yt-dlp          ffmpeg (audio)      curl → IA S3
                                                                         │
                                                      4. PATCH row       │
                                               mirror_status='ready' ◄───┘
                                               media_url=<archive URL>
```

**Key design decision:** Supabase *is* the job queue. No webhook, no new HTTP endpoint. The DO server polls `content` for `mirror_status = 'pending'` rows and processes them one at a time. The admin UI reads the same row and renders state from `mirror_status`.

### Why polling, not webhooks

- No new HTTPS endpoint / signature verification / rate limiting to stand up on the DO server.
- 30s latency is invisible next to 5–15 min job durations.
- Supabase webhook configuration is an extra piece of infrastructure to manage; polling is a single Node script.
- Retries are trivial — a worker restart just re-enters the same loop.

### Why Node, not a bash extension of `record-and-upload.sh`

- Heartbeats, 3-retry accounting, structured error capture, and JSON handling are cleaner in ~150 lines of Node than in shell.
- Reuses the `@supabase/supabase-js` service-role client pattern already in the project.
- Keeps bash for the single thing bash is good at in this system — nginx-rtmp hook scripts.

## 4. Data Model

Migration `005_yt_mirror.sql` adds the following columns to `content`:

| Column              | Type          | Default           | Notes                                       |
|---------------------|---------------|-------------------|---------------------------------------------|
| `mirror_status`     | enum          | `'not_applicable'`| pending · downloading · uploading · ready · failed · not_applicable |
| `mirror_format`     | enum          | `null`            | audio · video — set at insert time for YouTube uploads |
| `mirror_source_url` | text          | `null`            | the original YouTube URL; kept for debugging + re-runs |
| `mirror_error`      | text          | `null`            | last error message (stderr tail) on failure |
| `mirror_attempts`   | int           | `0`               | incremented by worker; capped at 3          |
| `mirror_updated_at` | timestamptz   | `now()`           | worker heartbeat — helps detect stuck jobs  |

**Backfill:** the migration sets `mirror_status = 'not_applicable'` on every existing row. Those rows behave identically to today.

**`media_url` stays canonical.** The player reads only `media_url`. While `mirror_status != 'ready'` it is empty; when the worker finishes it is the archive.org URL.

**Enum definitions:**

```sql
CREATE TYPE mirror_status_t AS ENUM
  ('pending', 'downloading', 'uploading', 'ready', 'failed', 'not_applicable');

CREATE TYPE mirror_format_t AS ENUM ('audio', 'video');
```

## 5. Worker

**Location:** `/opt/khanqah/mirror-worker.js` on the DO server, supervised by `systemd` unit `khanqah-mirror.service`.
**Dependencies:** `yt-dlp` (apt), `ffmpeg` (already installed), `curl` (already installed), `@supabase/supabase-js`.
**Env:** reuses `/opt/khanqah/.env` — `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `IA_ACCESS_KEY`, `IA_SECRET_KEY`.

### Loop (every 30 s)

1. `SELECT one row FROM content WHERE mirror_status = 'pending' AND mirror_attempts < 3 ORDER BY created_at LIMIT 1`.
2. `UPDATE content SET mirror_status = 'downloading', mirror_attempts = mirror_attempts + 1, mirror_updated_at = now() WHERE id = $1 AND mirror_status = 'pending'`. If 0 rows affected, the row was claimed elsewhere/cancelled — skip and loop.
3. Shell out to `yt-dlp`:
   - audio: `yt-dlp -x --audio-format mp3 --audio-quality 128K -o /tmp/mirror/<id>.%(ext)s <url>`
   - video: `yt-dlp -f 'bv*[height<=720]+ba/b[height<=720]' --merge-output-format mp4 -o /tmp/mirror/<id>.%(ext)s <url>`
4. `UPDATE ... mirror_status = 'uploading', mirror_updated_at = now()`.
5. `curl --upload-file /tmp/mirror/<id>.<ext> http://s3.us.archive.org/khanqah-yt-<id>/<id>.<ext>` with the same header set as `record-and-upload.sh` (`x-amz-auto-make-bucket:1`, `x-archive-meta-collection:opensource_audio` for audio or `opensource_movies` for video, `x-archive-meta-mediatype:audio|movies`, `x-archive-meta-title:<title_en>`, `authorization: LOW <key>:<secret>`).
6. `UPDATE content SET mirror_status = 'ready', media_url = 'https://archive.org/download/khanqah-yt-<id>/<id>.<ext>', is_video = <format==='video'>, mirror_updated_at = now() WHERE id = $1`.
7. `rm -f /tmp/mirror/<id>.*`.

### Failure path

Any step throws → catch → `UPDATE content SET mirror_status = 'failed', mirror_error = <stderr tail, first 2000 chars>, mirror_updated_at = now() WHERE id = $1`. Local temp files are still cleaned. The loop continues with the next row.

After 3 attempts the row stays `failed` until an admin manually retries it from the manage-content UI (button flips `mirror_status` back to `pending` and resets `mirror_attempts = 0`, `mirror_error = null`).

### Concurrency

One job at a time. `yt-dlp` download + IA upload are both bandwidth + disk heavy; parallelism would just swap back and forth without speed gain and risks running `/tmp` out of space on a cheap droplet. Serialisation also removes any need for row-level advisory locks — a single worker that uses `UPDATE ... WHERE mirror_status = 'pending'` with a conditional update is sufficient.

### Deployment

- New file: `server/mirror-worker.js` (the script).
- New file: `server/khanqah-mirror.service` (systemd unit, `Restart=always`).
- `server/deploy.sh` extended to: `apt-get install -y yt-dlp`, copy worker + unit, `systemctl enable --now khanqah-mirror`.

## 6. Admin UI

### Upload form (`app/admin/upload.tsx`)

- When `isYouTubeUrl(mediaUrl)` is true, reveal a toggle: **"Save as"** → `Audio` / `Video`.
  - Default: `Video` when `selectedType === 'clip'`, otherwise `Audio`.
  - The existing `is_video` field is derived from this toggle on submit (removed the `selectedType === 'clip'` shortcut for YouTube URLs).
- On submit:
  - YouTube URL: insert row with
    ```
    media_url:          ''
    mirror_source_url:  <youtube URL>
    mirror_status:      'pending'
    mirror_format:      <toggle value>
    is_video:           <toggle === 'video'>
    ```
    Success toast copy: "Queued — mirroring usually takes 5–15 min."
  - Non-YouTube URL: exactly as today. `mirror_status` defaults to `'not_applicable'`.

### Manage content (`app/admin/manage-content.tsx`)

- A small chip appears next to each row's title when `mirror_status != 'not_applicable'`:

  | Status          | Colour         | Label                |
  |-----------------|----------------|----------------------|
  | `pending`       | muted gray     | `QUEUED`             |
  | `downloading`   | gold           | `MIRRORING…`         |
  | `uploading`     | gold           | `MIRRORING…`         |
  | `ready`         | (none)         | (no chip)            |
  | `failed`        | red            | `FAILED — RETRY`     |

- Tapping the `failed` chip opens a small bottom sheet showing `mirror_error` and a `RETRY` button. Retry performs `UPDATE content SET mirror_status='pending', mirror_attempts=0, mirror_error=null WHERE id=$1`.

### Public app — no UI changes

The player continues to read `media_url`. Rows still mirroring / failed are filtered out at the query level (see §7), so the player never sees them.

## 7. Visibility (RLS)

Public rows — anonymous & authenticated (non-admin) users — must only see mirrored-complete or direct-upload rows.

A new RLS policy on `content` restricts `SELECT` for non-admins to:

```sql
mirror_status IN ('ready', 'not_applicable')
```

Admins/editors keep the existing broader policy (sees all rows).

Effect:

| `mirror_status`  | Public sees? | Admin sees?                   |
|------------------|--------------|-------------------------------|
| `not_applicable` | ✅           | ✅                            |
| `pending`        | ❌           | ✅ with `QUEUED` chip         |
| `downloading`    | ❌           | ✅ with `MIRRORING…` chip     |
| `uploading`      | ❌           | ✅ with `MIRRORING…` chip     |
| `ready`          | ✅           | ✅                            |
| `failed`         | ❌           | ✅ with `FAILED — RETRY` chip |

Enforcing this at the RLS level (rather than relying on client filters in each hook) means any future query — existing or new — automatically gets the correct behaviour.

## 8. Testing

- **Worker unit tests** (Node `node:test`): given a mocked Supabase client, assert state transitions across happy path, yt-dlp failure, IA upload failure, and retry exhaustion.
- **Migration test**: apply `005_yt_mirror.sql` against a fresh local DB; assert existing rows land on `mirror_status = 'not_applicable'`.
- **Manual end-to-end**: admin form → insert a known short (<2 min) YouTube video → observe DB transitions → confirm archive.org URL plays in the existing audio player.
- **RLS test**: hit the public anon REST endpoint while a row is `pending` → row must not appear. As admin → it must appear.

## 9. Risks and mitigations

| Risk | Mitigation |
|---|---|
| YouTube changes its extraction protocol, breaking `yt-dlp` | `apt-get upgrade yt-dlp` in `deploy.sh`; worker stderr goes to journal — if jobs start failing en masse, the operator sees it. |
| archive.org rate-limits / rejects an upload | Worker marks `failed` with the stderr; no data loss — admin can retry later. |
| DO droplet `/tmp` fills up | One-job-at-a-time + delete-on-success/failure keeps peak usage to one file. |
| Content copyright on YouTube source | Out of scope for this design — the app's content is already curated manually by admins. |
| Worker crashes mid-job, leaving a row in `downloading` / `uploading` | `mirror_updated_at` heartbeat lets us detect stuck rows (>1 h). Phase-2 cleanup job can flip stale rows back to `pending`; not shipped in v1 since a `systemd` `Restart=always` handles the common case. |

## 10. Open questions / deferred

- **Notifications** when a mirror completes or fails: not in v1. Admin polls `manage-content`.
- **Progress percentage** inside `downloading` / `uploading`: not in v1. Chip is binary "MIRRORING…".
- **Batch migration** of existing YouTube rows: explicitly out of scope (see §2).
