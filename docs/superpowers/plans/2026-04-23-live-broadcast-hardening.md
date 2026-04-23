# Live Broadcast Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Start/stop the live broadcast reliably under rapid toggling, navigation, and tab reloads; enforce a single global broadcaster; auto-clean stale sessions; give admins a resume-or-stop UI when they return to find an open session.

**Architecture:** A module-level singleton `lib/broadcast.ts` owns the MediaRecorder + WebSocket + current `live_sessions` row id, living outside React. A small hook `hooks/useBroadcastState.ts` mirrors its events into component state. The `go-live` page becomes state-driven around that controller. A migration adds a heartbeat column + a partial unique index that prevents two simultaneous broadcasts.

**Tech Stack:** Expo SDK 54 + React Native Web + Supabase. Web-only — native broadcasting is not in scope.

---

## File Structure

**Create:**
- `supabase/migrations/009_live_heartbeat.sql`
- `lib/broadcast.ts`
- `hooks/useBroadcastState.ts`

**Modify:**
- `app/admin/go-live.tsx` — rewrite to consume the controller with idle / live / resume-or-stop / foreign-session states.
- `hooks/useLiveSession.ts` — run the stale-sweep on mount.
- `app/(tabs)/index.tsx` — live-tile routing branches on `started_by == user.id`.

---

## Task 1: DB migration — heartbeat column + unique live lock

**Files:**
- Create: `supabase/migrations/009_live_heartbeat.sql`

- [ ] **Step 1: Write the migration**

```sql
-- 009_live_heartbeat.sql — resilience additions for live broadcasting.
--   (a) last_heartbeat_at lets us detect a dead broadcaster client.
--   (b) partial unique index enforces at most one status='live' row
--       at any time — the second concurrent start fails at the DB.

ALTER TABLE public.live_sessions
  ADD COLUMN IF NOT EXISTS last_heartbeat_at TIMESTAMPTZ;

-- Backfill existing live rows so the sweep below doesn't clobber them.
UPDATE public.live_sessions
SET last_heartbeat_at = started_at
WHERE status = 'live' AND last_heartbeat_at IS NULL;

-- Partial unique index: only one row can have status='live' at a time.
-- Using a constant expression `(1)` means the uniqueness applies to the
-- row as a whole (not to any column value).
CREATE UNIQUE INDEX IF NOT EXISTS live_sessions_one_live_at_a_time
ON public.live_sessions ((1))
WHERE status = 'live';
```

- [ ] **Step 2: Apply via Supabase SQL Editor**

Paste the SQL above into the dashboard SQL editor and Run.

- [ ] **Step 3: Verify**

In the same editor run:

```sql
SELECT column_name, data_type FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'live_sessions'
  AND column_name = 'last_heartbeat_at';

SELECT indexname, indexdef FROM pg_indexes
WHERE schemaname = 'public' AND tablename = 'live_sessions';
```

Expected: the column exists (`timestamp with time zone`) and the index `live_sessions_one_live_at_a_time` is listed.

- [ ] **Step 4: Commit the migration file**

```bash
git add supabase/migrations/009_live_heartbeat.sql
git commit -m "feat(db): live_sessions heartbeat column + single-broadcaster unique index"
```

---

## Task 2: Broadcast controller (`lib/broadcast.ts`)

**Files:**
- Create: `lib/broadcast.ts`

- [ ] **Step 1: Scaffold the singleton**

```ts
// lib/broadcast.ts
//
// Module-level singleton that owns the live-broadcast lifecycle:
// MediaRecorder + WebSocket to the relay + current live_sessions row id.
// Survives React navigation. Idempotent start/stop. Heartbeats every 15s.
// Uses the web MediaRecorder API — native unsupported for now.

import { supabase } from './supabase';
import { getConfig } from './remote-config';

export type ActiveSession = {
  id: string;
  titleEn: string;
  titleUr: string;
  startedAt: number;
};

export class BroadcastLockedError extends Error {
  readonly existing: { id: string; started_by: string; title_en: string | null };
  constructor(existing: BroadcastLockedError['existing']) {
    super('Broadcast already in progress');
    this.existing = existing;
  }
}

type Listeners = {
  start: Array<(s: ActiveSession) => void>;
  stop: Array<() => void>;
  error: Array<(err: Error) => void>;
};

const listeners: Listeners = { start: [], stop: [], error: [] };
function emit<K extends keyof Listeners>(event: K, ...args: any[]) {
  for (const fn of listeners[event] as any[]) {
    try { (fn as any)(...args); } catch {}
  }
}

type State = {
  active: ActiveSession | null;
  mediaStream: MediaStream | null;
  recorder: MediaRecorder | null;
  ws: WebSocket | null;
  heartbeat: ReturnType<typeof setInterval> | null;
  starting: boolean;
  stopping: boolean;
};

const state: State = {
  active: null,
  mediaStream: null,
  recorder: null,
  ws: null,
  heartbeat: null,
  starting: false,
  stopping: false,
};

function getRelayUrl(): string {
  const cfg = getConfig();
  if (cfg.audioRelayWsUrl) return cfg.audioRelayWsUrl;
  return 'wss://arrashid.ennbi.com/ws/';
}

async function cleanupTransport() {
  if (state.heartbeat) {
    clearInterval(state.heartbeat);
    state.heartbeat = null;
  }
  try { state.recorder?.stop(); } catch {}
  state.recorder = null;
  try { state.ws?.close(); } catch {}
  state.ws = null;
  state.mediaStream?.getTracks().forEach((t) => { try { t.stop(); } catch {} });
  state.mediaStream = null;
}

export const broadcast = {
  getActive(): ActiveSession | null {
    return state.active;
  },

  on<K extends keyof Listeners>(
    event: K,
    fn: Listeners[K] extends Array<infer F> ? F : never,
  ): () => void {
    (listeners[event] as any[]).push(fn);
    return () => {
      const arr = listeners[event] as any[];
      const i = arr.indexOf(fn);
      if (i >= 0) arr.splice(i, 1);
    };
  },

  async start(opts: {
    title_en: string;
    title_ur: string;
    userId: string;
    resumeExistingId?: string;
  }): Promise<ActiveSession> {
    if (state.active) return state.active;
    if (state.starting) throw new Error('Broadcast start already in progress');
    state.starting = true;

    try {
      // 1. Acquire mic.
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      state.mediaStream = stream;

      // 2. Open WebSocket to relay.
      const ws = new WebSocket(getRelayUrl());
      state.ws = ws;
      await new Promise<void>((resolve, reject) => {
        const t = setTimeout(() => reject(new Error('Relay handshake timed out')), 10_000);
        ws.onopen = () => { clearTimeout(t); resolve(); };
        ws.onerror = () => { clearTimeout(t); reject(new Error('Relay unreachable')); };
      });

      // 3. Insert (or reuse) the live_sessions row.
      const cfg = getConfig();
      const hlsUrl = cfg.streamHlsUrl;
      const nowIso = new Date().toISOString();
      let rowId = opts.resumeExistingId ?? null;

      if (!rowId) {
        const { data, error } = await supabase
          .from('live_sessions')
          .insert({
            title_en: opts.title_en,
            title_ur: opts.title_ur,
            stream_url: hlsUrl,
            started_by: opts.userId,
            status: 'live',
            started_at: nowIso,
            last_heartbeat_at: nowIso,
          })
          .select('*')
          .single();

        if (error) {
          // 23505 = unique_violation — someone else is live.
          if ((error as any).code === '23505') {
            const existing = await supabase
              .from('live_sessions')
              .select('id, started_by, title_en')
              .eq('status', 'live')
              .limit(1)
              .maybeSingle();
            throw new BroadcastLockedError(
              existing.data ?? { id: '', started_by: '', title_en: null },
            );
          }
          throw new Error(error.message);
        }
        rowId = (data as any).id as string;
      } else {
        await supabase
          .from('live_sessions')
          .update({ last_heartbeat_at: nowIso })
          .eq('id', rowId);
      }

      // 4. Start the MediaRecorder, pipe chunks to the relay.
      const mime =
        typeof MediaRecorder !== 'undefined' &&
        MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : 'audio/webm';
      const recorder = new MediaRecorder(stream, { mimeType: mime });
      state.recorder = recorder;
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size && state.ws && state.ws.readyState === WebSocket.OPEN) {
          state.ws.send(e.data);
        }
      };
      recorder.start(200);

      // 5. Heartbeat every 15 s.
      state.heartbeat = setInterval(() => {
        if (!state.active) return;
        supabase
          .from('live_sessions')
          .update({ last_heartbeat_at: new Date().toISOString() })
          .eq('id', state.active.id)
          .then(() => {}, () => {});
      }, 15_000);

      // 6. Socket death → treat as error and clean up.
      ws.onclose = () => {
        if (!state.active) return;
        emit('error', new Error('Relay connection closed'));
        broadcast.stop().catch(() => {});
      };
      ws.onerror = () => {
        emit('error', new Error('Relay connection errored'));
      };

      const active: ActiveSession = {
        id: rowId!,
        titleEn: opts.title_en,
        titleUr: opts.title_ur,
        startedAt: Date.now(),
      };
      state.active = active;
      emit('start', active);
      return active;
    } catch (err) {
      await cleanupTransport();
      throw err;
    } finally {
      state.starting = false;
    }
  },

  async stop(): Promise<void> {
    if (!state.active) return;
    if (state.stopping) return;
    state.stopping = true;

    const id = state.active.id;
    state.active = null;
    await cleanupTransport();

    try {
      await Promise.race([
        supabase
          .from('live_sessions')
          .update({ status: 'ended', ended_at: new Date().toISOString() })
          .eq('id', id),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Stop PATCH timeout')), 5_000),
        ),
      ]);
    } catch {
      // sweep will clean it up
    } finally {
      state.stopping = false;
      emit('stop');
    }
  },
};
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | grep -iE "broadcast\.ts" | head -5
```

Expected: empty.

- [ ] **Step 3: Commit**

```bash
git add lib/broadcast.ts
git commit -m "feat(broadcast): singleton controller owning MediaRecorder+WS lifecycle"
```

---

## Task 3: `useBroadcastState` hook

**Files:**
- Create: `hooks/useBroadcastState.ts`

- [ ] **Step 1: Write the hook**

```ts
// hooks/useBroadcastState.ts
import { useEffect, useState } from 'react';
import { broadcast, ActiveSession } from '../lib/broadcast';

export function useBroadcastState() {
  const [active, setActive] = useState<ActiveSession | null>(broadcast.getActive());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const offStart = broadcast.on('start', (s) => { setActive(s); setError(null); });
    const offStop = broadcast.on('stop', () => setActive(null));
    const offError = broadcast.on('error', (e) => setError(e.message));
    return () => { offStart(); offStop(); offError(); };
  }, []);

  return { active, error, setError };
}
```

- [ ] **Step 2: Commit**

```bash
git add hooks/useBroadcastState.ts
git commit -m "feat(broadcast): useBroadcastState hook mirrors controller into React"
```

---

## Task 4: Stale sweep in `useLiveSession`

**Files:**
- Modify: `hooks/useLiveSession.ts`

- [ ] **Step 1: Sweep stale 'live' rows on every mount**

Find the `fetchLive` function and add a preflight sweep just above the SELECT:

```ts
    async function fetchLive() {
      // Auto-close sessions whose heartbeat is older than 90 s — covers
      // tab-close / crash where the admin never hit Stop.
      const cutoff = new Date(Date.now() - 90_000).toISOString();
      await supabase
        .from('live_sessions')
        .update({ status: 'ended', ended_at: new Date().toISOString() })
        .eq('status', 'live')
        .lt('last_heartbeat_at', cutoff);

      const { data } = await supabase
        .from('live_sessions')
        .select('*')
        .eq('status', 'live')
        .limit(1)
        .maybeSingle();

      if (!cancelled) {
        setSession(data ?? null);
        setLoading(false);
      }
    }
```

- [ ] **Step 2: Commit**

```bash
git add hooks/useLiveSession.ts
git commit -m "feat(broadcast): sweep stale live rows when useLiveSession mounts"
```

---

## Task 5: Rewrite `app/admin/go-live.tsx`

**Files:**
- Modify: `app/admin/go-live.tsx`

This is the largest task — the go-live screen becomes state-driven around the controller. Because the file is long, this task replaces the default-export component body while keeping existing styles.

- [ ] **Step 1: Read current imports / styles**

Run `grep -n "export default\|const styles" app/admin/go-live.tsx` to locate the component boundary, then replace the component function with the new version below. Keep imports and styles as-is; add new imports at the top.

**Add these imports:**

```tsx
import { broadcast, BroadcastLockedError } from '../../lib/broadcast';
import { useBroadcastState } from '../../hooks/useBroadcastState';
```

Also keep: `useState`, `useEffect`, `useCallback`, `View`, `Text`, `TouchableOpacity`, `TextInput`, `ActivityIndicator`, Ionicons (if used), existing hooks (`useAuth`, `useTheme`, etc.).

**Replace the component body with:**

```tsx
export default function GoLiveScreen() {
  const { theme } = useTheme();
  const c = theme.colors;
  const router = useRouter();
  const goBack = useSafeBack('/');
  const { user } = useAuth();
  const { active, error: broadcastError, setError: setBroadcastError } = useBroadcastState();

  const [titleEn, setTitleEn] = useState('');
  const [titleUr, setTitleUr] = useState('');
  const [starting, setStarting] = useState(false);
  const [stopping, setStopping] = useState(false);

  // DB row that may be 'live' for someone else / ourselves after a reload.
  const [foreignRow, setForeignRow] = useState<
    { id: string; started_by: string; title_en: string | null; title_ur: string | null } | null
  >(null);
  const [ownStaleRow, setOwnStaleRow] = useState<
    { id: string; title_en: string | null; title_ur: string | null } | null
  >(null);

  // On mount + whenever active changes, sweep + re-check DB for foreign / own-stale rows.
  const refresh = useCallback(async () => {
    // Sweep stale
    const cutoff = new Date(Date.now() - 90_000).toISOString();
    await supabase
      .from('live_sessions')
      .update({ status: 'ended', ended_at: new Date().toISOString() })
      .eq('status', 'live')
      .lt('last_heartbeat_at', cutoff);

    const { data } = await supabase
      .from('live_sessions')
      .select('id, started_by, title_en, title_ur, last_heartbeat_at')
      .eq('status', 'live')
      .limit(1)
      .maybeSingle();

    if (!data) {
      setForeignRow(null);
      setOwnStaleRow(null);
      return;
    }

    if (user && data.started_by === user.id) {
      // Ours. If the controller already attached, nothing to resume.
      if (!active) setOwnStaleRow(data);
      setForeignRow(null);
    } else {
      setForeignRow(data);
      setOwnStaleRow(null);
    }
  }, [active, user]);

  useEffect(() => { refresh(); }, [refresh]);

  const onStart = useCallback(async () => {
    if (!user) return;
    if (!titleEn.trim() || !titleUr.trim()) {
      setBroadcastError('Please enter both titles.');
      return;
    }
    if (starting || active) return;
    setStarting(true);
    setBroadcastError(null);
    try {
      await broadcast.start({
        title_en: titleEn.trim(),
        title_ur: titleUr.trim(),
        userId: user.id,
      });
      setTitleEn('');
      setTitleUr('');
    } catch (err) {
      if (err instanceof BroadcastLockedError) {
        await refresh();
        return;
      }
      setBroadcastError(err instanceof Error ? err.message : String(err));
    } finally {
      setStarting(false);
    }
  }, [user, titleEn, titleUr, starting, active, refresh, setBroadcastError]);

  const onStop = useCallback(async () => {
    if (stopping) return;
    setStopping(true);
    try {
      await broadcast.stop();
      await refresh();
    } finally {
      setStopping(false);
    }
  }, [stopping, refresh]);

  const onResume = useCallback(async () => {
    if (!user || !ownStaleRow) return;
    setStarting(true);
    setBroadcastError(null);
    try {
      await broadcast.start({
        title_en: ownStaleRow.title_en ?? '',
        title_ur: ownStaleRow.title_ur ?? '',
        userId: user.id,
        resumeExistingId: ownStaleRow.id,
      });
      setOwnStaleRow(null);
    } catch (err) {
      setBroadcastError(err instanceof Error ? err.message : String(err));
    } finally {
      setStarting(false);
    }
  }, [user, ownStaleRow, setBroadcastError]);

  const onStopOwnStale = useCallback(async () => {
    if (!ownStaleRow) return;
    setStopping(true);
    try {
      await supabase
        .from('live_sessions')
        .update({ status: 'ended', ended_at: new Date().toISOString() })
        .eq('id', ownStaleRow.id);
      await refresh();
    } finally {
      setStopping(false);
    }
  }, [ownStaleRow, refresh]);

  // Elapsed timer while live
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!active) { setElapsed(0); return; }
    const tick = () => setElapsed(Math.floor((Date.now() - active.startedAt) / 1000));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [active]);

  // ── Render ─────────────────────────────────────────────────────────────
  if (active) {
    const mm = Math.floor(elapsed / 60).toString().padStart(2, '0');
    const ss = (elapsed % 60).toString().padStart(2, '0');
    return (
      <View style={{ flex: 1, backgroundColor: c.background, padding: 24, justifyContent: 'center' }}>
        <Text style={{ color: c.liveRed, fontSize: 12, letterSpacing: 1.5, textTransform: 'uppercase', textAlign: 'center', fontFamily: 'DMSans-SemiBold' }}>● ON AIR</Text>
        <Text style={{ color: c.text, fontSize: 28, fontFamily: 'CrimsonPro-SemiBold', textAlign: 'center', marginTop: 10 }}>
          {active.titleEn}
        </Text>
        <Text style={{ color: c.textMuted, fontSize: 16, fontFamily: 'CrimsonPro-Italic', textAlign: 'center', marginTop: 4 }}>
          {active.titleUr}
        </Text>
        <Text style={{ color: c.accent, fontSize: 36, fontFamily: 'CrimsonPro-SemiBold', textAlign: 'center', marginTop: 24 }}>
          {mm}:{ss}
        </Text>
        <TouchableOpacity
          onPress={onStop}
          disabled={stopping}
          style={{ marginTop: 32, backgroundColor: c.liveRed, paddingVertical: 18, borderRadius: 999, alignItems: 'center', opacity: stopping ? 0.5 : 1 }}
          activeOpacity={0.85}
        >
          <Text style={{ color: '#fff', fontFamily: 'DMSans-SemiBold', letterSpacing: 2, textTransform: 'uppercase' }}>
            {stopping ? 'Stopping…' : 'Stop broadcast'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (foreignRow) {
    return (
      <View style={{ flex: 1, backgroundColor: c.background, padding: 24, justifyContent: 'center' }}>
        <Text style={{ color: c.textMuted, fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', textAlign: 'center', fontFamily: 'DMSans-Medium' }}>● LIVE NOW</Text>
        <Text style={{ color: c.text, fontSize: 24, fontFamily: 'CrimsonPro-SemiBold', textAlign: 'center', marginTop: 10 }}>
          {foreignRow.title_en || foreignRow.title_ur || 'Majlis'}
        </Text>
        <Text style={{ color: c.textMuted, fontSize: 14, fontFamily: 'CrimsonPro-Italic', textAlign: 'center', marginTop: 10 }}>
          Another admin is already broadcasting. Only one live session is allowed at a time.
        </Text>
        <TouchableOpacity
          onPress={() => router.push('/player/live')}
          style={{ marginTop: 24, backgroundColor: c.primary, paddingVertical: 16, borderRadius: 999, alignItems: 'center' }}
          activeOpacity={0.85}
        >
          <Text style={{ color: c.onPrimary, fontFamily: 'DMSans-SemiBold', letterSpacing: 2, textTransform: 'uppercase' }}>
            Join as listener
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (ownStaleRow) {
    return (
      <View style={{ flex: 1, backgroundColor: c.background, padding: 24, justifyContent: 'center' }}>
        <Text style={{ color: c.textMuted, fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', textAlign: 'center', fontFamily: 'DMSans-Medium' }}>Session open</Text>
        <Text style={{ color: c.text, fontSize: 22, fontFamily: 'CrimsonPro-SemiBold', textAlign: 'center', marginTop: 10 }}>
          {ownStaleRow.title_en || ownStaleRow.title_ur}
        </Text>
        <Text style={{ color: c.textMuted, fontSize: 14, fontFamily: 'CrimsonPro-Italic', textAlign: 'center', marginTop: 10 }}>
          You have a session marked live but no broadcaster is connected. Resume to reopen the mic, or stop it now.
        </Text>
        <TouchableOpacity
          onPress={onResume}
          disabled={starting}
          style={{ marginTop: 24, backgroundColor: c.primary, paddingVertical: 16, borderRadius: 999, alignItems: 'center', opacity: starting ? 0.5 : 1 }}
          activeOpacity={0.85}
        >
          <Text style={{ color: c.onPrimary, fontFamily: 'DMSans-SemiBold', letterSpacing: 2, textTransform: 'uppercase' }}>
            {starting ? 'Resuming…' : 'Resume broadcast'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onStopOwnStale}
          disabled={stopping}
          style={{ marginTop: 12, borderColor: c.liveRed, borderWidth: 1, paddingVertical: 16, borderRadius: 999, alignItems: 'center', opacity: stopping ? 0.5 : 1 }}
          activeOpacity={0.85}
        >
          <Text style={{ color: c.liveRed, fontFamily: 'DMSans-SemiBold', letterSpacing: 2, textTransform: 'uppercase' }}>
            {stopping ? 'Stopping…' : 'Stop it'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Idle — original start form.
  return (
    <View style={{ flex: 1, backgroundColor: c.background, padding: 24, justifyContent: 'center' }}>
      <Text style={{ color: c.accent, fontFamily: 'CrimsonPro-Italic', fontSize: 22, textAlign: 'center', marginBottom: 8 }}>
        Ready to broadcast
      </Text>
      <Text style={{ color: c.textMuted, fontFamily: 'CrimsonPro', fontSize: 14, textAlign: 'center', marginBottom: 24 }}>
        Fill in the session details below, then tap the button to go live.
      </Text>

      <Text style={{ color: c.textMuted, fontFamily: 'DMSans-Medium', fontSize: 10, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 6 }}>
        Session title (English)
      </Text>
      <TextInput
        value={titleEn}
        onChangeText={setTitleEn}
        placeholder="Title"
        placeholderTextColor={c.textMuted}
        style={{ backgroundColor: c.surface, borderColor: c.border, borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 14, color: c.text, fontFamily: 'CrimsonPro' }}
      />

      <Text style={{ color: c.textMuted, fontFamily: 'DMSans-Medium', fontSize: 10, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 6 }}>
        Session title (Urdu)
      </Text>
      <TextInput
        value={titleUr}
        onChangeText={setTitleUr}
        placeholder="عنوان"
        placeholderTextColor={c.textMuted}
        textAlign="right"
        style={{ backgroundColor: c.surface, borderColor: c.border, borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 14, color: c.text, fontFamily: 'NastaleeqUrdu', fontSize: 16 }}
      />

      {broadcastError ? (
        <Text style={{ color: c.liveRed, fontFamily: 'DMSans-Medium', fontSize: 13, textAlign: 'center', marginBottom: 12 }}>
          {broadcastError}
        </Text>
      ) : null}

      <TouchableOpacity
        onPress={onStart}
        disabled={starting}
        style={{ backgroundColor: c.liveRed, paddingVertical: 18, borderRadius: 999, alignItems: 'center', opacity: starting ? 0.6 : 1 }}
        activeOpacity={0.85}
      >
        {starting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={{ color: '#fff', fontFamily: 'DMSans-SemiBold', letterSpacing: 2, textTransform: 'uppercase' }}>
            Start broadcast
          </Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity onPress={goBack} style={{ marginTop: 20, alignItems: 'center' }}>
        <Text style={{ color: c.primary, fontFamily: 'CrimsonPro-Medium', fontSize: 14 }}>‹ Back</Text>
      </TouchableOpacity>
    </View>
  );
}
```

- [ ] **Step 2: Verify**

```bash
npx tsc --noEmit 2>&1 | grep -iE "go-live\.tsx" | head -10
```

Fix any new errors.

- [ ] **Step 3: Commit**

```bash
git add app/admin/go-live.tsx
git commit -m "feat(go-live): idle / live / resume / foreign states around the broadcast controller"
```

---

## Task 6: Home live-tile routing

**Files:**
- Modify: `app/(tabs)/index.tsx`

- [ ] **Step 1: Branch on session ownership**

Locate the `onLiveSessions` handler. Replace it with:

```tsx
  const onLiveSessions = () => {
    if (live) {
      if (user?.id === live.started_by) router.push('/admin/go-live');
      else router.push('/player/live');
      return;
    }
    if (liveCategory) router.push(`/library/${liveCategory.id}`);
    else router.push('/library');
  };
```

Make sure `useAuth` is destructured to include `user`:

```tsx
const { user, isAdmin, isEditor } = useAuth();
```

- [ ] **Step 2: Commit**

```bash
git add 'app/(tabs)/index.tsx'
git commit -m "feat(home): live-tile routes admin starter to /admin/go-live, listeners to /player/live"
```

---

## Task 7: Push + verify

**Files:** none.

- [ ] **Step 1: Push**

```bash
git push origin main
```

- [ ] **Step 2: Watch CI**

```bash
gh auth switch --user EnnBi
gh run watch --repo EnnBi/Khanqah $(gh run list --repo EnnBi/Khanqah --limit 1 --json databaseId --jq '.[0].databaseId')
gh auth switch --user nadeem-baba
```

- [ ] **Step 3: Manual smoke**

After CI deploys:
1. Go-live page: enter titles → Start → on-air view with timer; tap Stop → back to idle.
2. Start → navigate to Home via back; return via profile/admin; on-air view still shows.
3. Start → hard-reload tab; on-air view shows "Resume or Stop" card; both options work.
4. Start on one browser; try to Start on another → "broadcast in progress by …" view with Join-as-listener.
5. Start → close tab. Wait ~2 min. Reopen home — live tile no longer says ON AIR (stale sweep).
6. Start → Stop → Start → Stop rapidly — every cycle creates exactly one new DB row, no leftovers.

---

## Self-Review Notes

**Spec coverage:**
- Controller (§1) → Task 2 ✓
- Go-live rewrite (§2) → Task 5 ✓
- Heartbeat + sweep (§3) → Tasks 1, 2, 4, 5 ✓
- Live-tile routing (§4) → Task 6 ✓
- Rapid-cycle idempotence (§5) → Task 2's start/stop guards + Task 5's button guards ✓
- Single-broadcaster lock (§6) → Task 1's unique index + Task 2's 23505 handling ✓

**Placeholder scan:** No TBDs; each step has code.

**Type consistency:** `ActiveSession` type defined once in `lib/broadcast.ts` and re-used via the hook + go-live screen. `BroadcastLockedError` class name matches between task 2 and task 5.
