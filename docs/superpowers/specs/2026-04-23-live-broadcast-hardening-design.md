# Live Broadcast Hardening

**Date:** 2026-04-23
**Status:** Approved for implementation

## Goal

Make starting and stopping a live majlis robust under rapid toggling,
navigation inside the app, and crashes, with a global lock so only one
broadcast exists at a time and a friendly resume-or-stop UI for admins
who return to find an open session.

## Non-goals

- Service-worker / background-audio beyond what the browser already
  allows. If the admin closes the browser or the OS suspends the tab,
  the stream ends; we only guarantee clean recovery.
- Full listener-side HLS playback changes (already covered elsewhere).
- Changes to `scheduled_sessions` / calendar.

## 1. Broadcast controller (`lib/broadcast.ts`)

Module-level singleton that owns the MediaRecorder + WebSocket +
current `live_sessions` row id. No React state — just a small object
exported and referenced from anywhere.

### Shape

```ts
type ActiveSession = { id: string; title: string; startedAt: number };

type BroadcastEvents = {
  'start': (s: ActiveSession) => void;
  'stop': () => void;
  'error': (err: Error) => void;
};

export const broadcast = {
  start(opts: { title_en: string; title_ur: string; userId: string }): Promise<ActiveSession>;
  stop(): Promise<void>;
  getActive(): ActiveSession | null;
  on<K extends keyof BroadcastEvents>(event: K, fn: BroadcastEvents[K]): () => void;
};
```

### Behaviour

- **`start()`** is idempotent: if `getActive()` is non-null, returns it
  without opening a second mic / WebSocket.
- **`stop()`** is idempotent: no-op if already stopped; always safe.
- Opens a `MediaRecorder` → sends 200 ms chunks over WebSocket to the
  relay (existing `wss://arrashid.ennbi.com/ws/`).
- Inserts a `live_sessions` row (status='live') on start; updates it to
  status='ended' + ended_at=now() on stop. Handles the DB PATCH inside
  a 5 s race — if the network hangs, the controller still drops the
  socket and releases the mic so the UI doesn't freeze.
- Bumps `last_heartbeat_at` every 15 s while active (see §3).
- Emits `start` / `stop` / `error` events; React code subscribes via
  a tiny `useBroadcastState()` hook that mirrors the events into state.

### React glue

One hook, `hooks/useBroadcastState.ts`:

```ts
export function useBroadcastState() {
  const [active, setActive] = useState(broadcast.getActive());
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const off1 = broadcast.on('start', setActive);
    const off2 = broadcast.on('stop', () => setActive(null));
    const off3 = broadcast.on('error', (e) => setError(e.message));
    return () => { off1(); off2(); off3(); };
  }, []);
  return { active, error };
}
```

Anywhere on any screen can now read the live state without needing
refs to the controller.

## 2. Rewrite `/admin/go-live`

On mount, fetch any `status='live'` row and combine with the
controller's `getActive()` to decide which of three states to render:

- **Controller has active session** → "live view": title + elapsed
  timer + big Stop button. Stop calls `broadcast.stop()`.
- **DB has a live row for this user** but controller doesn't (tab was
  reloaded) → "resume or stop" card:
  - *Stop it* → PATCH status='ended' on the row, cleanup; return to
    idle form.
  - *Resume* → call `broadcast.start()` with the existing title. The
    controller's start path detects the row exists and attaches to it
    instead of inserting a new one (see §1 idempotence + §6 unique
    lock).
- **DB has a live row for another user** → "Broadcast in progress by
  <name>. Join as listener." button → `/player/live`. Start form
  hidden.
- **No live row anywhere** → current idle title-entry form.

Guards:
- An `inFlight` state disables Start / Stop while a call is still
  resolving, so double-tapping never fires two PATCHes.
- The Start handler ignores clicks if `broadcast.getActive()` is
  non-null.

## 3. Heartbeat + stale sweep

### DB migration (`supabase/migrations/009_live_heartbeat.sql`)

```sql
ALTER TABLE public.live_sessions
  ADD COLUMN IF NOT EXISTS last_heartbeat_at TIMESTAMPTZ;

UPDATE public.live_sessions
SET last_heartbeat_at = started_at
WHERE status = 'live' AND last_heartbeat_at IS NULL;
```

### Controller

While broadcasting, every 15 s run:

```ts
supabase
  .from('live_sessions')
  .update({ last_heartbeat_at: new Date().toISOString() })
  .eq('id', activeId);
```

### Sweep

On `/admin/go-live` mount (and on the home tile's live check), run a
server-side sweep before reading state:

```ts
// Inline on-demand sweep — the row has been dead for 90 s+, close it.
await supabase
  .from('live_sessions')
  .update({ status: 'ended', ended_at: new Date().toISOString() })
  .eq('status', 'live')
  .lt('last_heartbeat_at', new Date(Date.now() - 90_000).toISOString());
```

Simple, no cron required. The sweep also runs from `useLiveSession`
every time the hook mounts, so any screen that depends on live state
gets fresh truth.

## 4. Live-tile routing

Existing home "Live Sessions" tile:

```ts
const goLive = () => {
  const live = liveSession; // from useLiveSession
  if (!live) { router.push('/library'); return; }
  if (user?.id === live.started_by) router.push('/admin/go-live');
  else router.push('/player/live');
};
```

Listeners on `/player/live` see the current live session and its
bilingual title; admins on `/admin/go-live` see the Stop view.

## 5. Rapid-cycle idempotence

All handled in §1's controller semantics. Additional browser-level
guard on the Stop button: after the first tap, set `stopping=true`,
disable the button, show a spinner until the controller emits `stop`
or the 5 s timeout fires — whichever first.

## 6. Global single-broadcaster lock

### DB migration (included in `009_live_heartbeat.sql`)

```sql
CREATE UNIQUE INDEX IF NOT EXISTS live_sessions_one_live_at_a_time
ON public.live_sessions ((1))
WHERE status = 'live';
```

Postgres rejects a second insert with `status='live'` — the second
admin's `start()` returns an error code (23505 `unique_violation`).

### Client

- `broadcast.start()` catches 23505 and re-fetches the current live
  row, then rejects with a typed error `BroadcastLockedError` carrying
  the existing session.
- `/admin/go-live` catches that and switches to the "listener" view
  with the existing session's title + owner.

## 7. Honest limits

- Closing the tab still drops the WebSocket. The stale-sweep (§3)
  auto-closes within 90 s; the next time the admin returns, the state
  is clean.
- Mobile browsers may suspend audio capture on backgrounded tabs. We
  surface a "broadcast interrupted — resume?" banner when the
  controller's error event fires.

## Error handling

- Mic permission denied → idle form shows an inline red error (already
  exists); Start button stays enabled so user can retry.
- WebSocket fails handshake → controller emits `error`, closes the
  socket, PATCHes the row to status='ended'. UI surfaces "Relay
  unreachable". Already partially implemented — hardening is wiring
  it through the controller consistently.
- DB PATCH times out on Stop → controller still drops socket + mic.
  Sweep will clean the row later.

## Testing

Manual smoke after implementation:

1. Start → Stop → Start → Stop (rapid clicks). Each cycle creates one
   new DB row; no orphaned 'live' rows remain.
2. Start → navigate away (tap home, then return). Still broadcasting,
   go-live page shows the live view.
3. Start → reload the browser tab. On return, go-live shows the
   "resume or stop" card; both paths work.
4. Start as admin A; admin B on a second browser tries Start →
   blocked at DB, shown "Broadcast in progress" + Listen button.
5. Start → close the tab. After ~90 s, the home live tile no longer
   says ON AIR.
6. Start → disconnect the DO server nginx → WebSocket drops; UI
   surfaces the error + the row is closed.

## Out of scope

- Service-worker background survival.
- Multi-track / recording backup.
- Viewer count persistence beyond the current presence channel.
