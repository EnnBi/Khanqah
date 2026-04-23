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
