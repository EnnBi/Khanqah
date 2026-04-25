# Native Broadcast (Android + iOS + Web) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the live audio broadcast feature work on web, Android, and iOS — admin can start a broadcast from any platform, with screen-lock-tolerant background capture and auto-resume after audio interruptions.

**Architecture:** Keep the existing HLS pipeline and ffmpeg WebSocket relay. Extract a shared `MicSource` interface from `lib/broadcast.ts`. Provide two implementations: web (`mic.web.ts` using `MediaRecorder`/WebM/Opus) and native (`mic.native.ts` using `react-native-audio-record` for 16 kHz mono `s16le` PCM, plus a custom Expo native module that manages the Android foreground service and the iOS `AVAudioSession`). A one-line server tweak adds `sampleRate` to the first JSON frame.

**Tech Stack:** React Native (Expo SDK 54), `react-native-audio-record`, Expo config plugins, Kotlin (Android foreground service), Swift (iOS `AVAudioSession`), Node.js + ffmpeg (existing relay), Jest + jest-expo.

---

## File Map

**New files:**

- `lib/mic.ts` — `MicSource` interface
- `lib/mic.web.ts` — web implementation (MediaRecorder)
- `lib/mic.native.ts` — native implementation (react-native-audio-record + module)
- `plugins/with-broadcast-native.js` — Expo config plugin (permissions, FG service, Info.plist)
- `modules/broadcast-service/expo-module.config.json` — module registration
- `modules/broadcast-service/package.json` — module package
- `modules/broadcast-service/index.ts` — JS exports
- `modules/broadcast-service/android/build.gradle` — Android build
- `modules/broadcast-service/android/src/main/AndroidManifest.xml` — service declaration
- `modules/broadcast-service/android/src/main/java/com/khanqah/broadcastservice/BroadcastServiceModule.kt` — module class
- `modules/broadcast-service/android/src/main/java/com/khanqah/broadcastservice/BroadcastForegroundService.kt` — Android FG service
- `modules/broadcast-service/ios/BroadcastServiceModule.swift` — iOS audio session + interruption observer
- `modules/broadcast-service/ios/BroadcastService.podspec` — iOS pod
- `__tests__/lib/broadcast.test.ts` — Jest unit tests

**Modified files:**

- `server/audio-relay.js` — accept `sampleRate` in config; emit `{status:"error"}` on ffmpeg failure
- `lib/broadcast.ts` — delegate to `MicSource`; add `paused` state; pause/resume on interruption
- `app/admin/go-live.tsx` — handle `MicPermissionDeniedError` with settings deep link
- `app.json` — register `./plugins/with-broadcast-native`
- `package.json` — add `react-native-audio-record` dependency

**Unchanged:** `hooks/useBroadcastState.ts`, `hooks/useLiveSession.ts`, `app/player/live.tsx`, `providers/PlayerProvider.*`, listener side.

---

## Task 1: Server — accept `sampleRate` in PCM config

**Files:**
- Modify: `server/audio-relay.js:54-80, 145-160`

- [ ] **Step 1: Read the current relay code**

Open `server/audio-relay.js`. The current PCM ffmpeg branch hardcodes `-ar 44100`. We will make sample rate configurable, with a whitelist.

- [ ] **Step 2: Replace `startFfmpeg` to accept a `sampleRate` arg**

Replace lines 54-80 with:

```js
const ALLOWED_SAMPLE_RATES = [8000, 16000, 22050, 44100, 48000];

function startFfmpeg(format, sampleRate) {
  const lowLatencyInput = ['-fflags', 'nobuffer', '-flags', 'low_delay'];
  const lowLatencyOutput = ['-flush_packets', '1'];

  const args = format === 'pcm'
    ? [
        ...lowLatencyInput,
        '-f', 's16le',
        '-ar', String(sampleRate),
        '-ac', '1',
        '-i', 'pipe:0',
        '-c:a', 'aac',
        '-b:a', '128k',
        ...lowLatencyOutput,
        '-f', 'flv',
        RTMP_URL,
      ]
    : [
        ...lowLatencyInput,
        '-f', 'webm',
        '-i', 'pipe:0',
        '-c:a', 'aac',
        '-b:a', '128k',
        ...lowLatencyOutput,
        '-f', 'flv',
        RTMP_URL,
      ];

  const proc = spawn('ffmpeg', args, { stdio: ['pipe', 'ignore', 'pipe'] });

  proc.stderr.on('data', (d) => {
    const line = d.toString().trim();
    if (line) console.log(`[ffmpeg] ${line}`);
  });

  proc.on('error', (err) => {
    console.error('[ffmpeg] spawn error:', err.message);
    cleanup();
  });

  proc.on('close', (code) => {
    console.log(`[ffmpeg] exited with code ${code}`);
    cleanup();
  });

  return proc;
}
```

- [ ] **Step 3: Update the config-frame handler to read and validate `sampleRate`**

Replace the `if (!configured)` block (around lines 145-159) with:

```js
if (!configured) {
  let format = 'webm';
  let sampleRate = 44100;
  try {
    const config = JSON.parse(data.toString());
    if (config.format === 'pcm' || config.format === 'webm') {
      format = config.format;
    }
    if (
      typeof config.sampleRate === 'number' &&
      ALLOWED_SAMPLE_RATES.includes(config.sampleRate)
    ) {
      sampleRate = config.sampleRate;
    }
  } catch (_) {
    console.log('[relay] No config message, defaulting to webm');
  }
  inputFormat = format;
  console.log(`[relay] Input format: ${inputFormat}, sample rate: ${sampleRate}`);
  ffmpeg = startFfmpeg(inputFormat, sampleRate);
  configured = true;
  ws.send(JSON.stringify({ status: 'ok', message: 'Streaming started' }));
  return;
}
```

- [ ] **Step 4: Add ffmpeg-error frame to the client when ffmpeg dies unexpectedly**

In the `proc.on('close', (code) => { ... })` handler inside `startFfmpeg`, replace the body with:

```js
proc.on('close', (code) => {
  console.log(`[ffmpeg] exited with code ${code}`);
  if (code !== 0 && ws.readyState === WebSocket.OPEN) {
    try {
      ws.send(JSON.stringify({ status: 'error', message: `ffmpeg exited (code ${code})` }));
    } catch (_) {}
  }
  cleanup();
});
```

- [ ] **Step 5: Run a local lint/syntax check**

Run: `node -c server/audio-relay.js`
Expected: no output (file parses).

- [ ] **Step 6: Commit**

```bash
git add server/audio-relay.js
git commit -m "feat(relay): accept sampleRate in config, emit ffmpeg-error frame"
```

- [ ] **Step 7: Deploy to DigitalOcean**

Run: `bash server/deploy-relay.sh`
Expected: rsync succeeds, `systemctl restart khanqah-audio-relay` reports active.

- [ ] **Step 8: Smoke-test the deployed relay with the existing web client**

Open the web admin go-live screen, start a broadcast (web sends `{format:"webm"}` with no `sampleRate`), verify HLS still plays on the listener.

---

## Task 2: Define `MicSource` interface and stub web implementation

**Files:**
- Create: `lib/mic.ts`

- [ ] **Step 1: Write the interface**

Create `lib/mic.ts`:

```ts
// lib/mic.ts
//
// Abstract microphone source. Two implementations live next to this file:
//   - mic.web.ts    — uses MediaRecorder + WebM/Opus, sends {format:"webm"}
//   - mic.native.ts — uses react-native-audio-record + a custom native
//                     module for FG service / AVAudioSession,
//                     sends {format:"pcm",sampleRate:16000}
//
// Metro picks the right file via platform-extension resolution.
export type MicConfigFrame =
  | { format: 'webm' }
  | { format: 'pcm'; sampleRate: number };

export interface MicSource {
  /** Acquire the mic. Returns the JSON config frame to send as the first
   *  WebSocket message. May throw MicPermissionDeniedError. */
  start(): Promise<MicConfigFrame>;

  /** Release the mic and stop emitting chunks. Idempotent. */
  stop(): Promise<void>;

  /** Subscribe to audio chunks. Each chunk is a Uint8Array, ready to
   *  be passed straight to ws.send(). Only fires while started. */
  onChunk(cb: (chunk: Uint8Array) => void): () => void;

  /** Subscribe to capture errors (mic hardware glitch, audio engine
   *  failure). Permission denial is thrown from start(), not emitted here. */
  onError(cb: (err: Error) => void): () => void;

  /** Subscribe to interruption events. 'began' = pause; 'ended' = resume.
   *  Only meaningful on native (web returns no-op listener). */
  onInterruption(cb: (evt: 'began' | 'ended') => void): () => void;
}

export class MicPermissionDeniedError extends Error {
  constructor() {
    super('Microphone permission denied');
    this.name = 'MicPermissionDeniedError';
  }
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit -p .`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/mic.ts
git commit -m "feat(broadcast): add MicSource interface"
```

---

## Task 3: Implement `mic.web.ts` (extract from broadcast.ts)

**Files:**
- Create: `lib/mic.web.ts`

- [ ] **Step 1: Write the web implementation**

Create `lib/mic.web.ts`:

```ts
// lib/mic.web.ts
import { MicSource, MicConfigFrame, MicPermissionDeniedError } from './mic';

type ChunkCb = (chunk: Uint8Array) => void;
type ErrCb = (err: Error) => void;

class WebMic implements MicSource {
  private stream: MediaStream | null = null;
  private recorder: MediaRecorder | null = null;
  private chunkCbs: ChunkCb[] = [];
  private errCbs: ErrCb[] = [];

  async start(): Promise<MicConfigFrame> {
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      const name = (err as { name?: string })?.name;
      if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
        throw new MicPermissionDeniedError();
      }
      throw err;
    }
    this.stream = stream;

    const mime =
      typeof MediaRecorder !== 'undefined' &&
      MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';
    const recorder = new MediaRecorder(stream, { mimeType: mime });
    this.recorder = recorder;

    recorder.ondataavailable = async (e) => {
      if (!e.data || !e.data.size) return;
      const buf = new Uint8Array(await e.data.arrayBuffer());
      for (const cb of this.chunkCbs) cb(buf);
    };
    recorder.onerror = (e: any) => {
      const err = e?.error ?? new Error('MediaRecorder error');
      for (const cb of this.errCbs) cb(err);
    };
    recorder.start(200);

    return { format: 'webm' };
  }

  async stop(): Promise<void> {
    try { this.recorder?.stop(); } catch { /* noop */ }
    this.recorder = null;
    this.stream?.getTracks().forEach((t) => { try { t.stop(); } catch {} });
    this.stream = null;
  }

  onChunk(cb: ChunkCb): () => void {
    this.chunkCbs.push(cb);
    return () => {
      const i = this.chunkCbs.indexOf(cb);
      if (i >= 0) this.chunkCbs.splice(i, 1);
    };
  }

  onError(cb: ErrCb): () => void {
    this.errCbs.push(cb);
    return () => {
      const i = this.errCbs.indexOf(cb);
      if (i >= 0) this.errCbs.splice(i, 1);
    };
  }

  onInterruption(): () => void {
    // No-op on web — browsers don't model interruption the same way.
    return () => {};
  }
}

export function createMicSource(): MicSource {
  return new WebMic();
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit -p .`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/mic.web.ts
git commit -m "feat(broadcast): web MicSource impl using MediaRecorder"
```

---

## Task 4: Stub `mic.native.ts` (compiles, throws at runtime)

**Files:**
- Create: `lib/mic.native.ts`

- [ ] **Step 1: Write a stub**

Create `lib/mic.native.ts`:

```ts
// lib/mic.native.ts
//
// Native MicSource — real implementation lands in Task 11. This stub
// keeps the build green while we refactor broadcast.ts off the
// MediaRecorder path in Task 5.
import { MicSource, MicConfigFrame } from './mic';

class NativeMicStub implements MicSource {
  async start(): Promise<MicConfigFrame> {
    throw new Error('Native broadcast not implemented yet');
  }
  async stop(): Promise<void> { /* noop */ }
  onChunk(): () => void { return () => {}; }
  onError(): () => void { return () => {}; }
  onInterruption(): () => void { return () => {}; }
}

export function createMicSource(): MicSource {
  return new NativeMicStub();
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit -p .`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/mic.native.ts
git commit -m "feat(broadcast): native MicSource stub"
```

---

## Task 5: Refactor `broadcast.ts` to use `MicSource` (web behavior unchanged)

**Files:**
- Modify: `lib/broadcast.ts` (full rewrite of the start/stop/cleanup logic; session-row, heartbeat, error-emit logic preserved verbatim)

- [ ] **Step 1: Replace `lib/broadcast.ts` with the refactored version**

Open `lib/broadcast.ts`. Replace the entire file with:

```ts
// lib/broadcast.ts
//
// Module-level singleton that owns the live-broadcast lifecycle:
// MicSource (per-platform) + WebSocket to the relay + current
// live_sessions row id. Survives React navigation. Idempotent
// start/stop. Heartbeats every 15 s.

import { supabase } from './supabase';
import { getConfig } from './remote-config';
import {
  MicSource,
  MicConfigFrame,
  MicPermissionDeniedError,
} from './mic';
import { createMicSource } from './mic.web'; // Metro replaces with mic.native on native
export { MicPermissionDeniedError };

export type ActiveSession = {
  id: string;
  titleEn: string;
  titleUr: string;
  startedAt: number;
  paused: boolean;
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
  mic: MicSource | null;
  ws: WebSocket | null;
  heartbeat: ReturnType<typeof setInterval> | null;
  starting: boolean;
  stopping: boolean;
  micUnsubChunk: (() => void) | null;
  micUnsubErr: (() => void) | null;
  micUnsubInt: (() => void) | null;
  configFrame: MicConfigFrame | null;
};

const state: State = {
  active: null,
  mic: null,
  ws: null,
  heartbeat: null,
  starting: false,
  stopping: false,
  micUnsubChunk: null,
  micUnsubErr: null,
  micUnsubInt: null,
  configFrame: null,
};

function getRelayUrl(): string {
  const cfg = getConfig();
  if (cfg.audioRelayWsUrl) return cfg.audioRelayWsUrl;
  return 'wss://arrashid.ennbi.com/ws/';
}

async function openWebsocket(configFrame: MicConfigFrame): Promise<WebSocket> {
  const ws = new WebSocket(getRelayUrl());
  await new Promise<void>((resolve, reject) => {
    const t = setTimeout(
      () => reject(new Error('Relay handshake timed out after 20s')),
      20_000,
    );
    ws.onopen = () => { clearTimeout(t); resolve(); };
    ws.onerror = () => {
      clearTimeout(t);
      reject(new Error('Relay unreachable'));
    };
    ws.onclose = (ev) => {
      if (ws.readyState !== WebSocket.OPEN) {
        clearTimeout(t);
        reject(new Error(`Relay closed before handshake (code ${ev.code})`));
      }
    };
  });
  ws.send(JSON.stringify(configFrame));
  return ws;
}

function attachChunkPump() {
  if (!state.mic || !state.ws) return;
  state.micUnsubChunk = state.mic.onChunk((chunk) => {
    if (state.ws && state.ws.readyState === WebSocket.OPEN) {
      try { state.ws.send(chunk); } catch (err: any) {
        emit('error', new Error(err?.message ?? 'WebSocket send failed'));
      }
    }
  });
  state.micUnsubErr = state.mic.onError((err) => emit('error', err));
}

function detachChunkPump() {
  state.micUnsubChunk?.();
  state.micUnsubErr?.();
  state.micUnsubChunk = null;
  state.micUnsubErr = null;
}

async function cleanupTransport() {
  if (state.heartbeat) {
    clearInterval(state.heartbeat);
    state.heartbeat = null;
  }
  detachChunkPump();
  if (state.mic) {
    try { await state.mic.stop(); } catch {}
    state.mic = null;
  }
  try { state.ws?.close(); } catch {}
  state.ws = null;
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
      // 1. Acquire mic via the platform-specific MicSource.
      const mic = createMicSource();
      state.mic = mic;
      const configFrame = await mic.start();
      state.configFrame = configFrame;

      // 2. Open WebSocket and send config frame.
      const ws = await openWebsocket(configFrame);
      state.ws = ws;

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

      // 4. Start chunk pump.
      attachChunkPump();

      // 5. Heartbeat every 15 s — runs in BOTH active and paused states.
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
        if (!state.active || state.active.paused) return;
        emit('error', new Error('Relay connection closed'));
        broadcast.stop().catch(() => {});
      };
      ws.onerror = () => {
        emit('error', new Error('Relay connection errored'));
      };

      // 7. Wire interruption → pause/resume.
      state.micUnsubInt = mic.onInterruption((evt) => {
        if (evt === 'began') {
          broadcast._pauseForInterruption().catch(() => {});
        } else {
          broadcast._resumeFromInterruption().catch((err) =>
            emit('error', err instanceof Error ? err : new Error(String(err))),
          );
        }
      });

      const active: ActiveSession = {
        id: rowId!,
        titleEn: opts.title_en,
        titleUr: opts.title_ur,
        startedAt: Date.now(),
        paused: false,
      };
      state.active = active;
      emit('start', active);
      return active;
    } catch (err) {
      await cleanupTransport();
      state.micUnsubInt?.();
      state.micUnsubInt = null;
      throw err;
    } finally {
      state.starting = false;
    }
  },

  async _pauseForInterruption(): Promise<void> {
    if (!state.active || state.active.paused) return;
    state.active = { ...state.active, paused: true };
    detachChunkPump();
    try { state.ws?.close(); } catch {}
    state.ws = null;
    if (state.mic) {
      try { await state.mic.stop(); } catch {}
    }
  },

  async _resumeFromInterruption(): Promise<void> {
    if (!state.active || !state.active.paused) return;
    if (!state.configFrame) {
      throw new Error('No config frame to resume with');
    }
    const mic = createMicSource();
    state.mic = mic;
    const newFrame = await mic.start();
    state.configFrame = newFrame;
    const ws = await openWebsocket(newFrame);
    state.ws = ws;
    attachChunkPump();
    ws.onclose = () => {
      if (!state.active || state.active.paused) return;
      emit('error', new Error('Relay connection closed'));
      broadcast.stop().catch(() => {});
    };
    ws.onerror = () => emit('error', new Error('Relay connection errored'));
    state.active = { ...state.active, paused: false };
  },

  async stop(): Promise<void> {
    if (!state.active) return;
    if (state.stopping) return;
    state.stopping = true;

    const id = state.active.id;
    state.active = null;
    state.micUnsubInt?.();
    state.micUnsubInt = null;
    state.configFrame = null;
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

- [ ] **Step 2: Confirm callers still type-check**

Run: `npx tsc --noEmit -p .`
Expected: no errors. (`hooks/useBroadcastState.ts` and `app/admin/go-live.tsx` both import `broadcast` and `BroadcastLockedError` only — those exports still exist.)

- [ ] **Step 3: Smoke-test on web**

Run: `npx expo start --web`. Open admin/go-live, start a broadcast, verify HLS plays in the listener tab. Stop. Confirm clean shutdown in browser console.

- [ ] **Step 4: Commit**

```bash
git add lib/broadcast.ts
git commit -m "refactor(broadcast): delegate mic to MicSource, add paused state"
```

---

## Task 6: Unit tests for `broadcast` state machine

**Files:**
- Create: `__tests__/lib/broadcast.test.ts`

- [ ] **Step 1: Write the tests**

Create `__tests__/lib/broadcast.test.ts`:

```ts
import { broadcast, BroadcastLockedError } from '../../lib/broadcast';
import { MicSource, MicConfigFrame } from '../../lib/mic';

// Mock the platform mic source.
let lastMic: FakeMic | null = null;
class FakeMic implements MicSource {
  startCalls = 0;
  stopCalls = 0;
  chunkCb: ((c: Uint8Array) => void) | null = null;
  intCb: ((e: 'began' | 'ended') => void) | null = null;
  startResult: MicConfigFrame = { format: 'pcm', sampleRate: 16000 };
  startError: Error | null = null;

  async start(): Promise<MicConfigFrame> {
    this.startCalls++;
    if (this.startError) throw this.startError;
    return this.startResult;
  }
  async stop() { this.stopCalls++; }
  onChunk(cb: (c: Uint8Array) => void) { this.chunkCb = cb; return () => {}; }
  onError() { return () => {}; }
  onInterruption(cb: (e: 'began' | 'ended') => void) { this.intCb = cb; return () => {}; }
}

jest.mock('../../lib/mic.web', () => ({
  createMicSource: () => {
    lastMic = new FakeMic();
    return lastMic;
  },
}));

// Mock the WebSocket — auto-open, capture sent frames.
const sentFrames: any[] = [];
class FakeWS {
  static OPEN = 1;
  readyState = 1;
  onopen: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onclose: ((ev: { code: number }) => void) | null = null;
  constructor(_url: string) {
    queueMicrotask(() => this.onopen && this.onopen());
  }
  send(data: any) { sentFrames.push(data); }
  close() { this.readyState = 3; this.onclose?.({ code: 1000 }); }
}
(global as any).WebSocket = FakeWS;

// Mock supabase to return a stable row.
jest.mock('../../lib/supabase', () => {
  const insertChain = {
    insert: () => insertChain,
    select: () => insertChain,
    single: async () => ({ data: { id: 'row-1' }, error: null }),
    update: () => insertChain,
    eq: () => insertChain,
    limit: () => insertChain,
    maybeSingle: async () => ({ data: null, error: null }),
  };
  return {
    supabase: { from: () => insertChain },
  };
});

jest.mock('../../lib/remote-config', () => ({
  getConfig: () => ({ audioRelayWsUrl: 'wss://test/ws/', streamHlsUrl: 'http://test/h.m3u8' }),
}));

describe('broadcast state machine', () => {
  beforeEach(() => {
    sentFrames.length = 0;
    lastMic = null;
    // Hard-reset module state if a prior test left it active.
    return broadcast.stop();
  });

  it('opens mic, sends config frame, inserts row', async () => {
    const sess = await broadcast.start({ title_en: 'A', title_ur: 'A', userId: 'u' });
    expect(sess.id).toBe('row-1');
    expect(sess.paused).toBe(false);
    expect(lastMic?.startCalls).toBe(1);
    expect(JSON.parse(sentFrames[0])).toEqual({ format: 'pcm', sampleRate: 16000 });
  });

  it('pumps chunks to the WebSocket', async () => {
    await broadcast.start({ title_en: 'A', title_ur: 'A', userId: 'u' });
    const buf = new Uint8Array([1, 2, 3]);
    lastMic!.chunkCb!(buf);
    expect(sentFrames).toContain(buf);
  });

  it('pauses on interruption "began" and resumes on "ended"', async () => {
    await broadcast.start({ title_en: 'A', title_ur: 'A', userId: 'u' });
    lastMic!.intCb!('began');
    // pause is async — flush microtasks
    await new Promise((r) => setImmediate(r));
    expect(broadcast.getActive()?.paused).toBe(true);

    lastMic!.intCb!('ended');
    await new Promise((r) => setImmediate(r));
    expect(broadcast.getActive()?.paused).toBe(false);
  });

  it('stops cleanly', async () => {
    await broadcast.start({ title_en: 'A', title_ur: 'A', userId: 'u' });
    await broadcast.stop();
    expect(broadcast.getActive()).toBeNull();
    expect(lastMic?.stopCalls).toBe(1);
  });

  it('surfaces mic permission error from start()', async () => {
    const real = require('../../lib/mic.web').createMicSource;
    require('../../lib/mic.web').createMicSource = () => {
      const m = new FakeMic();
      m.startError = new (require('../../lib/mic').MicPermissionDeniedError)();
      lastMic = m;
      return m;
    };
    await expect(
      broadcast.start({ title_en: 'A', title_ur: 'A', userId: 'u' }),
    ).rejects.toThrow('Microphone permission denied');
    require('../../lib/mic.web').createMicSource = real;
  });
});
```

- [ ] **Step 2: Run the tests**

Run: `npx jest __tests__/lib/broadcast.test.ts`
Expected: 5 tests pass.

- [ ] **Step 3: Commit**

```bash
git add __tests__/lib/broadcast.test.ts
git commit -m "test(broadcast): cover start/chunk/pause/resume/stop and permission error"
```

---

## Task 7: Install `react-native-audio-record`

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install the package**

Run: `npm install react-native-audio-record@^0.2.2`
Expected: package installed, `package.json` and `package-lock.json` updated.

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit -p .`
Expected: no errors. (No code uses it yet — just verifying types resolve.)

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add react-native-audio-record"
```

---

## Task 8: Scaffold the `broadcast-service` Expo native module

**Files:**
- Create: `modules/broadcast-service/package.json`
- Create: `modules/broadcast-service/expo-module.config.json`
- Create: `modules/broadcast-service/index.ts`

- [ ] **Step 1: Write the module package.json**

Create `modules/broadcast-service/package.json`:

```json
{
  "name": "broadcast-service",
  "version": "0.1.0",
  "main": "index.ts",
  "private": true
}
```

- [ ] **Step 2: Register the Expo module**

Create `modules/broadcast-service/expo-module.config.json`:

```json
{
  "platforms": ["android", "ios"],
  "android": {
    "modules": ["com.khanqah.broadcastservice.BroadcastServiceModule"]
  },
  "ios": {
    "modules": ["BroadcastServiceModule"]
  }
}
```

- [ ] **Step 3: Write the JS shim**

Create `modules/broadcast-service/index.ts`:

```ts
import { NativeModule, requireNativeModule, EventEmitter } from 'expo-modules-core';

declare class NativeBroadcastService extends NativeModule {
  /** Acquire mic permission, configure audio session, and (Android only)
   *  start the foreground service so capture survives screen-lock. */
  startSession(): Promise<void>;

  /** Tear down audio session and (Android only) stop the foreground service. */
  stopSession(): Promise<void>;
}

const native = requireNativeModule<NativeBroadcastService>('BroadcastService');
export const events = new EventEmitter(native as any);

export default native;
export type InterruptionEvent = { state: 'began' | 'ended' };
```

- [ ] **Step 4: Register the module in `package.json`**

Add to root `package.json` `dependencies`:

```json
"broadcast-service": "file:./modules/broadcast-service"
```

Run: `npm install`
Expected: symlink installed.

- [ ] **Step 5: Commit**

```bash
git add modules/broadcast-service/ package.json package-lock.json
git commit -m "feat(broadcast-service): scaffold local Expo module"
```

---

## Task 9: Android — foreground service + Kotlin module

**Files:**
- Create: `modules/broadcast-service/android/build.gradle`
- Create: `modules/broadcast-service/android/src/main/AndroidManifest.xml`
- Create: `modules/broadcast-service/android/src/main/java/com/khanqah/broadcastservice/BroadcastServiceModule.kt`
- Create: `modules/broadcast-service/android/src/main/java/com/khanqah/broadcastservice/BroadcastForegroundService.kt`

- [ ] **Step 1: Write `build.gradle`**

Create `modules/broadcast-service/android/build.gradle`:

```gradle
apply plugin: 'com.android.library'
apply plugin: 'kotlin-android'

group = 'com.khanqah.broadcastservice'
version = '0.1.0'

android {
  namespace 'com.khanqah.broadcastservice'
  compileSdk 35
  defaultConfig {
    minSdk 24
    targetSdk 35
  }
  compileOptions {
    sourceCompatibility JavaVersion.VERSION_17
    targetCompatibility JavaVersion.VERSION_17
  }
  kotlinOptions { jvmTarget = '17' }
}

dependencies {
  implementation project(':expo-modules-core')
  implementation 'org.jetbrains.kotlin:kotlin-stdlib:1.9.25'
}
```

- [ ] **Step 2: Write the AndroidManifest**

Create `modules/broadcast-service/android/src/main/AndroidManifest.xml`:

```xml
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
  <uses-permission android:name="android.permission.RECORD_AUDIO" />
  <uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
  <uses-permission android:name="android.permission.FOREGROUND_SERVICE_MICROPHONE" />
  <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
  <uses-permission android:name="android.permission.WAKE_LOCK" />

  <application>
    <service
      android:name=".BroadcastForegroundService"
      android:foregroundServiceType="microphone"
      android:exported="false" />
  </application>
</manifest>
```

- [ ] **Step 3: Write the foreground service**

Create `modules/broadcast-service/android/src/main/java/com/khanqah/broadcastservice/BroadcastForegroundService.kt`:

```kotlin
package com.khanqah.broadcastservice

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Intent
import android.os.Build
import android.os.IBinder
import android.os.PowerManager
import androidx.core.app.NotificationCompat

class BroadcastForegroundService : Service() {
  companion object {
    const val CHANNEL_ID = "khanqah_broadcast"
    const val NOTIFICATION_ID = 4711
  }

  private var wakeLock: PowerManager.WakeLock? = null

  override fun onCreate() {
    super.onCreate()
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val nm = getSystemService(NotificationManager::class.java)
      nm?.createNotificationChannel(
        NotificationChannel(
          CHANNEL_ID,
          "Live broadcast",
          NotificationManager.IMPORTANCE_LOW,
        ).apply { description = "Shown while broadcasting live audio" },
      )
    }
    val notification = NotificationCompat.Builder(this, CHANNEL_ID)
      .setContentTitle("Broadcasting live")
      .setContentText("Streaming audio to listeners")
      .setSmallIcon(android.R.drawable.ic_btn_speak_now)
      .setOngoing(true)
      .setPriority(NotificationCompat.PRIORITY_LOW)
      .build()
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      startForeground(
        NOTIFICATION_ID,
        notification,
        android.content.pm.ServiceInfo.FOREGROUND_SERVICE_TYPE_MICROPHONE,
      )
    } else {
      startForeground(NOTIFICATION_ID, notification)
    }
    val pm = getSystemService(POWER_SERVICE) as PowerManager
    wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "khanqah:broadcast").apply { acquire() }
  }

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int = START_STICKY

  override fun onDestroy() {
    try { wakeLock?.release() } catch (_: Throwable) {}
    wakeLock = null
    super.onDestroy()
  }

  override fun onBind(intent: Intent?): IBinder? = null
}
```

- [ ] **Step 4: Write the Expo module class with audio-focus listener**

Create `modules/broadcast-service/android/src/main/java/com/khanqah/broadcastservice/BroadcastServiceModule.kt`:

```kotlin
package com.khanqah.broadcastservice

import android.content.Context
import android.content.Intent
import android.media.AudioAttributes
import android.media.AudioFocusRequest
import android.media.AudioManager
import android.os.Build
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class BroadcastServiceModule : Module() {
  private var audioManager: AudioManager? = null
  private var focusRequest: AudioFocusRequest? = null

  private val focusListener = AudioManager.OnAudioFocusChangeListener { change ->
    when (change) {
      AudioManager.AUDIOFOCUS_LOSS_TRANSIENT,
      AudioManager.AUDIOFOCUS_LOSS_TRANSIENT_CAN_DUCK ->
        sendEvent("interruption", mapOf("state" to "began"))
      AudioManager.AUDIOFOCUS_GAIN ->
        sendEvent("interruption", mapOf("state" to "ended"))
      // AUDIOFOCUS_LOSS (permanent) is intentionally not emitted.
      // Admin manually taps Stop in this rare case; auto-stopping
      // would race with the WebSocket close path in broadcast.ts.
      else -> { /* ignore */ }
    }
  }

  override fun definition() = ModuleDefinition {
    Name("BroadcastService")
    Events("interruption")

    AsyncFunction("startSession") {
      val ctx: Context = appContext.reactContext ?: return@AsyncFunction
      audioManager = ctx.getSystemService(Context.AUDIO_SERVICE) as AudioManager

      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        val attrs = AudioAttributes.Builder()
          .setUsage(AudioAttributes.USAGE_VOICE_COMMUNICATION)
          .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
          .build()
        val req = AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN)
          .setAudioAttributes(attrs)
          .setAcceptsDelayedFocusGain(false)
          .setOnAudioFocusChangeListener(focusListener)
          .build()
        focusRequest = req
        audioManager?.requestAudioFocus(req)
      } else {
        @Suppress("DEPRECATION")
        audioManager?.requestAudioFocus(
          focusListener,
          AudioManager.STREAM_VOICE_CALL,
          AudioManager.AUDIOFOCUS_GAIN,
        )
      }

      val intent = Intent(ctx, BroadcastForegroundService::class.java)
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        ctx.startForegroundService(intent)
      } else {
        ctx.startService(intent)
      }
    }

    AsyncFunction("stopSession") {
      val ctx: Context = appContext.reactContext ?: return@AsyncFunction
      ctx.stopService(Intent(ctx, BroadcastForegroundService::class.java))
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        focusRequest?.let { audioManager?.abandonAudioFocusRequest(it) }
      } else {
        @Suppress("DEPRECATION")
        audioManager?.abandonAudioFocus(focusListener)
      }
      focusRequest = null
      audioManager = null
    }
  }
}
```

- [ ] **Step 5: Run prebuild + Android compile to confirm the module wires up**

Run:
```bash
npx expo prebuild --platform android --no-install
cd android && ./gradlew :broadcast-service:assembleDebug
```
Expected: BUILD SUCCESSFUL.

- [ ] **Step 6: Commit**

```bash
git add modules/broadcast-service/android/
git commit -m "feat(broadcast-service): Android foreground-service module"
```

---

## Task 10: iOS — Swift module with `AVAudioSession` + interruption observer

**Files:**
- Create: `modules/broadcast-service/ios/BroadcastService.podspec`
- Create: `modules/broadcast-service/ios/BroadcastServiceModule.swift`

- [ ] **Step 1: Write the podspec**

Create `modules/broadcast-service/ios/BroadcastService.podspec`:

```ruby
require 'json'
package = JSON.parse(File.read(File.join(__dir__, '..', 'package.json')))

Pod::Spec.new do |s|
  s.name           = 'BroadcastService'
  s.version        = package['version']
  s.summary        = 'Audio session + interruption observer for Khanqah live broadcast'
  s.author         = 'ennbi'
  s.homepage       = 'https://github.com/ennbi/khanqah'
  s.platforms      = { :ios => '15.1' }
  s.swift_version  = '5.4'
  s.source         = { git: '' }
  s.source_files   = '**/*.{h,m,swift}'
  s.dependency 'ExpoModulesCore'
  s.license        = 'MIT'
end
```

- [ ] **Step 2: Write the Swift module**

Create `modules/broadcast-service/ios/BroadcastServiceModule.swift`:

```swift
import ExpoModulesCore
import AVFoundation

public class BroadcastServiceModule: Module {
  public func definition() -> ModuleDefinition {
    Name("BroadcastService")
    Events("interruption")

    AsyncFunction("startSession") { (promise: Promise) in
      do {
        let session = AVAudioSession.sharedInstance()
        try session.setCategory(
          .playAndRecord,
          mode: .default,
          options: [.allowBluetooth, .defaultToSpeaker]
        )
        try session.setActive(true, options: [])
        NotificationCenter.default.removeObserver(self)
        NotificationCenter.default.addObserver(
          self,
          selector: #selector(self.onInterruption(_:)),
          name: AVAudioSession.interruptionNotification,
          object: session
        )
        promise.resolve(nil)
      } catch {
        promise.reject("AUDIO_SESSION_ERROR", error.localizedDescription)
      }
    }

    AsyncFunction("stopSession") { (promise: Promise) in
      NotificationCenter.default.removeObserver(self)
      do {
        try AVAudioSession.sharedInstance().setActive(false, options: [.notifyOthersOnDeactivation])
        promise.resolve(nil)
      } catch {
        // Deactivation can fail benignly if another app already grabbed
        // audio focus — surface no error to JS.
        promise.resolve(nil)
      }
    }
  }

  @objc private func onInterruption(_ notification: Notification) {
    guard
      let info = notification.userInfo,
      let typeRaw = info[AVAudioSessionInterruptionTypeKey] as? UInt,
      let type = AVAudioSession.InterruptionType(rawValue: typeRaw)
    else { return }

    switch type {
    case .began:
      sendEvent("interruption", ["state": "began"])
    case .ended:
      let optsRaw = (info[AVAudioSessionInterruptionOptionKey] as? UInt) ?? 0
      let opts = AVAudioSession.InterruptionOptions(rawValue: optsRaw)
      if opts.contains(.shouldResume) {
        sendEvent("interruption", ["state": "ended"])
      }
    @unknown default: break
    }
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add modules/broadcast-service/ios/
git commit -m "feat(broadcast-service): iOS AVAudioSession + interruption observer"
```

---

## Task 11: Config plugin — wire the manifest + Info.plist

**Files:**
- Create: `plugins/with-broadcast-native.js`
- Modify: `app.json`

- [ ] **Step 1: Write the config plugin**

Create `plugins/with-broadcast-native.js`:

```js
/**
 * Expo config plugin for the Khanqah live-broadcast feature.
 * Adds Android permissions/foreground-service declaration and the iOS
 * UIBackgroundModes + microphone-usage strings. The native code itself
 * lives in modules/broadcast-service.
 */
const {
  withAndroidManifest,
  withInfoPlist,
  AndroidConfig,
} = require('@expo/config-plugins');

const ANDROID_PERMISSIONS = [
  'android.permission.RECORD_AUDIO',
  'android.permission.FOREGROUND_SERVICE',
  'android.permission.FOREGROUND_SERVICE_MICROPHONE',
  'android.permission.POST_NOTIFICATIONS',
  'android.permission.WAKE_LOCK',
];

const withBroadcastNative = (config) => {
  config = withAndroidManifest(config, (cfg) => {
    AndroidConfig.Permissions.ensurePermissions(cfg.modResults, ANDROID_PERMISSIONS);
    return cfg;
  });

  config = withInfoPlist(config, (cfg) => {
    const plist = cfg.modResults;
    plist.NSMicrophoneUsageDescription =
      plist.NSMicrophoneUsageDescription ||
      'Khanqah uses your microphone so admins can broadcast live bayaans.';
    const modes = new Set(plist.UIBackgroundModes || []);
    modes.add('audio');
    plist.UIBackgroundModes = Array.from(modes);
    return cfg;
  });

  return config;
};

module.exports = withBroadcastNative;
```

- [ ] **Step 2: Register the plugin in `app.json`**

Open `app.json`. In the `expo.plugins` array, add `"./plugins/with-broadcast-native"` after the existing `"./plugins/with-splash-window-bg"` line so the file looks like:

```json
"plugins": [
  "expo-router",
  "expo-sqlite",
  "expo-web-browser",
  [
    "expo-splash-screen",
    {
      "backgroundColor": "#0f2e24",
      "image": "./assets/images/splash-icon.png",
      "imageWidth": 280,
      "resizeMode": "contain"
    }
  ],
  "./plugins/with-splash-window-bg",
  "./plugins/with-broadcast-native"
]
```

- [ ] **Step 3: Run prebuild and confirm permissions land in the manifest**

Run:
```bash
npx expo prebuild --platform android --no-install
grep -E 'RECORD_AUDIO|FOREGROUND_SERVICE_MICROPHONE|POST_NOTIFICATIONS' android/app/src/main/AndroidManifest.xml
```
Expected: all three permission lines printed.

- [ ] **Step 4: Confirm Info.plist gets the audio background mode**

Run:
```bash
npx expo prebuild --platform ios --no-install
grep -A2 UIBackgroundModes ios/*/Info.plist
```
Expected: an array containing `audio`.

- [ ] **Step 5: Commit**

```bash
git add plugins/with-broadcast-native.js app.json
git commit -m "feat(broadcast): config plugin for Android perms + iOS Info.plist"
```

---

## Task 12: Real `mic.native.ts` — react-native-audio-record + module wiring

**Files:**
- Modify: `lib/mic.native.ts` (replace the stub from Task 4)

- [ ] **Step 1: Replace the stub with the real implementation**

Replace `lib/mic.native.ts` with:

```ts
// lib/mic.native.ts
import { Buffer } from 'buffer';
import { PermissionsAndroid, Platform } from 'react-native';
import AudioRecord from 'react-native-audio-record';
import BroadcastService, { events as broadcastEvents } from 'broadcast-service';
import { MicSource, MicConfigFrame, MicPermissionDeniedError } from './mic';

const SAMPLE_RATE = 16000;
const CHANNELS = 1;
const BITS_PER_SAMPLE = 16;

type ChunkCb = (chunk: Uint8Array) => void;
type ErrCb = (err: Error) => void;
type IntCb = (e: 'began' | 'ended') => void;

class NativeMic implements MicSource {
  private chunkCbs: ChunkCb[] = [];
  private errCbs: ErrCb[] = [];
  private intCbs: IntCb[] = [];
  private dataSub: { remove: () => void } | null = null;
  private intSub: { remove: () => void } | null = null;
  private started = false;

  async start(): Promise<MicConfigFrame> {
    if (Platform.OS === 'android') {
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        {
          title: 'Microphone access',
          message: 'Khanqah needs the mic to broadcast live audio.',
          buttonPositive: 'Allow',
        },
      );
      if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
        throw new MicPermissionDeniedError();
      }
    }

    // iOS permission is requested implicitly by AVAudioSession activation;
    // a denial throws AUDIO_SESSION_ERROR which we map to the same class.
    try {
      await BroadcastService.startSession();
    } catch (err: any) {
      if (Platform.OS === 'ios' && /denied/i.test(err?.message ?? '')) {
        throw new MicPermissionDeniedError();
      }
      throw err;
    }

    this.intSub = broadcastEvents.addListener('interruption', (evt: { state: 'began' | 'ended' }) => {
      for (const cb of this.intCbs) cb(evt.state);
    });

    AudioRecord.init({
      sampleRate: SAMPLE_RATE,
      channels: CHANNELS,
      bitsPerSample: BITS_PER_SAMPLE,
      audioSource: 6, // VOICE_RECOGNITION on Android — better mic preprocessing
      wavFile: 'unused.wav', // not actually written, library quirk
    });

    this.dataSub = AudioRecord.on('data', (data: string) => {
      const buf = new Uint8Array(Buffer.from(data, 'base64'));
      for (const cb of this.chunkCbs) cb(buf);
    });

    AudioRecord.start();
    this.started = true;
    return { format: 'pcm', sampleRate: SAMPLE_RATE };
  }

  async stop(): Promise<void> {
    if (!this.started) return;
    this.started = false;
    try { await AudioRecord.stop(); } catch {}
    try { this.dataSub?.remove(); } catch {}
    this.dataSub = null;
    try { this.intSub?.remove(); } catch {}
    this.intSub = null;
    try { await BroadcastService.stopSession(); } catch {}
  }

  onChunk(cb: ChunkCb): () => void {
    this.chunkCbs.push(cb);
    return () => {
      const i = this.chunkCbs.indexOf(cb);
      if (i >= 0) this.chunkCbs.splice(i, 1);
    };
  }

  onError(cb: ErrCb): () => void {
    this.errCbs.push(cb);
    return () => {
      const i = this.errCbs.indexOf(cb);
      if (i >= 0) this.errCbs.splice(i, 1);
    };
  }

  onInterruption(cb: IntCb): () => void {
    this.intCbs.push(cb);
    return () => {
      const i = this.intCbs.indexOf(cb);
      if (i >= 0) this.intCbs.splice(i, 1);
    };
  }
}

export function createMicSource(): MicSource {
  return new NativeMic();
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit -p .`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/mic.native.ts
git commit -m "feat(broadcast): native MicSource wires react-native-audio-record + module"
```

---

## Task 13: UI — handle permission denial in go-live screen

**Files:**
- Modify: `app/admin/go-live.tsx`

- [ ] **Step 1: Read the current error-handling block**

Open `app/admin/go-live.tsx`. Find the `onStart` handler (it calls `broadcast.start(...)` inside a `try/catch`). The current catch surfaces `BroadcastLockedError` and a generic error message via `setBroadcastError`.

- [ ] **Step 2: Add permission-denied branch**

Add to the existing imports at the top of the file:

```tsx
import { Linking } from 'react-native';
import { broadcast, BroadcastLockedError, MicPermissionDeniedError } from '../../lib/broadcast';
```

(Only the `MicPermissionDeniedError` import is new — leave any existing imports alone.)

In the `catch (err)` block of the start handler, add a new branch *before* the generic-error branch:

```tsx
if (err instanceof MicPermissionDeniedError) {
  setBroadcastError(
    'Microphone access is blocked. Tap "Open Settings" and grant mic access, then try again.',
  );
  setShowOpenSettings(true);
  return;
}
```

Add to the component's state declarations (next to `starting`/`stopping`):

```tsx
const [showOpenSettings, setShowOpenSettings] = useState(false);
```

In the JSX, find the existing error banner. Immediately after the `<Text>` rendering `broadcastError`, add:

```tsx
{showOpenSettings && (
  <TouchableOpacity
    onPress={() => {
      setShowOpenSettings(false);
      Linking.openSettings().catch(() => {});
    }}
    style={{ marginTop: 8, alignSelf: 'flex-start' }}
    accessibilityLabel="Open app settings"
  >
    <Text style={{ color: c.primary, fontWeight: '600' }}>Open Settings</Text>
  </TouchableOpacity>
)}
```

When `setBroadcastError(null)` is called elsewhere in the file (typically on retry), also reset the new flag: change those lines to:

```tsx
setBroadcastError(null);
setShowOpenSettings(false);
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit -p .`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add app/admin/go-live.tsx
git commit -m "feat(go-live): show 'Open Settings' link on mic-permission denial"
```

---

## Task 14: Build, install, manual device matrix

**Files:**
- None (verification task)

- [ ] **Step 1: Build the Android release APK locally**

Run:
```bash
export JAVA_HOME="/opt/homebrew/opt/openjdk@17"
export PATH="$JAVA_HOME/bin:/opt/homebrew/share/android-commandlinetools/platform-tools:$PATH"
export ANDROID_HOME="/opt/homebrew/share/android-commandlinetools"
export ANDROID_SDK_ROOT="$ANDROID_HOME"
npx expo prebuild --platform android --no-install
cd android && ./gradlew assembleRelease
```
Expected: `android/app/build/outputs/apk/release/app-release.apk` produced.

- [ ] **Step 2: Install on device**

Run: `adb install -r android/app/build/outputs/apk/release/app-release.apk`
Expected: `Success`. (If signature mismatch with prior build, `adb uninstall com.ennbi.khanqah` first.)

- [ ] **Step 3: Run the device matrix and record outcomes**

Open the admin go-live screen on each device, run each case below, and tick the box. Audio is verified by playing the public live URL on a second device.

| Device | Case | Pass? |
|---|---|---|
| Android 12 MIUI | broadcast for 60 s with screen locked | [ ] |
| Android 12 MIUI | incoming phone call mid-broadcast → call ends → audio resumes | [ ] |
| Android 14 stock | airplane mode toggle → error banner appears, session ends | [ ] |
| Android 14 stock | force-kill from recents → session goes stale within 90 s | [ ] |
| iOS 17 | invoke Siri mid-broadcast → dismiss Siri → audio resumes | [ ] |
| iOS 17 | incoming phone call → call ends → audio resumes | [ ] |
| iOS 17 | screen lock for 60 s → audio continues | [ ] |
| Web Chrome | regression: existing flow still works | [ ] |

- [ ] **Step 4: Smoke-test the relay for leaks**

Open an SSH session to the DigitalOcean box (use `~/Documents/myproj/digiocean` private key):

```bash
ssh -i ~/Documents/myproj/digiocean root@165.22.208.103
# while the 30-min Android broadcast is running:
ps -o pid,rss,cmd -p $(pgrep -f 'ffmpeg.*pipe:0') | head
ss -np 'sport = :3001' | head
```
Expected: ffmpeg RSS stays under 200 MB; one and only one client socket on port 3001.

- [ ] **Step 5: Commit the matrix outcomes**

```bash
git add docs/superpowers/plans/2026-04-25-native-broadcast.md
git commit -m "test(broadcast): record device-matrix outcomes for native broadcast"
```

---

## Notes for the implementer

- **Why no client-side Opus encoding:** the relay already pays the cost of transmuxing to AAC. Sending uncompressed 16 kHz mono PCM is ~256 kbps upload — fine on wifi and modern 4G/5G. Adding native Opus encoding would shave bandwidth ~5× but doubles the native code surface. YAGNI for now.
- **Why one foreground service, no MediaSession:** the broadcast notification doesn't need to be tappable to control the session — closing the app stops the broadcast already. Keeping it minimal.
- **Test runner:** there is no `"test"` script in `package.json`. Run tests with `npx jest`. The Jest preset (`jest-expo`) is already configured under `package.json`'s `jest` key.
- **Why `state.configFrame` is captured in `broadcast.ts`:** so resume-after-interruption can re-send the right config frame to the relay (e.g., re-announce `sampleRate: 16000` after the WebSocket closes during a phone call).
- **Buffer polyfill:** the `buffer` package ships with React Native by default; no explicit install needed for `Buffer.from(base64, 'base64')` to work.
