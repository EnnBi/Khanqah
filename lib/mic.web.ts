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
