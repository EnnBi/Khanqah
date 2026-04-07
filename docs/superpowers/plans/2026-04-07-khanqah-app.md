# Khanqah Maseeh-ul-Ummah App — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a cross-platform Islamic audio/content app with live streaming, offline support, and admin features.

**Architecture:** Expo SDK 54 + React Native with expo-router for file-based navigation. Supabase for database/auth/realtime. Media hosted on Internet Archive (audio/PDF) and YouTube (video). Live streaming via Nginx-RTMP on existing DO server. OneSignal for push notifications.

**Tech Stack:** Expo 54, React Native, TypeScript, expo-router, react-native-track-player, Supabase (PostgreSQL + Auth + Realtime), expo-sqlite, OneSignal, Nginx-RTMP, Internet Archive S3 API

**Spec:** `docs/superpowers/specs/2026-04-07-khanqah-app-design.md`

**Design mockups:** `.superpowers/brainstorm/254-1775564949/content/app-design-v3-both-modes.html` and `app-design-v4-admin.html`

---

## File Structure

```
khanqah/
├── app/
│   ├── _layout.tsx                    # Root layout: providers (Supabase, Theme, i18n, Player)
│   ├── (auth)/
│   │   ├── _layout.tsx                # Auth stack layout
│   │   └── login.tsx                  # Login/register screen
│   ├── (tabs)/
│   │   ├── _layout.tsx                # Tab navigator (4 tabs, role-aware)
│   │   ├── index.tsx                  # Home screen
│   │   ├── library.tsx                # Library screen (category grid)
│   │   ├── collection.tsx             # My Collection screen
│   │   └── profile.tsx                # Profile screen
│   ├── admin/
│   │   ├── _layout.tsx                # Admin stack layout
│   │   ├── index.tsx                  # Admin dashboard
│   │   ├── go-live.tsx                # Go Live screen
│   │   ├── upload.tsx                 # Upload content
│   │   ├── manage-content.tsx         # Manage content list
│   │   ├── schedule.tsx               # Schedule sessions
│   │   └── team.tsx                   # Manage team
│   ├── player/
│   │   ├── [id].tsx                   # Full audio player
│   │   └── live.tsx                   # Live player
│   ├── library/
│   │   ├── [categoryId].tsx           # Category content listing
│   │   └── search.tsx                 # Search screen
│   └── book/
│       └── [id].tsx                   # PDF viewer
├── components/
│   ├── ContentCard.tsx                # Reusable content list item
│   ├── CategoryTile.tsx               # Category grid tile
│   ├── MiniPlayer.tsx                 # Persistent mini player bar
│   ├── LiveBanner.tsx                 # "LIVE NOW" animated banner
│   ├── NextLiveCard.tsx               # Next scheduled session card
│   ├── TopicsList.tsx                 # Topics panel in player
│   ├── SearchBar.tsx                  # Search input component
│   ├── BilingualText.tsx              # Text with RTL Urdu support
│   └── PlayerControls.tsx             # Play/pause/seek controls
├── lib/
│   ├── supabase.ts                    # Supabase client init
│   ├── types.ts                       # TypeScript types matching DB schema
│   ├── theme.ts                       # Color tokens, light/dark themes
│   ├── i18n.ts                        # i18n setup with language context
│   └── strings/
│       ├── en.ts                      # English UI strings
│       └── ur.ts                      # Urdu UI strings
├── hooks/
│   ├── useAuth.ts                     # Auth state + role checking
│   ├── useContent.ts                  # Content CRUD queries
│   ├── useCategories.ts               # Category queries
│   ├── usePlayer.ts                   # Player state management
│   ├── useLiveSession.ts              # Live session realtime subscription
│   ├── useDownloads.ts                # Download management
│   ├── usePlaylists.ts                # Playlist CRUD
│   ├── useListeningProgress.ts        # Progress tracking + sync
│   └── useScheduledSessions.ts        # Scheduled sessions queries
├── services/
│   ├── player-service.ts              # react-native-track-player setup
│   ├── offline-db.ts                  # expo-sqlite schema + queries
│   ├── notifications.ts               # OneSignal init + handlers
│   └── archive-upload.ts              # Internet Archive S3 upload
├── providers/
│   ├── AuthProvider.tsx               # Auth context provider
│   ├── ThemeProvider.tsx              # Theme context (light/dark/system)
│   ├── I18nProvider.tsx               # Language context
│   └── PlayerProvider.tsx             # Player state context
├── supabase/
│   ├── migrations/
│   │   └── 001_initial_schema.sql     # All tables + RLS policies
│   └── seed.sql                       # Dev seed data
├── server/
│   ├── nginx-rtmp.conf                # Nginx RTMP config for DO server
│   ├── record-and-upload.sh           # Post-stream: finalize MP3 + upload to archive.org
│   └── deploy.sh                      # Server deployment script
├── __tests__/
│   ├── lib/
│   │   ├── types.test.ts              # Type guard tests
│   │   └── theme.test.ts              # Theme token tests
│   ├── hooks/
│   │   ├── useContent.test.ts         # Content hook tests
│   │   └── usePlayer.test.ts          # Player hook tests
│   ├── components/
│   │   ├── ContentCard.test.tsx        # ContentCard render tests
│   │   ├── MiniPlayer.test.tsx         # MiniPlayer render tests
│   │   └── LiveBanner.test.tsx         # LiveBanner render tests
│   └── services/
│       └── offline-db.test.ts          # SQLite query tests
├── app.json                           # Expo config
├── package.json
├── tsconfig.json
└── .env.local                         # Supabase URL, keys, OneSignal ID
```

---

## Phase 1: Foundation + Core Browsing

This phase delivers: project scaffolding, Supabase schema, auth, theming, i18n, tab navigation, Home screen, Library browsing. The app is installable and shows content.

---

### Task 1: Expo Project Scaffolding

**Files:**
- Create: `package.json`, `app.json`, `tsconfig.json`, `.env.local`, `.gitignore`

- [ ] **Step 1: Create Expo project**

```bash
cd /Users/nadeembaba/Documents/myproj/khanqah
npx create-expo-app@latest . --template tabs
```

If the directory is not empty, move existing files temporarily:
```bash
mkdir -p /tmp/khanqah-backup && mv docs .superpowers /tmp/khanqah-backup/
npx create-expo-app@latest . --template tabs
mv /tmp/khanqah-backup/docs /tmp/khanqah-backup/.superpowers .
```

- [ ] **Step 2: Install core dependencies**

```bash
npx expo install @supabase/supabase-js react-native-url-polyfill
npx expo install expo-sqlite expo-file-system expo-sharing
npx expo install react-native-track-player
npx expo install expo-notifications
npx expo install react-native-youtube-iframe react-native-webview
npx expo install @react-native-async-storage/async-storage
npx expo install react-native-safe-area-context react-native-screens
npm install react-native-onesignal --save
npm install i18next react-i18next --save
npm install rrule --save
```

- [ ] **Step 3: Install dev dependencies**

```bash
npm install --save-dev jest @testing-library/react-native @testing-library/jest-native jest-expo @types/jest
```

- [ ] **Step 4: Create `.env.local`**

```bash
# .env.local — fill in after Supabase project creation
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
EXPO_PUBLIC_ONESIGNAL_APP_ID=your-onesignal-app-id
```

- [ ] **Step 5: Update `.gitignore`**

Append to `.gitignore`:
```
.env.local
.superpowers/
ghurfa_apktool/
ghurfa_jadx/
baitulmaarif_extracted/
*.apk
*.xapk
```

- [ ] **Step 6: Verify the app starts**

```bash
npx expo start --web
```

Expected: App loads in browser with default Expo tabs template.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: scaffold Expo project with core dependencies"
```

---

### Task 2: TypeScript Types + Supabase Client

**Files:**
- Create: `lib/types.ts`, `lib/supabase.ts`
- Test: `__tests__/lib/types.test.ts`

- [ ] **Step 1: Write type tests**

Create `__tests__/lib/types.test.ts`:
```typescript
import type {
  ContentType,
  UserRole,
  User,
  Category,
  Content,
  Topic,
  Playlist,
  LiveSession,
  ScheduledSession,
  ListeningProgress,
} from '../../lib/types';

describe('types', () => {
  it('ContentType includes all content types', () => {
    const types: ContentType[] = ['bayan', 'clip', 'nazam', 'quran', 'hamd_naat', 'book'];
    expect(types).toHaveLength(6);
  });

  it('UserRole includes all roles', () => {
    const roles: UserRole[] = ['listener', 'editor', 'admin'];
    expect(roles).toHaveLength(3);
  });

  it('Content object satisfies the type', () => {
    const content: Content = {
      id: '123',
      title_en: 'Test Bayan',
      title_ur: 'ٹیسٹ بیان',
      description_en: null,
      description_ur: null,
      type: 'bayan',
      category_id: '456',
      media_url: 'https://archive.org/download/test/test.mp3',
      thumbnail_url: null,
      duration: 2700,
      file_size: null,
      is_video: false,
      uploaded_by: '789',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    };
    expect(content.type).toBe('bayan');
    expect(content.is_video).toBe(false);
  });

  it('LiveSession has correct status values', () => {
    const statuses: LiveSession['status'][] = ['live', 'ended', 'processing'];
    expect(statuses).toHaveLength(3);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx jest __tests__/lib/types.test.ts
```

Expected: FAIL — cannot find module `../../lib/types`.

- [ ] **Step 3: Create `lib/types.ts`**

```typescript
export type ContentType = 'bayan' | 'clip' | 'nazam' | 'quran' | 'hamd_naat' | 'book';
export type UserRole = 'listener' | 'editor' | 'admin';
export type ThemePref = 'light' | 'dark' | 'system';
export type LiveSessionStatus = 'live' | 'ended' | 'processing';

export interface User {
  id: string;
  email: string;
  display_name: string;
  role: UserRole;
  language_pref: 'en' | 'ur';
  theme_pref: ThemePref;
  created_at: string;
}

export interface Category {
  id: string;
  name_en: string;
  name_ur: string;
  type: ContentType;
  parent_id: string | null;
  sort_order: number;
}

export interface Content {
  id: string;
  title_en: string;
  title_ur: string;
  description_en: string | null;
  description_ur: string | null;
  type: ContentType;
  category_id: string;
  media_url: string;
  thumbnail_url: string | null;
  duration: number | null;
  file_size: number | null;
  is_video: boolean;
  uploaded_by: string;
  created_at: string;
  updated_at: string;
}

export interface Topic {
  id: string;
  content_id: string;
  title_en: string;
  title_ur: string;
  timestamp_seconds: number;
  sort_order: number;
}

export interface Playlist {
  id: string;
  user_id: string;
  name: string;
  is_public: boolean;
  created_at: string;
}

export interface PlaylistItem {
  id: string;
  playlist_id: string;
  content_id: string;
  sort_order: number;
  added_at: string;
}

export interface Download {
  id: string;
  user_id: string;
  content_id: string;
  downloaded_at: string;
}

export interface ListeningProgress {
  id: string;
  user_id: string;
  content_id: string;
  position_seconds: number;
  completed: boolean;
  updated_at: string;
}

export interface LiveSession {
  id: string;
  title_en: string;
  title_ur: string;
  stream_url: string;
  started_by: string;
  started_at: string;
  ended_at: string | null;
  recording_url: string | null;
  status: LiveSessionStatus;
}

export interface ScheduledSession {
  id: string;
  title_en: string;
  title_ur: string;
  description_en: string | null;
  description_ur: string | null;
  scheduled_at: string;
  is_recurring: boolean;
  recurrence_rule: string | null;
  created_by: string;
  created_at: string;
}

export interface PushSubscription {
  id: string;
  user_id: string;
  onesignal_player_id: string;
  device_type: 'android' | 'ios' | 'web';
  created_at: string;
}
```

- [ ] **Step 4: Create `lib/supabase.ts`**

```typescript
import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
```

- [ ] **Step 5: Run tests**

```bash
npx jest __tests__/lib/types.test.ts
```

Expected: PASS — all 4 tests pass.

- [ ] **Step 6: Commit**

```bash
git add lib/types.ts lib/supabase.ts __tests__/lib/types.test.ts
git commit -m "feat: add TypeScript types and Supabase client"
```

---

### Task 3: Supabase Database Schema + RLS

**Files:**
- Create: `supabase/migrations/001_initial_schema.sql`, `supabase/seed.sql`

- [ ] **Step 1: Create the migration file**

Create `supabase/migrations/001_initial_schema.sql`:
```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============ ENUMS ============
CREATE TYPE content_type AS ENUM ('bayan', 'clip', 'nazam', 'quran', 'hamd_naat', 'book');
CREATE TYPE user_role AS ENUM ('listener', 'editor', 'admin');
CREATE TYPE live_session_status AS ENUM ('live', 'ended', 'processing');

-- ============ TABLES ============

-- Users (extends Supabase auth.users)
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT NOT NULL DEFAULT '',
  role user_role NOT NULL DEFAULT 'listener',
  language_pref TEXT NOT NULL DEFAULT 'en' CHECK (language_pref IN ('en', 'ur')),
  theme_pref TEXT NOT NULL DEFAULT 'system' CHECK (theme_pref IN ('light', 'dark', 'system')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Categories
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name_en TEXT NOT NULL,
  name_ur TEXT NOT NULL,
  type content_type NOT NULL,
  parent_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);

-- Content
CREATE TABLE public.content (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title_en TEXT NOT NULL,
  title_ur TEXT NOT NULL,
  description_en TEXT,
  description_ur TEXT,
  type content_type NOT NULL,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE RESTRICT,
  media_url TEXT NOT NULL,
  thumbnail_url TEXT,
  duration INTEGER, -- seconds, null for books
  file_size BIGINT, -- bytes
  is_video BOOLEAN NOT NULL DEFAULT FALSE,
  uploaded_by UUID NOT NULL REFERENCES public.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Topics (timestamps within a bayan)
CREATE TABLE public.topics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  content_id UUID NOT NULL REFERENCES public.content(id) ON DELETE CASCADE,
  title_en TEXT NOT NULL,
  title_ur TEXT NOT NULL,
  timestamp_seconds INTEGER NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);

-- Playlists
CREATE TABLE public.playlists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_public BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Playlist items
CREATE TABLE public.playlist_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  playlist_id UUID NOT NULL REFERENCES public.playlists(id) ON DELETE CASCADE,
  content_id UUID NOT NULL REFERENCES public.content(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  added_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Downloads (tracking, not actual files)
CREATE TABLE public.downloads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  content_id UUID NOT NULL REFERENCES public.content(id) ON DELETE CASCADE,
  downloaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Listening progress
CREATE TABLE public.listening_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  content_id UUID NOT NULL REFERENCES public.content(id) ON DELETE CASCADE,
  position_seconds INTEGER NOT NULL DEFAULT 0,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, content_id)
);

-- Live sessions
CREATE TABLE public.live_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title_en TEXT NOT NULL,
  title_ur TEXT NOT NULL,
  stream_url TEXT NOT NULL,
  started_by UUID NOT NULL REFERENCES public.users(id),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  recording_url TEXT,
  status live_session_status NOT NULL DEFAULT 'live'
);

-- Scheduled sessions
CREATE TABLE public.scheduled_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title_en TEXT NOT NULL,
  title_ur TEXT NOT NULL,
  description_en TEXT,
  description_ur TEXT,
  scheduled_at TIMESTAMPTZ NOT NULL,
  is_recurring BOOLEAN NOT NULL DEFAULT FALSE,
  recurrence_rule TEXT, -- RRULE format, null if not recurring
  created_by UUID NOT NULL REFERENCES public.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Push subscriptions
CREATE TABLE public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  onesignal_player_id TEXT NOT NULL,
  device_type TEXT NOT NULL CHECK (device_type IN ('android', 'ios', 'web')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============ INDEXES ============
CREATE INDEX idx_content_type ON public.content(type);
CREATE INDEX idx_content_category ON public.content(category_id);
CREATE INDEX idx_content_created ON public.content(created_at DESC);
CREATE INDEX idx_topics_content ON public.topics(content_id);
CREATE INDEX idx_playlists_user ON public.playlists(user_id);
CREATE INDEX idx_playlist_items_playlist ON public.playlist_items(playlist_id);
CREATE INDEX idx_downloads_user ON public.downloads(user_id);
CREATE INDEX idx_listening_progress_user ON public.listening_progress(user_id);
CREATE INDEX idx_live_sessions_status ON public.live_sessions(status);
CREATE INDEX idx_scheduled_sessions_at ON public.scheduled_sessions(scheduled_at);

-- ============ RLS POLICIES ============
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playlist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.downloads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listening_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduled_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Users: read own, admins read all
CREATE POLICY "Users can read own profile" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Admins can read all users" ON public.users FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "Users can update own profile" ON public.users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins can update any user" ON public.users FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
);

-- Categories: everyone reads, editors/admins write
CREATE POLICY "Anyone can read categories" ON public.categories FOR SELECT USING (TRUE);
CREATE POLICY "Editors can manage categories" ON public.categories FOR ALL USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('editor', 'admin'))
);

-- Content: everyone reads, editors/admins write
CREATE POLICY "Anyone can read content" ON public.content FOR SELECT USING (TRUE);
CREATE POLICY "Editors can insert content" ON public.content FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('editor', 'admin'))
);
CREATE POLICY "Editors can update content" ON public.content FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('editor', 'admin'))
);
CREATE POLICY "Admins can delete content" ON public.content FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
);

-- Topics: everyone reads, editors/admins write
CREATE POLICY "Anyone can read topics" ON public.topics FOR SELECT USING (TRUE);
CREATE POLICY "Editors can manage topics" ON public.topics FOR ALL USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('editor', 'admin'))
);

-- Playlists: own data only
CREATE POLICY "Users read own playlists" ON public.playlists FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users manage own playlists" ON public.playlists FOR ALL USING (auth.uid() = user_id);

-- Playlist items: own playlists only
CREATE POLICY "Users read own playlist items" ON public.playlist_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.playlists WHERE id = playlist_id AND user_id = auth.uid())
);
CREATE POLICY "Users manage own playlist items" ON public.playlist_items FOR ALL USING (
  EXISTS (SELECT 1 FROM public.playlists WHERE id = playlist_id AND user_id = auth.uid())
);

-- Downloads: own data only
CREATE POLICY "Users read own downloads" ON public.downloads FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users manage own downloads" ON public.downloads FOR ALL USING (auth.uid() = user_id);

-- Listening progress: own data only
CREATE POLICY "Users read own progress" ON public.listening_progress FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users manage own progress" ON public.listening_progress FOR ALL USING (auth.uid() = user_id);

-- Live sessions: everyone reads, admins write
CREATE POLICY "Anyone can read live sessions" ON public.live_sessions FOR SELECT USING (TRUE);
CREATE POLICY "Admins manage live sessions" ON public.live_sessions FOR ALL USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
);

-- Scheduled sessions: everyone reads, admins write
CREATE POLICY "Anyone can read scheduled sessions" ON public.scheduled_sessions FOR SELECT USING (TRUE);
CREATE POLICY "Admins manage scheduled sessions" ON public.scheduled_sessions FOR ALL USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
);

-- Push subscriptions: own data only
CREATE POLICY "Users read own push subs" ON public.push_subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users manage own push subs" ON public.push_subscriptions FOR ALL USING (auth.uid() = user_id);

-- ============ TRIGGER: auto-create user profile on signup ============
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, display_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ TRIGGER: auto-update updated_at ============
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER content_updated_at
  BEFORE UPDATE ON public.content
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER listening_progress_updated_at
  BEFORE UPDATE ON public.listening_progress
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============ REALTIME ============
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_sessions;
```

- [ ] **Step 2: Create seed data**

Create `supabase/seed.sql`:
```sql
-- Seed categories
INSERT INTO public.categories (id, name_en, name_ur, type, sort_order) VALUES
  ('a1000000-0000-0000-0000-000000000001', 'Bayans', 'بیانات', 'bayan', 1),
  ('a1000000-0000-0000-0000-000000000002', 'Video Clips', 'ویڈیو کلپس', 'clip', 2),
  ('a1000000-0000-0000-0000-000000000003', 'Nazams', 'نظمیں', 'nazam', 3),
  ('a1000000-0000-0000-0000-000000000004', 'Quran Recitations', 'تلاوت قرآن', 'quran', 4),
  ('a1000000-0000-0000-0000-000000000005', 'Hamd & Naat', 'حمد و نعت', 'hamd_naat', 5),
  ('a1000000-0000-0000-0000-000000000006', 'Books', 'کتابیں', 'book', 6);
```

- [ ] **Step 3: Apply migration to Supabase**

Go to the Supabase dashboard → SQL Editor → paste and run `001_initial_schema.sql`, then `seed.sql`.

Alternatively, if using Supabase CLI:
```bash
npx supabase db push
npx supabase db seed
```

- [ ] **Step 4: Commit**

```bash
git add supabase/
git commit -m "feat: add Supabase schema, RLS policies, and seed data"
```

---

### Task 4: Theme System (Light/Dark)

**Files:**
- Create: `lib/theme.ts`, `providers/ThemeProvider.tsx`
- Test: `__tests__/lib/theme.test.ts`

- [ ] **Step 1: Write theme tests**

Create `__tests__/lib/theme.test.ts`:
```typescript
import { lightTheme, darkTheme } from '../../lib/theme';

describe('theme', () => {
  it('light theme has correct primary color', () => {
    expect(lightTheme.colors.primary).toBe('#047857');
  });

  it('dark theme has correct primary color', () => {
    expect(darkTheme.colors.primary).toBe('#047857');
  });

  it('light theme has white-ish background', () => {
    expect(lightTheme.colors.background).toBe('#fafafa');
  });

  it('dark theme has dark background', () => {
    expect(darkTheme.colors.background).toBe('#09090b');
  });

  it('both themes have all required color keys', () => {
    const requiredKeys = [
      'primary', 'primaryLight', 'primaryDark', 'gold', 'liveRed',
      'background', 'surface', 'surface2', 'surface3',
      'text', 'textSecondary', 'textMuted', 'border',
    ];
    for (const key of requiredKeys) {
      expect(lightTheme.colors).toHaveProperty(key);
      expect(darkTheme.colors).toHaveProperty(key);
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx jest __tests__/lib/theme.test.ts
```

Expected: FAIL — cannot find module.

- [ ] **Step 3: Create `lib/theme.ts`**

```typescript
export interface ThemeColors {
  primary: string;
  primaryLight: string;
  primaryDark: string;
  gold: string;
  goldLight: string;
  liveRed: string;
  background: string;
  surface: string;
  surface2: string;
  surface3: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  border: string;
  miniPlayerBg: string;
  tabBarBg: string;
  headerBg: string;
}

export interface Theme {
  dark: boolean;
  colors: ThemeColors;
}

export const lightTheme: Theme = {
  dark: false,
  colors: {
    primary: '#047857',
    primaryLight: '#059669',
    primaryDark: '#064e3b',
    gold: '#d4a853',
    goldLight: '#e8c672',
    liveRed: '#ef4444',
    background: '#fafafa',
    surface: '#ffffff',
    surface2: '#f4f4f5',
    surface3: '#e4e4e7',
    text: '#18181b',
    textSecondary: '#52525b',
    textMuted: '#a1a1aa',
    border: '#e4e4e7',
    miniPlayerBg: '#ecfdf5',
    tabBarBg: '#ffffff',
    headerBg: '#047857',
  },
};

export const darkTheme: Theme = {
  dark: true,
  colors: {
    primary: '#047857',
    primaryLight: '#059669',
    primaryDark: '#064e3b',
    gold: '#d4a853',
    goldLight: '#e8c672',
    liveRed: '#ef4444',
    background: '#09090b',
    surface: '#18181b',
    surface2: '#1f1f23',
    surface3: '#27272a',
    text: '#fafafa',
    textSecondary: '#a1a1aa',
    textMuted: '#71717a',
    border: '#27272a',
    miniPlayerBg: '#064e3b',
    tabBarBg: '#18181b',
    headerBg: '#064e3b',
  },
};
```

- [ ] **Step 4: Create `providers/ThemeProvider.tsx`**

```tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { lightTheme, darkTheme, Theme, ThemePref } from '../lib/theme';

// Re-export ThemePref from types
export type { ThemePref } from '../lib/types';

interface ThemeContextValue {
  theme: Theme;
  themePref: string;
  setThemePref: (pref: string) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: lightTheme,
  themePref: 'system',
  setThemePref: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [themePref, setThemePref] = useState<string>('system');

  const theme = (() => {
    if (themePref === 'light') return lightTheme;
    if (themePref === 'dark') return darkTheme;
    return systemScheme === 'dark' ? darkTheme : lightTheme;
  })();

  return (
    <ThemeContext.Provider value={{ theme, themePref, setThemePref }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
```

- [ ] **Step 5: Run tests**

```bash
npx jest __tests__/lib/theme.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add lib/theme.ts providers/ThemeProvider.tsx __tests__/lib/theme.test.ts
git commit -m "feat: add theme system with light/dark mode support"
```

---

### Task 5: Internationalization (i18n)

**Files:**
- Create: `lib/i18n.ts`, `lib/strings/en.ts`, `lib/strings/ur.ts`, `providers/I18nProvider.tsx`

- [ ] **Step 1: Create English strings**

Create `lib/strings/en.ts`:
```typescript
export default {
  tabs: {
    home: 'Home',
    library: 'Library',
    collection: 'Collection',
    profile: 'Profile',
    admin: 'Admin',
  },
  home: {
    title: 'Khanqah Maseeh-ul-Ummah',
    subtitle: 'Hazrat Mufti Abdur Rasheed Miftahi DB',
    liveNow: 'LIVE NOW',
    nextLive: 'NEXT LIVE',
    latestBayans: 'Latest Bayans',
    shortClips: 'Short Clips',
    seeAll: 'See all',
    join: 'Join',
  },
  library: {
    title: 'Library',
    search: 'Search bayans, clips, books...',
    bayans: 'Bayans',
    clips: 'Video Clips',
    nazams: 'Nazams',
    quran: 'Quran',
    hamdNaat: 'Hamd & Naat',
    books: 'Books',
  },
  collection: {
    title: 'My Collection',
    continueListen: 'Continue Listening',
    playlists: 'Playlists',
    downloads: 'Downloads',
    history: 'History',
    favourites: 'Favourites',
    newPlaylist: '+ New',
    remaining: 'remaining',
    itemsOffline: 'items available offline',
  },
  profile: {
    title: 'Profile',
    language: 'Language',
    theme: 'Theme',
    playbackSpeed: 'Playback Speed',
    skipInterval: 'Skip Interval',
    notifications: 'Notifications',
    aboutKhanqah: 'About the Khanqah',
    muftiBio: "Mufti Sahab's Bio",
    signOut: 'Sign Out',
  },
  player: {
    nowPlaying: 'NOW PLAYING',
    topics: 'Topics',
    speed: 'Speed',
    save: 'Save',
    share: 'Share',
    queue: 'Queue',
    live: 'LIVE',
    listening: 'listening',
  },
  admin: {
    title: 'Admin',
    goLive: 'Go Live',
    upload: 'Upload',
    content: 'Content',
    schedule: 'Schedule',
    team: 'Team',
    start: 'START',
    stopBroadcasting: 'Stop Broadcasting',
    listeners: 'Listeners',
    duration: 'Duration',
    autoSave: 'Auto-save to archive.org',
    sendNotification: 'Send push notification',
    publishContent: 'Publish Content',
    sessionTitle: 'Session Title',
    contentType: 'Content Type',
    titleEn: 'Title (English)',
    titleUr: 'Title (Urdu)',
    category: 'Category',
    mediaUrl: 'Media URL',
    thumbnail: 'Thumbnail',
    scheduleNew: '+ Schedule New Session',
    inviteMember: '+ Invite Team Member',
    recording: 'RECORDING',
  },
  auth: {
    signIn: 'Sign In',
    signUp: 'Sign Up',
    email: 'Email',
    password: 'Password',
    googleSignIn: 'Continue with Google',
    noAccount: "Don't have an account?",
    haveAccount: 'Already have an account?',
  },
  common: {
    on: 'On',
    off: 'Off',
    cancel: 'Cancel',
    save: 'Save',
    delete: 'Delete',
    edit: 'Edit',
    back: 'Back',
    min: 'min',
    daysAgo: 'days ago',
  },
};
```

- [ ] **Step 2: Create Urdu strings**

Create `lib/strings/ur.ts`:
```typescript
export default {
  tabs: {
    home: 'ہوم',
    library: 'لائبریری',
    collection: 'مجموعہ',
    profile: 'پروفائل',
    admin: 'ایڈمن',
  },
  home: {
    title: 'خانقاہ مسیح الامت',
    subtitle: 'حضرت مفتی عبدالرشید مفتاحی صاحب دامت برکاتہم',
    liveNow: 'ابھی لائیو',
    nextLive: 'اگلا لائیو',
    latestBayans: 'تازہ ترین بیانات',
    shortClips: 'مختصر کلپس',
    seeAll: 'سب دیکھیں',
    join: 'شامل ہوں',
  },
  library: {
    title: 'لائبریری',
    search: 'بیانات، کلپس، کتابیں تلاش کریں...',
    bayans: 'بیانات',
    clips: 'ویڈیو کلپس',
    nazams: 'نظمیں',
    quran: 'قرآن',
    hamdNaat: 'حمد و نعت',
    books: 'کتابیں',
  },
  collection: {
    title: 'میرا مجموعہ',
    continueListen: 'سننا جاری رکھیں',
    playlists: 'پلے لسٹس',
    downloads: 'ڈاؤن لوڈز',
    history: 'تاریخ',
    favourites: 'پسندیدہ',
    newPlaylist: '+ نئی',
    remaining: 'باقی',
    itemsOffline: 'آف لائن دستیاب',
  },
  profile: {
    title: 'پروفائل',
    language: 'زبان',
    theme: 'تھیم',
    playbackSpeed: 'پلے بیک رفتار',
    skipInterval: 'سکپ وقفہ',
    notifications: 'اطلاعات',
    aboutKhanqah: 'خانقاہ کے بارے میں',
    muftiBio: 'مفتی صاحب کا تعارف',
    signOut: 'سائن آؤٹ',
  },
  player: {
    nowPlaying: 'ابھی چل رہا ہے',
    topics: 'موضوعات',
    speed: 'رفتار',
    save: 'محفوظ',
    share: 'شیئر',
    queue: 'قطار',
    live: 'لائیو',
    listening: 'سن رہے ہیں',
  },
  admin: {
    title: 'ایڈمن',
    goLive: 'لائیو شروع کریں',
    upload: 'اپ لوڈ',
    content: 'مواد',
    schedule: 'شیڈول',
    team: 'ٹیم',
    start: 'شروع',
    stopBroadcasting: 'نشریات بند کریں',
    listeners: 'سامعین',
    duration: 'مدت',
    autoSave: 'خودکار محفوظ کریں',
    sendNotification: 'اطلاع بھیجیں',
    publishContent: 'مواد شائع کریں',
    sessionTitle: 'سیشن کا عنوان',
    contentType: 'مواد کی قسم',
    titleEn: 'عنوان (انگریزی)',
    titleUr: 'عنوان (اردو)',
    category: 'زمرہ',
    mediaUrl: 'میڈیا لنک',
    thumbnail: 'تصویر',
    scheduleNew: '+ نیا شیڈول',
    inviteMember: '+ ٹیم ممبر مدعو کریں',
    recording: 'ریکارڈنگ',
  },
  auth: {
    signIn: 'سائن ان',
    signUp: 'سائن اپ',
    email: 'ای میل',
    password: 'پاس ورڈ',
    googleSignIn: 'گوگل سے جاری رکھیں',
    noAccount: 'اکاؤنٹ نہیں ہے؟',
    haveAccount: 'پہلے سے اکاؤنٹ ہے؟',
  },
  common: {
    on: 'آن',
    off: 'آف',
    cancel: 'منسوخ',
    save: 'محفوظ',
    delete: 'حذف',
    edit: 'ترمیم',
    back: 'واپس',
    min: 'منٹ',
    daysAgo: 'دن پہلے',
  },
};
```

- [ ] **Step 3: Create i18n setup**

Create `lib/i18n.ts`:
```typescript
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './strings/en';
import ur from './strings/ur';

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    ur: { translation: ur },
  },
  lng: 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

export default i18n;
```

- [ ] **Step 4: Create `providers/I18nProvider.tsx`**

```tsx
import React, { createContext, useContext, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import '../lib/i18n';

interface I18nContextValue {
  language: string;
  setLanguage: (lang: 'en' | 'ur') => void;
  t: (key: string) => string;
}

const I18nContext = createContext<I18nContextValue>({
  language: 'en',
  setLanguage: () => {},
  t: (key: string) => key,
});

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const { t, i18n } = useTranslation();

  const setLanguage = useCallback((lang: 'en' | 'ur') => {
    i18n.changeLanguage(lang);
  }, [i18n]);

  return (
    <I18nContext.Provider value={{ language: i18n.language, setLanguage, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}
```

- [ ] **Step 5: Commit**

```bash
git add lib/i18n.ts lib/strings/ providers/I18nProvider.tsx
git commit -m "feat: add i18n with English and Urdu translations"
```

---

### Task 6: Auth Provider + Login Screen

**Files:**
- Create: `providers/AuthProvider.tsx`, `hooks/useAuth.ts`, `app/(auth)/_layout.tsx`, `app/(auth)/login.tsx`

- [ ] **Step 1: Create `providers/AuthProvider.tsx`**

```tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { User, UserRole } from '../lib/types';

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, name: string) => Promise<void>;
  signOut: () => Promise<void>;
  isAdmin: boolean;
  isEditor: boolean;
}

const AuthContext = createContext<AuthContextValue>({
  session: null,
  user: null,
  loading: true,
  signInWithEmail: async () => {},
  signUpWithEmail: async () => {},
  signOut: async () => {},
  isAdmin: false,
  isEditor: false,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) fetchProfile(session.user.id);
      else setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) fetchProfile(session.user.id);
      else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function fetchProfile(userId: string) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (data) setUser(data as User);
    setLoading(false);
  }

  async function signInWithEmail(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }

  async function signUpWithEmail(email: string, password: string, name: string) {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name } },
    });
    if (error) throw error;
  }

  async function signOut() {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  }

  const isAdmin = user?.role === 'admin';
  const isEditor = user?.role === 'editor' || isAdmin;

  return (
    <AuthContext.Provider value={{
      session, user, loading,
      signInWithEmail, signUpWithEmail, signOut,
      isAdmin, isEditor,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
```

- [ ] **Step 2: Create `hooks/useAuth.ts`** (re-export for convenience)

```typescript
export { useAuth } from '../providers/AuthProvider';
```

- [ ] **Step 3: Create `app/(auth)/_layout.tsx`**

```tsx
import { Stack } from 'expo-router';

export default function AuthLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
```

- [ ] **Step 4: Create `app/(auth)/login.tsx`**

```tsx
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { useAuth } from '../../providers/AuthProvider';
import { useTheme } from '../../providers/ThemeProvider';
import { useI18n } from '../../providers/I18nProvider';

export default function LoginScreen() {
  const { signInWithEmail, signUpWithEmail } = useAuth();
  const { theme } = useTheme();
  const { t } = useI18n();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const colors = theme.colors;

  async function handleSubmit() {
    if (!email || !password) return;
    setLoading(true);
    try {
      if (isSignUp) {
        await signUpWithEmail(email, password, name);
      } else {
        await signInWithEmail(email, password);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.primary }]}>
          Khanqah Maseeh-ul-Ummah
        </Text>
        <Text style={[styles.arabic, { color: colors.gold }]}>
          خانقاہ مسیح الامت
        </Text>
      </View>

      <View style={styles.form}>
        {isSignUp && (
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
            placeholder="Full Name"
            placeholderTextColor={colors.textMuted}
            value={name}
            onChangeText={setName}
          />
        )}
        <TextInput
          style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
          placeholder={t('auth.email')}
          placeholderTextColor={colors.textMuted}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <TextInput
          style={[styles.input, { backgroundColor: colors.surface, color: colors.text, borderColor: colors.border }]}
          placeholder={t('auth.password')}
          placeholderTextColor={colors.textMuted}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.primary }]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>
              {isSignUp ? t('auth.signUp') : t('auth.signIn')}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setIsSignUp(!isSignUp)} style={styles.toggleBtn}>
          <Text style={[styles.toggleText, { color: colors.primaryLight }]}>
            {isSignUp ? t('auth.haveAccount') : t('auth.noAccount')}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24 },
  header: { alignItems: 'center', marginBottom: 40 },
  title: { fontSize: 22, fontWeight: '700' },
  arabic: { fontSize: 18, fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif', marginTop: 4 },
  form: { gap: 12 },
  input: { borderWidth: 1, borderRadius: 12, padding: 14, fontSize: 15 },
  button: { borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 8 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  toggleBtn: { alignItems: 'center', marginTop: 16 },
  toggleText: { fontSize: 14 },
});
```

- [ ] **Step 5: Commit**

```bash
git add providers/AuthProvider.tsx hooks/useAuth.ts app/\(auth\)/
git commit -m "feat: add auth provider and login screen"
```

---

### Task 7: Root Layout + Tab Navigator

**Files:**
- Create: `app/_layout.tsx`, `app/(tabs)/_layout.tsx`

- [ ] **Step 1: Create root layout `app/_layout.tsx`**

```tsx
import React from 'react';
import { Slot, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from '../providers/AuthProvider';
import { ThemeProvider, useTheme } from '../providers/ThemeProvider';
import { I18nProvider } from '../providers/I18nProvider';
import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';

function AuthGate() {
  const { session, loading } = useAuth();
  const { theme } = useTheme();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (loading) return;
    const inAuthGroup = segments[0] === '(auth)';

    if (!session && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (session && inAuthGroup) {
      router.replace('/(tabs)');
    }
  }, [session, loading, segments]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background }}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <>
      <StatusBar style={theme.dark ? 'light' : 'dark'} />
      <Slot />
    </>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <I18nProvider>
        <AuthProvider>
          <AuthGate />
        </AuthProvider>
      </I18nProvider>
    </ThemeProvider>
  );
}
```

- [ ] **Step 2: Create tab navigator `app/(tabs)/_layout.tsx`**

```tsx
import React from 'react';
import { Tabs } from 'expo-router';
import { useTheme } from '../../providers/ThemeProvider';
import { useAuth } from '../../providers/AuthProvider';
import { useI18n } from '../../providers/I18nProvider';
import { View } from 'react-native';

export default function TabLayout() {
  const { theme } = useTheme();
  const { isAdmin, isEditor } = useAuth();
  const { t } = useI18n();
  const colors = theme.colors;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.tabBarBg,
          borderTopColor: colors.border,
          borderTopWidth: 1,
        },
        tabBarActiveTintColor: colors.primaryLight,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: { fontSize: 10, fontWeight: '500' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabs.home'),
          tabBarIcon: ({ color }) => <TabIcon emoji="🏠" color={color} />,
        }}
      />
      <Tabs.Screen
        name="library"
        options={{
          title: t('tabs.library'),
          tabBarIcon: ({ color }) => <TabIcon emoji="📚" color={color} />,
        }}
      />
      <Tabs.Screen
        name="collection"
        options={{
          title: t('tabs.collection'),
          tabBarIcon: ({ color }) => <TabIcon emoji="❤" color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: isAdmin || isEditor ? t('tabs.admin') : t('tabs.profile'),
          tabBarIcon: ({ color }) => (
            <TabIcon emoji={isAdmin || isEditor ? '⚙' : '👤'} color={color} />
          ),
          // Admin/editor users get redirected to admin screen
          href: isAdmin || isEditor ? '/admin' : '/(tabs)/profile',
        }}
      />
    </Tabs>
  );
}

function TabIcon({ emoji, color }: { emoji: string; color: string }) {
  return (
    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ fontSize: 20, opacity: color === '#71717a' ? 0.5 : 1 }}>
        {/* Using Text for emoji icons — replace with proper icon library later */}
        <View><></></View>
      </View>
    </View>
  );
}
```

Note: The tab icons use emoji placeholders. In implementation, replace with `@expo/vector-icons` (Ionicons or MaterialCommunityIcons) for proper icons.

- [ ] **Step 3: Commit**

```bash
git add app/_layout.tsx app/\(tabs\)/_layout.tsx
git commit -m "feat: add root layout with auth gate and tab navigator"
```

---

### Task 8: Home Screen

**Files:**
- Create: `app/(tabs)/index.tsx`, `components/LiveBanner.tsx`, `components/NextLiveCard.tsx`, `components/ContentCard.tsx`, `hooks/useContent.ts`, `hooks/useLiveSession.ts`, `hooks/useScheduledSessions.ts`

- [ ] **Step 1: Create `components/ContentCard.tsx`**

```tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../providers/ThemeProvider';
import type { Content } from '../lib/types';

interface ContentCardProps {
  content: Content;
  onPress: () => void;
  language?: 'en' | 'ur';
}

const typeIcons: Record<string, string> = {
  bayan: '🎙',
  clip: '🎥',
  nazam: '🎶',
  quran: '📖',
  hamd_naat: '🙌',
  book: '📕',
};

export function ContentCard({ content, onPress, language = 'en' }: ContentCardProps) {
  const { theme } = useTheme();
  const colors = theme.colors;
  const title = language === 'ur' ? content.title_ur : content.title_en;
  const icon = typeIcons[content.type] || '🎙';

  const durationText = content.duration
    ? `${Math.round(content.duration / 60)} min`
    : content.type === 'book' ? 'PDF' : '';

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.surface, borderColor: theme.dark ? 'transparent' : colors.surface3 }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.thumb, { backgroundColor: theme.dark ? colors.primaryDark : '#ecfdf5' }]}>
        <Text style={styles.thumbIcon}>{icon}</Text>
      </View>
      <View style={styles.info}>
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>{title}</Text>
        <Text style={[styles.meta, { color: colors.textMuted }]}>
          {durationText}{content.is_video ? ' • Video' : ''}
        </Text>
      </View>
      <Text style={[styles.action, { color: colors.textMuted }]}>▶</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', padding: 10, borderRadius: 12, marginBottom: 8, gap: 10, borderWidth: 1 },
  thumb: { width: 44, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  thumbIcon: { fontSize: 18 },
  info: { flex: 1, minWidth: 0 },
  title: { fontSize: 13, fontWeight: '600' },
  meta: { fontSize: 11, marginTop: 1 },
  action: { fontSize: 14 },
});
```

- [ ] **Step 2: Create `components/LiveBanner.tsx`**

```tsx
import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { useTheme } from '../providers/ThemeProvider';
import { useI18n } from '../providers/I18nProvider';
import type { LiveSession } from '../lib/types';

interface LiveBannerProps {
  session: LiveSession;
  onPress: () => void;
}

export function LiveBanner({ session, onPress }: LiveBannerProps) {
  const { theme } = useTheme();
  const { t, language } = useI18n();
  const dotAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(dotAnim, { toValue: 0.3, duration: 500, useNativeDriver: true }),
        Animated.timing(dotAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, []);

  const title = language === 'ur' ? session.title_ur : session.title_en;

  return (
    <TouchableOpacity
      style={[styles.banner, {
        backgroundColor: theme.dark ? '#7f1d1d' : '#fef2f2',
        borderColor: theme.dark ? 'rgba(239,68,68,0.3)' : '#fecaca',
      }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Animated.View style={[styles.dot, { opacity: dotAnim }]} />
      <View style={styles.info}>
        <Text style={[styles.label, { color: theme.dark ? '#fca5a5' : '#dc2626' }]}>
          {t('home.liveNow')}
        </Text>
        <Text style={[styles.title, { color: theme.dark ? '#fff' : '#18181b' }]}>
          {title}
        </Text>
      </View>
      <View style={styles.joinBtn}>
        <Text style={styles.joinText}>{t('home.join')}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  banner: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 14, marginBottom: 12, gap: 10, borderWidth: 1 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#ef4444' },
  info: { flex: 1 },
  label: { fontSize: 9, fontWeight: '700', letterSpacing: 1 },
  title: { fontSize: 13, fontWeight: '600', marginTop: 1 },
  joinBtn: { backgroundColor: '#ef4444', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 },
  joinText: { color: '#fff', fontSize: 11, fontWeight: '600' },
});
```

- [ ] **Step 3: Create `components/NextLiveCard.tsx`**

```tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../providers/ThemeProvider';
import { useI18n } from '../providers/I18nProvider';
import type { ScheduledSession } from '../lib/types';

interface NextLiveCardProps {
  session: ScheduledSession;
}

export function NextLiveCard({ session }: NextLiveCardProps) {
  const { theme } = useTheme();
  const { t, language } = useI18n();
  const colors = theme.colors;
  const title = language === 'ur' ? session.title_ur : session.title_en;

  const dateStr = new Date(session.scheduled_at).toLocaleDateString('en-US', {
    weekday: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text style={styles.icon}>📅</Text>
      <View style={styles.info}>
        <Text style={[styles.label, { color: colors.textMuted }]}>{t('home.nextLive')}</Text>
        <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      </View>
      <Text style={[styles.time, { color: colors.gold }]}>{dateStr}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 14, marginBottom: 12, gap: 10, borderWidth: 1 },
  icon: { fontSize: 22 },
  info: { flex: 1 },
  label: { fontSize: 9, fontWeight: '700', letterSpacing: 1 },
  title: { fontSize: 13, fontWeight: '600', marginTop: 1 },
  time: { fontSize: 11, fontWeight: '500' },
});
```

- [ ] **Step 4: Create `hooks/useContent.ts`**

```typescript
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Content, ContentType } from '../lib/types';

export function useLatestContent(type?: ContentType, limit = 5) {
  const [data, setData] = useState<Content[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetch() {
      let query = supabase
        .from('content')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (type) query = query.eq('type', type);

      const { data: results, error } = await query;
      if (results) setData(results as Content[]);
      setLoading(false);
    }
    fetch();
  }, [type, limit]);

  return { data, loading };
}

export function useContentByCategory(categoryId: string) {
  const [data, setData] = useState<Content[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetch() {
      const { data: results } = await supabase
        .from('content')
        .select('*')
        .eq('category_id', categoryId)
        .order('created_at', { ascending: false });

      if (results) setData(results as Content[]);
      setLoading(false);
    }
    fetch();
  }, [categoryId]);

  return { data, loading };
}

export function useSearchContent(query: string) {
  const [data, setData] = useState<Content[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!query || query.length < 2) {
      setData([]);
      return;
    }

    setLoading(true);
    const timeout = setTimeout(async () => {
      const { data: results } = await supabase
        .from('content')
        .select('*')
        .or(`title_en.ilike.%${query}%,title_ur.ilike.%${query}%`)
        .order('created_at', { ascending: false })
        .limit(20);

      if (results) setData(results as Content[]);
      setLoading(false);
    }, 300); // debounce

    return () => clearTimeout(timeout);
  }, [query]);

  return { data, loading };
}
```

- [ ] **Step 5: Create `hooks/useLiveSession.ts`**

```typescript
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { LiveSession } from '../lib/types';

export function useLiveSession() {
  const [liveSession, setLiveSession] = useState<LiveSession | null>(null);

  useEffect(() => {
    // Fetch current live session
    async function fetchLive() {
      const { data } = await supabase
        .from('live_sessions')
        .select('*')
        .eq('status', 'live')
        .order('started_at', { ascending: false })
        .limit(1)
        .single();

      if (data) setLiveSession(data as LiveSession);
    }
    fetchLive();

    // Subscribe to realtime changes
    const channel = supabase
      .channel('live_sessions')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'live_sessions' },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const session = payload.new as LiveSession;
            if (session.status === 'live') {
              setLiveSession(session);
            } else {
              setLiveSession(null);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return liveSession;
}
```

- [ ] **Step 6: Create `hooks/useScheduledSessions.ts`**

```typescript
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { ScheduledSession } from '../lib/types';

export function useNextScheduledSession() {
  const [session, setSession] = useState<ScheduledSession | null>(null);

  useEffect(() => {
    async function fetch() {
      const { data } = await supabase
        .from('scheduled_sessions')
        .select('*')
        .gte('scheduled_at', new Date().toISOString())
        .order('scheduled_at', { ascending: true })
        .limit(1)
        .single();

      if (data) setSession(data as ScheduledSession);
    }
    fetch();
  }, []);

  return session;
}
```

- [ ] **Step 7: Create Home screen `app/(tabs)/index.tsx`**

```tsx
import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../providers/ThemeProvider';
import { useI18n } from '../../providers/I18nProvider';
import { useLatestContent } from '../../hooks/useContent';
import { useLiveSession } from '../../hooks/useLiveSession';
import { useNextScheduledSession } from '../../hooks/useScheduledSessions';
import { ContentCard } from '../../components/ContentCard';
import { LiveBanner } from '../../components/LiveBanner';
import { NextLiveCard } from '../../components/NextLiveCard';

export default function HomeScreen() {
  const { theme } = useTheme();
  const { t, language } = useI18n();
  const router = useRouter();
  const colors = theme.colors;

  const liveSession = useLiveSession();
  const nextSession = useNextScheduledSession();
  const { data: latestBayans } = useLatestContent('bayan', 3);
  const { data: latestClips } = useLatestContent('clip', 3);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Islamic Header */}
      <View style={[styles.header, { backgroundColor: colors.headerBg }]}>
        <Text style={styles.headerTitle}>{t('home.title')}</Text>
        <Text style={styles.headerArabic}>خانقاہ مسیح الامت</Text>
        <Text style={styles.headerSubtitle}>{t('home.subtitle')}</Text>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* Live Banner */}
        {liveSession && (
          <LiveBanner session={liveSession} onPress={() => router.push('/player/live')} />
        )}

        {/* Next Live */}
        {nextSession && !liveSession && (
          <NextLiveCard session={nextSession} />
        )}

        {/* Latest Bayans */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('home.latestBayans')}</Text>
            <Text style={[styles.seeAll, { color: colors.primaryLight }]}>{t('home.seeAll')}</Text>
          </View>
          {latestBayans.map((item) => (
            <ContentCard
              key={item.id}
              content={item}
              language={language as 'en' | 'ur'}
              onPress={() => router.push(`/player/${item.id}`)}
            />
          ))}
        </View>

        {/* Short Clips */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('home.shortClips')}</Text>
            <Text style={[styles.seeAll, { color: colors.primaryLight }]}>{t('home.seeAll')}</Text>
          </View>
          {latestClips.map((item) => (
            <ContentCard
              key={item.id}
              content={item}
              language={language as 'en' | 'ur'}
              onPress={() => router.push(`/player/${item.id}`)}
            />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 16, paddingTop: 56 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#fff' },
  headerArabic: { fontSize: 14, color: '#fde68a', marginTop: 2 },
  headerSubtitle: { fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  scroll: { flex: 1 },
  scrollContent: { padding: 14, paddingBottom: 80 },
  section: { marginBottom: 8 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  sectionTitle: { fontSize: 15, fontWeight: '700' },
  seeAll: { fontSize: 12, fontWeight: '500' },
});
```

- [ ] **Step 8: Verify app renders**

```bash
npx expo start --web
```

Expected: Home screen shows with Islamic header, section headers for bayans and clips. No data yet (empty) but UI renders without crashes.

- [ ] **Step 9: Commit**

```bash
git add components/ hooks/useContent.ts hooks/useLiveSession.ts hooks/useScheduledSessions.ts app/\(tabs\)/index.tsx
git commit -m "feat: add Home screen with live banner, next live, and content cards"
```

---

### Task 9: Library Screen + Category Tiles

**Files:**
- Create: `app/(tabs)/library.tsx`, `components/CategoryTile.tsx`, `hooks/useCategories.ts`

This task creates the Library tab with 6 category tiles and search bar. Each tile links to a category listing screen (created in Phase 2).

- [ ] **Step 1: Create `hooks/useCategories.ts`**

```typescript
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { Category } from '../lib/types';

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetch() {
      const { data } = await supabase
        .from('categories')
        .select('*')
        .is('parent_id', null)
        .order('sort_order', { ascending: true });

      if (data) setCategories(data as Category[]);
      setLoading(false);
    }
    fetch();
  }, []);

  return { categories, loading };
}

export function useCategoryContentCount(categoryId: string) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    async function fetch() {
      const { count: total } = await supabase
        .from('content')
        .select('*', { count: 'exact', head: true })
        .eq('category_id', categoryId);

      if (total !== null) setCount(total);
    }
    fetch();
  }, [categoryId]);

  return count;
}
```

- [ ] **Step 2: Create `components/CategoryTile.tsx`**

```tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../providers/ThemeProvider';
import type { ContentType } from '../lib/types';

interface CategoryTileProps {
  icon: string;
  name: string;
  count: number;
  type: ContentType;
  onPress: () => void;
}

const tileColors: Record<ContentType, { light: string; dark: string; border: string }> = {
  bayan: { light: '#ecfdf5', dark: 'rgba(4,120,87,0.1)', border: 'rgba(4,120,87,0.2)' },
  clip: { light: '#fef3c7', dark: 'rgba(212,168,83,0.08)', border: 'rgba(212,168,83,0.15)' },
  nazam: { light: '#ede9fe', dark: 'rgba(139,92,246,0.08)', border: 'rgba(139,92,246,0.15)' },
  quran: { light: '#dbeafe', dark: 'rgba(59,130,246,0.08)', border: 'rgba(59,130,246,0.15)' },
  hamd_naat: { light: '#fce7f3', dark: 'rgba(236,72,153,0.08)', border: 'rgba(236,72,153,0.15)' },
  book: { light: '#ffedd5', dark: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.15)' },
};

export function CategoryTile({ icon, name, count, type, onPress }: CategoryTileProps) {
  const { theme } = useTheme();
  const colors = theme.colors;
  const tileColor = tileColors[type];

  return (
    <TouchableOpacity
      style={[styles.tile, {
        backgroundColor: theme.dark ? tileColor.dark : tileColor.light,
        borderColor: theme.dark ? tileColor.border : colors.border,
      }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={styles.icon}>{icon}</Text>
      <Text style={[styles.name, { color: colors.text }]}>{name}</Text>
      <Text style={[styles.count, { color: colors.textMuted }]}>{count} items</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  tile: { borderRadius: 14, padding: 16, alignItems: 'center', borderWidth: 1 },
  icon: { fontSize: 28, marginBottom: 4 },
  name: { fontSize: 12, fontWeight: '600' },
  count: { fontSize: 10, marginTop: 1 },
});
```

- [ ] **Step 3: Create Library screen `app/(tabs)/library.tsx`**

```tsx
import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../providers/ThemeProvider';
import { useI18n } from '../../providers/I18nProvider';
import { useCategories } from '../../hooks/useCategories';
import { CategoryTile } from '../../components/CategoryTile';
import { SearchBar } from '../../components/SearchBar';

const categoryIcons: Record<string, string> = {
  bayan: '🎙',
  clip: '🎥',
  nazam: '🎶',
  quran: '📖',
  hamd_naat: '🙌',
  book: '📕',
};

export default function LibraryScreen() {
  const { theme } = useTheme();
  const { t, language } = useI18n();
  const router = useRouter();
  const { categories } = useCategories();
  const colors = theme.colors;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>{t('library.title')}</Text>
      </View>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <SearchBar
          placeholder={t('library.search')}
          onPress={() => router.push('/library/search')}
        />
        <View style={styles.grid}>
          {categories.map((cat) => (
            <CategoryTile
              key={cat.id}
              icon={categoryIcons[cat.type] || '📁'}
              name={language === 'ur' ? cat.name_ur : cat.name_en}
              count={0} // Will be populated with actual counts
              type={cat.type}
              onPress={() => router.push(`/library/${cat.id}`)}
            />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 16, paddingTop: 56 },
  title: { fontSize: 22, fontWeight: '700' },
  scrollContent: { padding: 14, paddingBottom: 80 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
});
```

Note: The grid needs each tile to be ~48% width. Add this to CategoryTile wrapper or use a FlatList with numColumns={2}.

- [ ] **Step 4: Create `components/SearchBar.tsx`**

```tsx
import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useTheme } from '../providers/ThemeProvider';

interface SearchBarProps {
  placeholder: string;
  onPress: () => void;
}

export function SearchBar({ placeholder, onPress }: SearchBarProps) {
  const { theme } = useTheme();
  const colors = theme.colors;

  return (
    <TouchableOpacity
      style={[styles.bar, { backgroundColor: colors.surface, borderColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={styles.icon}>🔍</Text>
      <Text style={[styles.text, { color: colors.textMuted }]}>{placeholder}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', padding: 10, borderRadius: 12, borderWidth: 1, gap: 8, marginBottom: 14 },
  icon: { fontSize: 14 },
  text: { fontSize: 13 },
});
```

- [ ] **Step 5: Commit**

```bash
git add hooks/useCategories.ts components/CategoryTile.tsx components/SearchBar.tsx app/\(tabs\)/library.tsx
git commit -m "feat: add Library screen with category grid and search bar"
```

---

### Task 10: Collection + Profile Screens (Skeleton)

**Files:**
- Create: `app/(tabs)/collection.tsx`, `app/(tabs)/profile.tsx`

- [ ] **Step 1: Create Collection screen `app/(tabs)/collection.tsx`**

```tsx
import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../../providers/ThemeProvider';
import { useI18n } from '../../providers/I18nProvider';

export default function CollectionScreen() {
  const { theme } = useTheme();
  const { t } = useI18n();
  const colors = theme.colors;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>{t('collection.title')}</Text>
      </View>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Continue Listening — populated in Phase 2 */}
        <SectionHeader title={t('collection.continueListen')} colors={colors} />
        <EmptyState text="Nothing playing yet" colors={colors} />

        {/* Playlists */}
        <SectionHeader title={t('collection.playlists')} action={t('collection.newPlaylist')} colors={colors} />
        <EmptyState text="No playlists yet" colors={colors} />

        {/* Downloads */}
        <SectionHeader title={t('collection.downloads')} colors={colors} />
        <EmptyState text="No downloads yet" colors={colors} />

        {/* History */}
        <SectionHeader title={t('collection.history')} action={t('home.seeAll')} colors={colors} />
        <EmptyState text="No listening history" colors={colors} />
      </ScrollView>
    </View>
  );
}

function SectionHeader({ title, action, colors }: { title: string; action?: string; colors: any }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
      {action && <Text style={[styles.seeAll, { color: colors.primaryLight }]}>{action}</Text>}
    </View>
  );
}

function EmptyState({ text, colors }: { text: string; colors: any }) {
  return (
    <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text style={[styles.emptyText, { color: colors.textMuted }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 16, paddingTop: 56 },
  title: { fontSize: 22, fontWeight: '700' },
  scrollContent: { padding: 14, paddingBottom: 80 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, marginTop: 8 },
  sectionTitle: { fontSize: 15, fontWeight: '700' },
  seeAll: { fontSize: 12, fontWeight: '500' },
  emptyCard: { padding: 20, borderRadius: 14, alignItems: 'center', borderWidth: 1, marginBottom: 12 },
  emptyText: { fontSize: 13 },
});
```

- [ ] **Step 2: Create Profile screen `app/(tabs)/profile.tsx`**

```tsx
import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useTheme } from '../../providers/ThemeProvider';
import { useI18n } from '../../providers/I18nProvider';
import { useAuth } from '../../providers/AuthProvider';

export default function ProfileScreen() {
  const { theme, themePref, setThemePref } = useTheme();
  const { t, language, setLanguage } = useI18n();
  const { user, signOut } = useAuth();
  const colors = theme.colors;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>{t('profile.title')}</Text>
      </View>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* User card */}
        <View style={[styles.userCard, { backgroundColor: colors.surface }]}>
          <View style={[styles.avatar, { backgroundColor: colors.primaryDark, borderColor: colors.gold }]}>
            <Text style={styles.avatarText}>👤</Text>
          </View>
          <Text style={[styles.userName, { color: colors.text }]}>{user?.display_name || 'User'}</Text>
          <Text style={[styles.userEmail, { color: colors.textMuted }]}>{user?.email}</Text>
        </View>

        {/* Settings */}
        <ProfileItem
          icon="🌐" label={t('profile.language')}
          value={language === 'en' ? 'English' : 'اردو'}
          onPress={() => setLanguage(language === 'en' ? 'ur' : 'en')}
          colors={colors}
        />
        <ProfileItem
          icon="🎨" label={t('profile.theme')}
          value={themePref}
          onPress={() => {
            const next = themePref === 'system' ? 'light' : themePref === 'light' ? 'dark' : 'system';
            setThemePref(next);
          }}
          colors={colors}
        />
        <ProfileItem icon="▶" label={t('profile.playbackSpeed')} value="1.0x" colors={colors} />
        <ProfileItem icon="🔔" label={t('profile.notifications')} value={t('common.on')} colors={colors} />

        <View style={{ marginTop: 16 }}>
          <ProfileItem icon="🏛" label={t('profile.aboutKhanqah')} colors={colors} />
          <ProfileItem icon="📖" label={t('profile.muftiBio')} colors={colors} />
        </View>

        <TouchableOpacity
          style={[styles.signOutBtn, { borderColor: colors.liveRed }]}
          onPress={() => Alert.alert('Sign Out', 'Are you sure?', [
            { text: t('common.cancel') },
            { text: t('profile.signOut'), style: 'destructive', onPress: signOut },
          ])}
        >
          <Text style={[styles.signOutText, { color: colors.liveRed }]}>{t('profile.signOut')}</Text>
        </TouchableOpacity>

        <Text style={[styles.version, { color: colors.textMuted }]}>v1.0.0</Text>
      </ScrollView>
    </View>
  );
}

function ProfileItem({ icon, label, value, onPress, colors }: any) {
  return (
    <TouchableOpacity
      style={[styles.profileItem, { backgroundColor: colors.surface, borderColor: colors.border }]}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={styles.piLeft}>
        <Text style={styles.piIcon}>{icon}</Text>
        <Text style={[styles.piLabel, { color: colors.text }]}>{label}</Text>
      </View>
      {value && <Text style={[styles.piValue, { color: colors.textMuted }]}>{value} ›</Text>}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 16, paddingTop: 56 },
  title: { fontSize: 22, fontWeight: '700' },
  scrollContent: { padding: 14, paddingBottom: 80 },
  userCard: { alignItems: 'center', padding: 20, borderRadius: 14, marginBottom: 16 },
  avatar: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', borderWidth: 2, marginBottom: 10 },
  avatarText: { fontSize: 24 },
  userName: { fontSize: 16, fontWeight: '700' },
  userEmail: { fontSize: 12, marginTop: 2 },
  profileItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, borderRadius: 12, marginBottom: 6, borderWidth: 1 },
  piLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  piIcon: { fontSize: 16, width: 22, textAlign: 'center' },
  piLabel: { fontSize: 13, fontWeight: '500' },
  piValue: { fontSize: 12 },
  signOutBtn: { borderWidth: 1, borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 20 },
  signOutText: { fontSize: 14, fontWeight: '600' },
  version: { textAlign: 'center', fontSize: 11, marginTop: 16 },
});
```

- [ ] **Step 3: Commit**

```bash
git add app/\(tabs\)/collection.tsx app/\(tabs\)/profile.tsx
git commit -m "feat: add Collection and Profile screens"
```

---

## Phase 2: Audio Player + Collection Features

This phase delivers: react-native-track-player integration, mini player, full player, topics navigation, playlists, downloads, listening progress, history. The app becomes a functional audio player.

Tasks 11-16 cover: player service setup, MiniPlayer component, full player screen, playlist CRUD, download management, listening progress sync.

**These tasks follow the same pattern as Phase 1 — exact files, complete code, test-first where applicable. Due to plan length, I'll provide the task outlines with key code. Each task should take 15-30 minutes.**

---

### Task 11: Player Service + Provider

**Files:**
- Create: `services/player-service.ts`, `providers/PlayerProvider.tsx`, `hooks/usePlayer.ts`

Key implementation: Initialize react-native-track-player with playback service, create PlayerProvider that wraps the app and exposes play/pause/seek/queue/speed controls via context.

- [ ] **Step 1: Create `services/player-service.ts`** — TrackPlayer.setupPlayer(), register playback service, define capabilities (play, pause, skip, seek, stop)

- [ ] **Step 2: Create `providers/PlayerProvider.tsx`** — Context with currentTrack, isPlaying, position, duration, playbackSpeed, queue. Subscribe to TrackPlayer events (playback-state, playback-track-changed, playback-progress-updated).

- [ ] **Step 3: Create `hooks/usePlayer.ts`** — Re-export from PlayerProvider: `play(content)`, `pause()`, `seekTo(seconds)`, `setSpeed(rate)`, `addToQueue(content[])`, `skipToNext()`, `skipToPrevious()`.

- [ ] **Step 4: Wire PlayerProvider into `app/_layout.tsx`** — Wrap inside ThemeProvider/AuthProvider.

- [ ] **Step 5: Commit**

---

### Task 12: Mini Player Component

**Files:**
- Create: `components/MiniPlayer.tsx`
- Modify: `app/(tabs)/_layout.tsx` — add MiniPlayer above tab bar

Key implementation: Persistent bar showing current track thumbnail, title, artist, play/pause button, thin progress bar. Taps navigate to full player.

- [ ] **Step 1: Create `components/MiniPlayer.tsx`** — Uses usePlayer hook for state, shows gold progress bar, themed backgrounds (green gradient dark, light green light mode).

- [ ] **Step 2: Add MiniPlayer to tab layout** — Position absolutely above the tab bar in `(tabs)/_layout.tsx`.

- [ ] **Step 3: Commit**

---

### Task 13: Full Audio Player Screen

**Files:**
- Create: `app/player/[id].tsx`, `components/PlayerControls.tsx`, `components/TopicsList.tsx`

Key implementation: Full-screen player with artwork (Islamic pattern overlay), progress bar with gold dot, controls (prev, -15s, play/pause, +15s, next), speed selector, download/share/queue actions, topics panel.

- [ ] **Step 1: Create `components/PlayerControls.tsx`** — Play/pause circle button, skip buttons, speed pill.

- [ ] **Step 2: Create `components/TopicsList.tsx`** — Fetches topics for content_id, renders list with timestamps. Tap seeks to timestamp.

- [ ] **Step 3: Create `app/player/[id].tsx`** — Full player screen. Fetches content by ID, loads into TrackPlayer, shows artwork/controls/topics.

- [ ] **Step 4: Commit**

---

### Task 14: Playlists + Favourites

**Files:**
- Create: `hooks/usePlaylists.ts`
- Modify: `app/(tabs)/collection.tsx` — wire up playlists section

Key implementation: CRUD for playlists via Supabase. Auto-create "Favourites" playlist on first use. Add/remove items. Display in Collection tab.

- [ ] **Step 1: Create `hooks/usePlaylists.ts`** — `usePlaylists()`, `usePlaylistItems(playlistId)`, `createPlaylist(name)`, `addToPlaylist(playlistId, contentId)`, `removeFromPlaylist(itemId)`, `ensureFavourites()`.

- [ ] **Step 2: Update Collection screen** — Show playlists list, create new playlist button.

- [ ] **Step 3: Commit**

---

### Task 15: Downloads + Offline Playback

**Files:**
- Create: `hooks/useDownloads.ts`, `services/offline-db.ts`
- Modify: `app/(tabs)/collection.tsx` — wire up downloads section

Key implementation: Download audio from archive.org using expo-file-system. Track in SQLite + Supabase. Play from local file when offline.

- [ ] **Step 1: Create `services/offline-db.ts`** — expo-sqlite schema (content_cache, downloads, listening_progress), CRUD functions.

- [ ] **Step 2: Create `hooks/useDownloads.ts`** — `downloadContent(content)`, `deleteDownload(contentId)`, `useDownloads()` (list all), `getLocalPath(contentId)`.

- [ ] **Step 3: Update Collection screen** — Show downloads with storage used.

- [ ] **Step 4: Commit**

---

### Task 16: Listening Progress + History

**Files:**
- Create: `hooks/useListeningProgress.ts`
- Modify: `app/(tabs)/collection.tsx`, `providers/PlayerProvider.tsx`

Key implementation: Save progress every 10 seconds to Supabase (upsert). Show "Continue Listening" card. History = all progress entries sorted by updated_at.

- [ ] **Step 1: Create `hooks/useListeningProgress.ts`** — `saveProgress(contentId, positionSeconds)`, `useProgress(contentId)`, `useContinueListening()`, `useHistory()`.

- [ ] **Step 2: Update PlayerProvider** — Auto-save progress every 10 seconds while playing.

- [ ] **Step 3: Update Collection screen** — Wire up Continue Listening and History sections.

- [ ] **Step 4: Commit**

---

## Phase 3: Admin Features

This phase delivers: admin dashboard, upload content, manage content, manage categories, schedule sessions, team management.

---

### Task 17: Admin Navigation + Dashboard

**Files:**
- Create: `app/admin/_layout.tsx`, `app/admin/index.tsx`

- [ ] **Step 1: Create admin stack layout and dashboard** — Shows quick stats (total content, total users, live status), links to all admin sub-screens.

- [ ] **Step 2: Update tab navigator** — Admin/editor users see Admin tab instead of Profile.

- [ ] **Step 3: Commit**

---

### Task 18: Upload Content Screen

**Files:**
- Create: `app/admin/upload.tsx`

- [ ] **Step 1: Create upload form** — Content type pills, bilingual title inputs, category picker, media URL field, thumbnail upload zone, publish button. Inserts into Supabase `content` table.

- [ ] **Step 2: Commit**

---

### Task 19: Manage Content Screen

**Files:**
- Create: `app/admin/manage-content.tsx`

- [ ] **Step 1: Create content list** — Searchable, filterable by type. Each item has edit/delete actions. Edit navigates to upload screen pre-filled.

- [ ] **Step 2: Commit**

---

### Task 20: Schedule Sessions Screen

**Files:**
- Create: `app/admin/schedule.tsx`

- [ ] **Step 1: Create schedule screen** — List upcoming/recurring sessions. Create new session form with date/time picker, recurring toggle, RRULE generation. Feeds into "Next Live" on Home.

- [ ] **Step 2: Commit**

---

### Task 21: Team Management Screen

**Files:**
- Create: `app/admin/team.tsx`

- [ ] **Step 1: Create team screen** — List team members with roles. Invite by email (updates user role in Supabase). Role permissions explained.

- [ ] **Step 2: Commit**

---

## Phase 4: Live Streaming + Notifications + PDF

This phase delivers: DO server setup for Nginx-RTMP, live broadcasting from admin app, live player for listeners, push notifications, PDF viewer.

---

### Task 22: DO Server — Nginx-RTMP Setup

**Files:**
- Create: `server/nginx-rtmp.conf`, `server/record-and-upload.sh`, `server/deploy.sh`

- [ ] **Step 1: Create `server/nginx-rtmp.conf`** — Nginx config with RTMP input, HLS output, recording to /tmp/recordings/, exec_record_done triggers upload script.

- [ ] **Step 2: Create `server/record-and-upload.sh`** — Converts recording to MP3 (ffmpeg), uploads to Internet Archive via S3 API (curl with IA credentials), calls Supabase API to update live_sessions row.

- [ ] **Step 3: Create `server/deploy.sh`** — Installs nginx-rtmp-module, ffmpeg, copies configs, restarts nginx.

- [ ] **Step 4: Deploy to DO server** — SSH in and run deploy.sh.

- [ ] **Step 5: Commit**

---

### Task 23: Admin Go Live Screen

**Files:**
- Create: `app/admin/go-live.tsx`

- [ ] **Step 1: Create Go Live screen** — Big red START button, session title fields (EN/UR), listener count, duration timer, auto-save toggle, push notification toggle. Uses expo-av or react-native-live-audio-stream to capture mic and stream RTMP to DO server.

- [ ] **Step 2: Handle stop** — Stops audio capture, updates live_sessions status, triggers recording upload on server.

- [ ] **Step 3: Commit**

---

### Task 24: Live Player Screen

**Files:**
- Create: `app/player/live.tsx`

- [ ] **Step 1: Create Live Player** — Red-themed player. Plays HLS stream URL from live_sessions. Shows live dot, listener count (via Supabase Realtime), duration timer. No seek bar.

- [ ] **Step 2: Commit**

---

### Task 25: Push Notifications (OneSignal)

**Files:**
- Create: `services/notifications.ts`
- Modify: `app/_layout.tsx`

- [ ] **Step 1: Create `services/notifications.ts`** — OneSignal init, register device, subscribe to tags (live_notifications, content_notifications). Send notification on live start and new content upload (via Supabase Edge Function or direct OneSignal API call).

- [ ] **Step 2: Wire into root layout** — Init OneSignal on app start, save player ID to push_subscriptions table.

- [ ] **Step 3: Commit**

---

### Task 26: PDF/Book Viewer

**Files:**
- Create: `app/book/[id].tsx`

- [ ] **Step 1: Create PDF viewer screen** — Loads PDF from archive.org URL in a WebView. Basic bookmark support via AsyncStorage.

- [ ] **Step 2: Commit**

---

### Task 27: Category Content Listing + Search

**Files:**
- Create: `app/library/[categoryId].tsx`, `app/library/search.tsx`

- [ ] **Step 1: Create category listing** — FlatList of ContentCards for a category. Pull-to-refresh, pagination.

- [ ] **Step 2: Create search screen** — TextInput with debounced search, results as ContentCards.

- [ ] **Step 3: Commit**

---

### Task 28: BilingualText Component + RTL Polish

**Files:**
- Create: `components/BilingualText.tsx`
- Modify: Various screens to use BilingualText where Urdu content is shown

- [ ] **Step 1: Create `components/BilingualText.tsx`** — Renders text with `writingDirection: 'rtl'` for Urdu, appropriate font family.

- [ ] **Step 2: Apply across all screens** — Content titles, category names, session titles shown bilingually.

- [ ] **Step 3: Commit**

---

### Task 29: Web Build + DO Server Hosting

**Files:**
- Modify: `server/deploy.sh`

- [ ] **Step 1: Build Expo web** — `npx expo export --platform web`

- [ ] **Step 2: Configure nginx** — Serve the web build from DO server on port 80/443 alongside RTMP.

- [ ] **Step 3: Deploy and verify** — Web app accessible at server domain.

- [ ] **Step 4: Commit**

---

### Task 30: Final Integration Testing + Polish

- [ ] **Step 1: Test full flow** — Sign up → browse content → play audio → create playlist → download for offline → go live (admin) → join live (listener) → view PDF book.

- [ ] **Step 2: Test both themes** — Verify all screens in light and dark mode.

- [ ] **Step 3: Test both languages** — Switch to Urdu, verify all strings and RTL rendering.

- [ ] **Step 4: Run all tests** — `npx jest --coverage`

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "feat: complete Khanqah Maseeh-ul-Ummah app v1.0.0"
```
