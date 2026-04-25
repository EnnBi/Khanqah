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
