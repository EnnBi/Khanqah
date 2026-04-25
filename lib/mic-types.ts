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
