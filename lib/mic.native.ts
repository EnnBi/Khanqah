// lib/mic.native.ts
import { Buffer } from 'buffer';
import { PermissionsAndroid, Platform } from 'react-native';
import AudioRecord from 'react-native-audio-record';
import BroadcastService, { events as broadcastEventsRaw } from 'broadcast-service';
import { MicSource, MicConfigFrame, MicPermissionDeniedError } from './mic-types';

// broadcastEventsRaw is typed as EventEmitter<Record<never,never>> because the
// module creates it with `new EventEmitter(native as any)` without a type param.
// Cast to a minimal typed listener interface so addListener accepts 'interruption'.
interface TypedInterruptionEmitter {
  addListener(
    event: 'interruption',
    listener: (evt: { state: 'began' | 'ended' }) => void,
  ): { remove(): void };
}
const broadcastEvents = broadcastEventsRaw as unknown as TypedInterruptionEmitter;

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
  // AudioRecord.on actually returns { remove() } at runtime even though
  // the bundled .d.ts says void — cast to keep TypeScript happy.
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

    // AudioRecord.on returns { remove() } at runtime; the .d.ts says void.
    this.dataSub = AudioRecord.on('data', (data: string) => {
      const buf = new Uint8Array(Buffer.from(data, 'base64'));
      for (const cb of this.chunkCbs) cb(buf);
    }) as unknown as { remove: () => void };

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
