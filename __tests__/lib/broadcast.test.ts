import { broadcast, BroadcastLockedError } from '../../lib/broadcast';
// Explicitly import from the .ts extension to bypass jest-expo's native platform
// resolution, which would resolve `lib/mic` → `lib/mic.native.ts` (stub only).
// The base mic.ts file contains MicPermissionDeniedError and the MicSource interface.
import { MicSource, MicConfigFrame, MicPermissionDeniedError } from '../../lib/mic.ts';

// Jest hoists jest.mock() calls before imports and forbids references to
// out-of-scope variables — *unless* the variable name starts with "mock"
// (case-insensitive). We solve this by:
//   1. Giving the shared state object a mock-prefixed name so it can be
//      referenced inside the jest.mock factory.
//   2. Defining FakeMic inside the factory (only the factory needs to
//      construct instances; tests access them via mockMicRegistry.last).

interface FakeMicShape extends MicSource {
  startCalls: number;
  stopCalls: number;
  chunkCb: ((c: Uint8Array) => void) | null;
  intCb: ((e: 'began' | 'ended') => void) | null;
  startResult: MicConfigFrame;
  startError: Error | null;
}

// mockMicRegistry is accessible inside jest.mock factories (mock* prefix).
const mockMicRegistry: { last: FakeMicShape | null; forceError: Error | null } = {
  last: null,
  forceError: null,
};

jest.mock('../../lib/mic-source', () => ({
  createMicSource: () => {
    class FakeMic {
      startCalls = 0;
      stopCalls = 0;
      chunkCb: ((c: Uint8Array) => void) | null = null;
      intCb: ((e: 'began' | 'ended') => void) | null = null;
      startResult: MicConfigFrame = { format: 'pcm', sampleRate: 16000 };
      startError: Error | null = mockMicRegistry.forceError;

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
    mockMicRegistry.last = new FakeMic() as FakeMicShape;
    return mockMicRegistry.last;
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

// Drain pending microtasks. The state machine awaits multiple promises
// (mic.start, openWebsocket handshake, etc.); a single setImmediate may
// not be enough — yield several times.
async function flush() {
  for (let i = 0; i < 5; i++) {
    await new Promise((r) => setImmediate(r));
  }
}

describe('broadcast state machine', () => {
  beforeEach(async () => {
    sentFrames.length = 0;
    mockMicRegistry.last = null;
    mockMicRegistry.forceError = null;
    // Hard-reset module state if a prior test left it active.
    await broadcast.stop();
  });

  it('opens mic, sends config frame, inserts row', async () => {
    const sess = await broadcast.start({ title_en: 'A', title_ur: 'A', userId: 'u' });
    expect(sess.id).toBe('row-1');
    expect(sess.paused).toBe(false);
    expect(mockMicRegistry.last?.startCalls).toBe(1);
    expect(JSON.parse(sentFrames[0])).toEqual({ format: 'pcm', sampleRate: 16000 });
  });

  it('pumps chunks to the WebSocket', async () => {
    await broadcast.start({ title_en: 'A', title_ur: 'A', userId: 'u' });
    const buf = new Uint8Array([1, 2, 3]);
    mockMicRegistry.last!.chunkCb!(buf);
    expect(sentFrames).toContain(buf);
  });

  it('pauses on interruption "began" and resumes on "ended"', async () => {
    await broadcast.start({ title_en: 'A', title_ur: 'A', userId: 'u' });
    mockMicRegistry.last!.intCb!('began');
    await flush();
    expect(broadcast.getActive()?.paused).toBe(true);

    mockMicRegistry.last!.intCb!('ended');
    await flush();
    expect(broadcast.getActive()?.paused).toBe(false);
  });

  it('stops cleanly', async () => {
    await broadcast.start({ title_en: 'A', title_ur: 'A', userId: 'u' });
    await broadcast.stop();
    expect(broadcast.getActive()).toBeNull();
    expect(mockMicRegistry.last?.stopCalls).toBe(1);
  });

  it('surfaces mic permission error from start()', async () => {
    // Set forceError before calling start so the FakeMic factory picks it up.
    mockMicRegistry.forceError = new MicPermissionDeniedError();
    await expect(
      broadcast.start({ title_en: 'A', title_ur: 'A', userId: 'u' }),
    ).rejects.toThrow('Microphone permission denied');
  });
});
