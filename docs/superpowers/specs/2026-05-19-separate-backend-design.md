# Khanqah — Separate Backend Architecture Design

**Date:** 2026-05-19  
**Branch:** `arch/separate-backend`  
**Status:** Approved

---

## Overview

Re-architect Khanqah from a single Expo/React Native app backed by Supabase into four independent client projects sharing one custom Go REST API backed by PostgreSQL. The existing Expo app (`app/`) is frozen — no new features — and replaced progressively by the new clients.

---

## 1. Repository Structure

```
Khanqah/ (monorepo, branch: arch/separate-backend)
├── backend/          ← Go REST API
├── web/              ← React + Vite (public site + /admin panel)
├── android/          ← Kotlin + Jetpack Compose (listener app)
├── android-admin/    ← Kotlin + Jetpack Compose (admin/broadcaster app)
├── server/           ← existing scripts (audio-relay, nginx configs) — untouched
├── supabase/         ← existing migrations kept as reference only
└── app/              ← existing Expo app — frozen, no new features
```

---

## 2. Architecture

### Runtime on DigitalOcean server (165.22.208.103)

```
Internet → Nginx (80/443)
              ├── /api/*  → Go API (port 8090)
              ├── /       → React web (static files, /var/www/khanqah)
              └── :1935   → RTMP (unchanged)

audio-relay   → port 3001 (unchanged)
masjidaccounts → port 8080 (completely untouched)
postgresql@16  → port 5432, localhost only (unchanged)
```

### Client responsibilities

| Client | Users | Features |
|---|---|---|
| `web/` `/` | Listeners on browser | Browse, stream, schedule, live |
| `web/` `/admin` | Editors/admins on desktop | Upload, manage content, schedule, team, bug reports |
| `android/` | Listeners on phone | Browse, stream, offline downloads |
| `android-admin/` | Editors/admins/broadcasters on phone | Go live, upload, manage, bug reports |

---

## 3. Backend (Go REST API)

### Structure

```
backend/
├── cmd/server/main.go
├── internal/
│   ├── auth/            ← JWT issue/validate, bcrypt, OTP logic
│   ├── db/              ← sqlc-generated query functions
│   │   ├── query/       ← .sql files per domain
│   │   └── sqlc.yaml
│   ├── handler/
│   │   ├── auth.go
│   │   ├── content.go
│   │   ├── schedule.go
│   │   ├── live.go
│   │   └── admin.go
│   └── middleware/      ← JWT auth, role checks, CORS, rate limiting
├── migrations/          ← plain SQL (ported from supabase/migrations/)
└── Makefile
```

### Tech

- **Router:** `chi`
- **DB queries:** `sqlc` (type-safe Go generated from SQL)
- **Migrations:** `golang-migrate`
- **Auth tokens:** `golang-jwt/jwt`
- **Password/OTP hashing:** `bcrypt`
- **SMS:** AWS SNS
- **Storage:** Cloudflare R2 (S3-compatible, AWS SDK pointed at R2 endpoint)
- **Port:** 8090

### API surface

```
POST   /api/auth/otp/send       ← send OTP to phone number
POST   /api/auth/otp/verify     ← verify OTP, returns tokens
POST   /api/auth/refresh        ← refresh access token

GET    /api/content             ← public
GET    /api/content/:id         ← public
GET    /api/categories          ← public
GET    /api/schedule            ← public
GET    /api/live/current        ← public

GET    /api/me/progress         ← listener+
PUT    /api/me/progress/:id     ← listener+
GET    /api/me/playlists        ← listener+
GET    /api/me/downloads        ← listener+

POST   /api/admin/upload        ← editor+  (returns pre-signed R2 URL)
POST   /api/admin/content       ← editor+  (save metadata after upload)
PUT    /api/admin/content/:id   ← editor+
DELETE /api/admin/content/:id   ← admin
GET    /api/admin/categories    ← editor+
POST   /api/admin/categories    ← editor+
PUT    /api/admin/categories/:id ← editor+
DELETE /api/admin/categories/:id ← admin
POST   /api/admin/schedule      ← admin
PUT    /api/admin/schedule/:id  ← admin
DELETE /api/admin/schedule/:id  ← admin
POST   /api/admin/live/start    ← broadcaster, admin
POST   /api/admin/live/end      ← broadcaster, admin
GET    /api/admin/team          ← admin
PUT    /api/admin/team/:id/role ← admin
GET    /api/admin/bugs          ← admin
```

### Role middleware

```
Public routes        → no middleware
/api/me/*            → requireAuth (any valid JWT)
/api/admin/*         → requireAuth + requireRole(editor, admin, broadcaster)
/api/admin/team      → requireAuth + requireRole(admin)
/api/admin/live/*    → requireAuth + requireRole(broadcaster, admin)
```

---

## 4. Data Layer

### PostgreSQL schema changes from Supabase

- Remove all Supabase-specific: `auth.users` FK references, RLS policies, `supabase_realtime` publication
- Remove all `mirror_*` columns from `content` table (no more archive.org mirroring)
- Replace `email + password` auth with `phone` (unique) in `users` table
- Add two new tables:

```sql
otps (
  id          UUID PRIMARY KEY,
  phone       TEXT NOT NULL,
  otp_hash    TEXT NOT NULL,          -- bcrypt hash
  expires_at  TIMESTAMPTZ NOT NULL,   -- 10 min TTL
  attempts    INTEGER DEFAULT 0,      -- max 3, invalidated on 4th
  used        BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
)

refresh_tokens (
  id          UUID PRIMARY KEY,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  TEXT NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,   -- 30 days
  created_at  TIMESTAMPTZ DEFAULT NOW()
)
```

### Data migration

1. `pg_dump` from Supabase (data only, no schema)
2. Apply new schema via `golang-migrate` on DigitalOcean PostgreSQL 16
3. Import non-auth data: `content`, `categories`, `topics`, `scheduled_sessions`, `live_sessions`, `playlists`, `playlist_items`
4. **User accounts are not migrated** — Supabase stores email, not phone numbers. Existing users re-register on first launch via phone OTP. Their content (playlists, progress, downloads) is lost unless they contact admin to re-link by user ID.
5. Verify row counts match for content tables

---

## 5. Authentication

### OTP login flow

```
1. User enters phone number
2. POST /api/auth/otp/send { phone }
3. API generates 6-digit OTP, stores bcrypt hash with 10-min expiry (otps table)
4. API sends OTP via AWS SNS SMS
5. User enters OTP
6. POST /api/auth/otp/verify { phone, otp }
7. API validates: hash match, not expired, attempts < 3, not used
8. New user → auto-create with role: listener
9. API returns { access_token (JWT, 15 min), refresh_token (30 days) }
```

### OTP security

- Stored as bcrypt hash, never plaintext
- Max 3 attempts — 4th attempt invalidates OTP
- Rate limited: max 3 OTP requests per phone per 10 minutes
- Expires after 10 minutes

### Admin app gate

After OTP verify, if `role === 'listener'` → return 403 "Not authorized for admin access". Admin app shows "Access denied" screen.

---

## 6. Storage & CDN

### Upload flow (admin)

```
Admin app/web          Go API                  Cloudflare R2
     │                    │                         │
     │  POST /api/admin/upload (filename, mimetype) │
     │───────────────────▶│                         │
     │                    │  generate pre-signed PUT │
     │                    │  URL (15 min TTL)        │
     │                    │────────────────────────▶│
     │  { uploadUrl, fileKey }                       │
     │◀───────────────────│                         │
     │                    │                         │
     │  PUT file directly to uploadUrl              │
     │──────────────────────────────────────────────▶
     │                    │                         │
     │  POST /api/admin/content { fileKey, title, ..}
     │───────────────────▶│                         │
     │                    │  INSERT to PostgreSQL    │
     │  { content record }│                         │
     │◀───────────────────│                         │
```

- File bytes never pass through Go API — only pre-signed URL is generated server-side
- R2 bucket is private — all delivery via Cloudflare CDN (`cdn.khanqah.com`)
- `media_url` in PostgreSQL stores the CDN path (e.g. `https://cdn.khanqah.com/content/abc123.mp3`)

### Playback flow (listener)

- App fetches content metadata from Go API
- `media_url` is a direct Cloudflare CDN URL — app streams/downloads directly, no API proxy

---

## 7. Web Frontend (React + Vite)

### Structure

```
web/
├── src/
│   ├── api/           ← typed fetch wrapper, auto token refresh on 401
│   ├── components/    ← shared UI
│   ├── pages/
│   │   ├── public/    ← Home, Library, Schedule, Live, Player, Book
│   │   └── admin/     ← Upload, Content, Categories, Schedule, Live, Team, Bugs
│   ├── hooks/         ← useContent, useSchedule, useLive, useAuth
│   └── stores/        ← auth state, player state (Zustand)
├── vite.config.ts
└── package.json
```

### Tech

- Vite, React Router v7, TanStack Query, Zustand, Tailwind CSS

### Routes

```
/                   ← Home
/library            ← Browse categories
/library/:category  ← Content list
/player/:id         ← Audio/video player
/book/:id           ← PDF reader
/schedule           ← Upcoming sessions
/live               ← Live stream player
/login              ← Phone OTP login

/admin              ← redirect to /admin/content
/admin/content      ← Manage content
/admin/upload       ← File picker upload
/admin/categories   ← Manage categories
/admin/schedule     ← Manage sessions
/admin/live         ← Go live controls
/admin/team         ← Manage roles
/admin/bugs         ← Bug reports
```

`/admin/*` routes require a valid JWT with role `editor`, `admin`, or `broadcaster`.

---

## 8. Android User App (Kotlin + Jetpack Compose)

### Tech

- Jetpack Compose, Retrofit + OkHttp, Room (offline cache), ExoPlayer, WorkManager (downloads), DataStore (token storage), Navigation Compose

### Screens

Home, Library, Player, Book reader, Schedule, Live, Login (phone OTP), Profile

### UI

Replicates existing Expo app UI exactly — same colors (`constants/Colors.ts`), typography (`lib/typography.ts`), layouts, RTL Urdu support, light/dark/system theme. Existing app screens are the design reference.

### Offline

- Room caches content metadata for offline browsing
- Downloaded files stored in app-private storage
- Listening progress queued locally and synced when online

---

## 9. Android Admin App (Kotlin + Jetpack Compose)

### Tech

Same Retrofit/OkHttp/DataStore setup as user app. No Room or offline downloads.

### Screens

Login (phone OTP, role-gated), Content list, Upload (file picker + progress + metadata form), Categories, Schedule, Go Live, Team, Bug Reports

### Key behaviours

- Login rejects `listener` role with "Access denied"
- Upload: file picker → pre-signed URL from API → direct R2 upload with progress bar → metadata form → save
- Go Live: starts RTMP session via API, shows stream key and status

---

## 10. Deployment

### New

- `khanqah-api` systemd service — Go binary, port 8090, env at `/etc/khanqah/api.env`
- React web static files at `/var/www/khanqah/`

### Updated nginx

```nginx
location / {
    root /var/www/khanqah;
    try_files $uri /index.html;
}
location /api/ {
    proxy_pass http://127.0.0.1:8090;
}
```

### Removed

- `khanqah-mirror` systemd service (archive.org worker no longer needed)

### Unchanged

- `nginx` (config updated only)
- `audio-relay` (port 3001)
- `postgresql@16-main`
- `masjidaccounts` (port 8080) — completely untouched

### Cloudflare

- R2 bucket for media storage
- CDN zone at `cdn.khanqah.com` pointed at R2 bucket
- DNS for `khanqah.com` managed on Cloudflare

---

## 11. Branch Strategy

All new work on branch `arch/separate-backend`. The existing `main` branch (Expo app) is untouched until new clients are production-ready and a cutover is planned.
