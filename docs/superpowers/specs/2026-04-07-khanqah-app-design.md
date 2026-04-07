# Khanqah Maseeh-ul-Ummah — App Design Spec

## Overview

A cross-platform Islamic audio/content app for Khanqah Maseeh-ul-Ummah, primarily serving the bayans and teachings of Hazrat Mufti Abdur Rasheed Miftahi Sahab DB. Inspired by the Ghurfa app (com.hazratferozmemon) and Baitul Maarif (com.sarbakaf.baitulmaarif), combining the best features of both.

**Target audience:** Mureeds, students, and followers of the khanqah (~500 DAU initially).

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Expo SDK 54, React Native, expo-router (file-based routing) |
| Audio Player | react-native-track-player (ExoPlayer/AVPlayer, supports HLS live streams) |
| Database | Supabase (PostgreSQL, Auth, Realtime) |
| Local Storage | expo-sqlite (offline cache for downloads, playlists, progress) |
| Push Notifications | OneSignal (free up to 10K subscribers) |
| Audio/PDF Hosting | Internet Archive (archive.org) — free, unlimited |
| Video Hosting | YouTube — embedded via react-native-youtube-iframe |
| Live Streaming | Nginx-RTMP on existing DigitalOcean server (HLS output) |
| Web Hosting | Expo web build served from DO server |
| Platforms | Android, iOS, Web |

## Architecture

```
┌─────────────────────────────────────────────────┐
│                   CLIENTS                        │
│  Android App ─── iOS App ─── Web App (DO server) │
│         (Expo/React Native, single codebase)     │
└──────────────┬──────────────────┬────────────────┘
               │                  │
       ┌───────▼───────┐  ┌──────▼───────────┐
       │   Supabase    │  │  DO Server       │
       │ (hosted/free) │  │                  │
       │               │  │ - Nginx-RTMP     │
       │ - PostgreSQL  │  │   (live stream)  │
       │ - Auth        │  │ - Recording      │
       │ - Realtime    │  │ - Auto-upload    │
       │               │  │   to archive.org │
       └───────────────┘  │ - Web app host   │
                          └──────────────────┘
       ┌───────────────┐  ┌──────────────────┐
       │ Internet      │  │  YouTube         │
       │ Archive       │  │                  │
       │ (audio/PDF)   │  │ (video clips)    │
       └───────────────┘  └──────────────────┘
       ┌───────────────┐
       │  OneSignal    │
       │ (push notifs) │
       └───────────────┘
```

**Cost breakdown:**
- Supabase free tier: 500MB DB, 1GB storage, 50K MAU — more than enough
- Internet Archive: free, unlimited
- YouTube: free, unlimited
- OneSignal: free up to 10K subscribers
- DO server: existing, no extra cost
- **Total additional cost: $0/month**

## Data Model

### users
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK, from Supabase Auth |
| email | text | |
| display_name | text | |
| role | enum | `listener`, `editor`, `admin` |
| language_pref | text | `en` or `ur`, default `en` |
| theme_pref | text | `light`, `dark`, `system` |
| created_at | timestamptz | |

### categories
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| name_en | text | |
| name_ur | text | |
| type | enum | `bayan`, `clip`, `nazam`, `quran`, `hamd_naat`, `book` |
| parent_id | uuid | FK to categories (for subcategories) |
| sort_order | int | |

### content
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| title_en | text | |
| title_ur | text | |
| description_en | text | nullable |
| description_ur | text | nullable |
| type | enum | same as categories.type |
| category_id | uuid | FK to categories |
| media_url | text | archive.org or YouTube URL |
| thumbnail_url | text | nullable, archive.org |
| duration | int | seconds, nullable for books |
| file_size | bigint | bytes, nullable |
| is_video | boolean | default false |
| uploaded_by | uuid | FK to users |
| created_at | timestamptz | |
| updated_at | timestamptz | |

### topics
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| content_id | uuid | FK to content |
| title_en | text | |
| title_ur | text | |
| timestamp_seconds | int | position in audio |
| sort_order | int | |

### playlists
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| user_id | uuid | FK to users |
| name | text | |
| is_public | boolean | default false |
| created_at | timestamptz | |

### playlist_items
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| playlist_id | uuid | FK to playlists |
| content_id | uuid | FK to content |
| sort_order | int | |
| added_at | timestamptz | |

### downloads
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| user_id | uuid | FK to users |
| content_id | uuid | FK to content |
| downloaded_at | timestamptz | |

### listening_progress
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| user_id | uuid | FK to users |
| content_id | uuid | FK to content |
| position_seconds | int | |
| completed | boolean | default false |
| updated_at | timestamptz | |

Unique constraint on (user_id, content_id).

### live_sessions
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| title_en | text | |
| title_ur | text | |
| stream_url | text | HLS URL from DO server |
| started_by | uuid | FK to users |
| started_at | timestamptz | |
| ended_at | timestamptz | nullable |
| recording_url | text | archive.org URL, set after upload |
| status | enum | `live`, `ended`, `processing` |

### scheduled_sessions
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| title_en | text | |
| title_ur | text | |
| description_en | text | nullable |
| description_ur | text | nullable |
| scheduled_at | timestamptz | |
| is_recurring | boolean | |
| recurrence_rule | text | RRULE format, e.g. `FREQ=WEEKLY;BYDAY=TH` (null if not recurring) |
| created_by | uuid | FK to users |
| created_at | timestamptz | |

### push_subscriptions
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| user_id | uuid | FK to users |
| onesignal_player_id | text | |
| device_type | text | `android`, `ios`, `web` |
| created_at | timestamptz | |

## App Screens & Navigation

### Bottom Tab Navigation (4 tabs)

For regular users: Home, Library, Collection, Profile.
For admin/editor users: Home, Library, Collection, Admin (replaces Profile; Profile accessible from Admin).

### Tab 1: Home
- Islamic-styled header with app name, Arabic text, and Mufti Sahab's name
- **LIVE NOW** banner (animated, appears when a session is active)
- **Next Live** card showing upcoming scheduled session with date/time
- Latest Bayans section with "See all"
- Short Clips section with "See all"
- Recent content across categories

### Tab 2: Library
- Search bar with filters
- 6 category tiles in a 2x2 grid with subtle color coding:
  - Bayans (green), Video Clips (gold), Nazams (purple)
  - Quran (blue), Hamd & Naat (pink), Books (amber)
- Each tile shows item count
- Tapping a tile opens category listing with subcategories

### Tab 3: My Collection
- **Continue Listening** — shows last played item with progress bar
- **Playlists** — user-created playlists + auto-created "Favourites"
- **Downloads** — offline content with total storage used
- **History** — recently played items sorted by recency

### Tab 4a: Profile (regular users)
- Avatar, name, email
- Language toggle (English / Urdu)
- Theme toggle (Light / Dark / System)
- Playback speed default
- Skip interval setting
- Notification preferences
- About the Khanqah
- Mufti Sahab's bio
- App version

### Tab 4b: Admin (admin/editor users)
Admin tab with sub-screens:
- **Dashboard** — quick stats
- **Go Live** — start/stop broadcast with session title (EN/UR), auto-save toggle, push notification toggle, listener count, duration
- **Upload Content** — content type selector, bilingual titles, category picker, media URL (archive.org/YouTube), thumbnail upload
- **Manage Content** — searchable list with type filters, edit/delete actions
- **Schedule Sessions** — create/manage upcoming live sessions (one-time or recurring), shown as "Next Live" on Home
- **Manage Team** — invite members, assign admin/editor roles
- **Profile** — accessible from Admin screen

### Audio Player
**Mini player** (persistent at bottom above tab bar):
- Thumbnail, title, artist, play/pause
- Progress indicator bar

**Full player** (expands from mini player):
- Large artwork with Islamic geometric pattern overlay
- Title and artist
- Progress bar with gold accent dot
- Time elapsed / remaining
- Controls: previous, -15s, play/pause, +15s, next
- Playback speed selector (0.5x to 2x)
- Actions: Download, Share, Queue
- Topics panel — tap to jump to specific part of bayan

### Live Player
- Red-themed variant of full player
- Live dot animation with "LIVE" badge
- Listener count in real-time (via Supabase Realtime)
- Duration timer
- Volume and share controls
- No seek/progress bar (it's live)

### Book/PDF Viewer
- In-app PDF reader (react-native-pdf or WebView)
- Loaded from archive.org URL
- Bookmark support (saved locally)
- Download for offline reading

## Live Streaming Flow

### Admin starts broadcast:
1. Admin opens "Go Live" screen, enters session title (EN/UR)
2. Taps the red START button
3. App begins capturing microphone audio
4. Audio streams to DO server via RTMP
5. DO server (Nginx-RTMP) relays as HLS stream + records to MP3
6. App creates `live_sessions` row with status `live` and `stream_url`
7. Supabase Realtime notifies all connected clients
8. OneSignal push notification sent to all subscribers

### Listener joins:
1. App detects live session via Supabase Realtime subscription
2. LIVE NOW banner appears on Home screen
3. User taps "Join" — opens Live Player
4. react-native-track-player plays the HLS stream URL

### Admin stops broadcast:
1. Admin taps "Stop Broadcasting"
2. Audio capture stops, RTMP stream ends
3. DO server finalizes MP3 recording
4. Server auto-uploads MP3 to Internet Archive via S3-compatible API
5. `live_sessions` row updated: status `processing` → `ended`, `recording_url` set
6. Content entry automatically created with archive.org URL

## Internationalization

- **Default:** English (LTR layout)
- **Urdu:** RTL text rendering where Urdu content is displayed
- All user-facing strings in both EN and UR
- Content titles/descriptions stored bilingually
- Language toggle in Profile/Settings
- React Native's `I18nManager` for RTL support where needed

## Theming

- **Light mode** and **Dark mode** with system-preference auto-detection
- Color palette:
  - Primary: `#047857` (emerald green)
  - Primary light: `#059669`
  - Primary dark: `#064e3b`
  - Gold accent: `#d4a853`
  - Live red: `#ef4444`
- Dark surfaces: `#09090b`, `#18181b`, `#27272a`
- Light surfaces: `#fafafa`, `#fff`, `#f4f4f5`
- Toggle in Profile settings (Light / Dark / System)

## Authentication & Authorization

- **Supabase Auth** with Google Sign-In and email/password
- Roles stored in `users.role` column
- Row-Level Security (RLS) policies in Supabase:
  - `listener`: read content, write own playlists/progress/downloads
  - `editor`: all listener permissions + create/update content and categories
  - `admin`: all editor permissions + manage users/roles, go live, manage team, schedule sessions

## Offline Support

- **expo-sqlite** for local data cache (content metadata, playlists, progress)
- **expo-file-system** for downloading audio files from archive.org
- Downloads managed via `downloads` table (synced to Supabase)
- Listening progress synced when back online
- Playlists work offline with local SQLite, sync on reconnect

## Push Notifications

Sent via OneSignal for:
- Live session started
- New bayan/content uploaded
- Scheduled session reminder (configurable: 15min, 1hr, 1day before)
- User can configure preferences in Profile

## Design Reference

Mockups saved in:
- `.superpowers/brainstorm/254-1775564949/content/app-design-v3-both-modes.html` — all user screens (light + dark)
- `.superpowers/brainstorm/254-1775564949/content/app-design-v4-admin.html` — all admin screens (light + dark)

Open with `http://localhost:51504` when brainstorm server is running.
