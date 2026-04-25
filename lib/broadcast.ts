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
import { createMicSource } from './mic-source';
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
  resuming: boolean;
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
  resuming: false,
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
  // Known gap: caller must wire ws.onclose / ws.onerror immediately
  // after we return. Between this point and that wiring, a socket
  // drop is silently absorbed (the handshake-era onclose just
  // rejects an already-resolved Promise). Acceptable on stable
  // networks; revisit if we observe missed-disconnects in the wild.
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
          // 23505 = unique_violation — someone else is live.
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
      state.configFrame = null;
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
      const m = state.mic;
      state.mic = null;
      try { await m.stop(); } catch {}
    }
  },

  async _resumeFromInterruption(): Promise<void> {
    if (!state.active || !state.active.paused) return;
    if (state.resuming) return;
    if (!state.configFrame) {
      throw new Error('No config frame to resume with');
    }
    state.resuming = true;
    try {
      const mic = createMicSource();
      const newFrame = await mic.start();
      // Only commit to state after the mic actually came up.
      state.mic = mic;
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
    } finally {
      state.resuming = false;
    }
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
