import {
  pushNetworkEntry,
  getNetworkBuffer,
  clearNetworkBuffer,
  installFetchPatch,
  __restoreFetchForTest,
  setNetworkErrorCallback,
} from '../../services/network-buffer';
import { NETWORK_BUFFER_SIZE } from '../../services/bug-reporter-types';

describe('network-buffer', () => {
  beforeEach(() => {
    clearNetworkBuffer();
  });

  it('starts empty', () => {
    expect(getNetworkBuffer()).toEqual([]);
  });

  it('pushes an entry', () => {
    pushNetworkEntry({ method: 'GET', url: 'https://x', status: 200, durationMs: 10 });
    const buf = getNetworkBuffer();
    expect(buf).toHaveLength(1);
    expect(buf[0].method).toBe('GET');
    expect(buf[0].status).toBe(200);
  });

  it('FIFO drop past NETWORK_BUFFER_SIZE', () => {
    for (let i = 0; i < NETWORK_BUFFER_SIZE + 5; i++) {
      pushNetworkEntry({ method: 'GET', url: `u${i}`, status: 200, durationMs: 1 });
    }
    const buf = getNetworkBuffer();
    expect(buf).toHaveLength(NETWORK_BUFFER_SIZE);
    expect(buf[0].url).toBe('u5');
  });

  it('getNetworkBuffer returns a copy', () => {
    pushNetworkEntry({ method: 'GET', url: 'u', status: 200, durationMs: 1 });
    const buf = getNetworkBuffer();
    buf.length = 0;
    expect(getNetworkBuffer()).toHaveLength(1);
  });
});

describe('installFetchPatch', () => {
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    originalFetch = global.fetch;
    clearNetworkBuffer();
  });

  afterEach(() => {
    __restoreFetchForTest();
    global.fetch = originalFetch;
  });

  it('captures successful fetch', async () => {
    global.fetch = jest.fn(async () => ({ status: 200 } as Response));
    installFetchPatch();
    await fetch('https://example.com/api');
    const buf = getNetworkBuffer();
    expect(buf).toHaveLength(1);
    expect(buf[0].url).toBe('https://example.com/api');
    expect(buf[0].status).toBe(200);
    expect(typeof buf[0].durationMs).toBe('number');
  });

  it('captures fetch error', async () => {
    global.fetch = jest.fn(async () => {
      throw new Error('network down');
    });
    installFetchPatch();
    await expect(fetch('https://example.com/fail')).rejects.toThrow('network down');
    const buf = getNetworkBuffer();
    expect(buf).toHaveLength(1);
    expect(buf[0].error).toBe('network down');
    expect(buf[0].status).toBeUndefined();
  });

  it('fires error callback on status >= 400', async () => {
    const cb = jest.fn();
    setNetworkErrorCallback(cb);
    global.fetch = jest.fn(async () => ({ status: 500 } as Response));
    installFetchPatch();
    await fetch('https://example.com/bad');
    expect(cb).toHaveBeenCalledWith(
      expect.objectContaining({ status: 500, url: 'https://example.com/bad' }),
    );
  });

  it('does not fire error callback on 2xx', async () => {
    const cb = jest.fn();
    setNetworkErrorCallback(cb);
    global.fetch = jest.fn(async () => ({ status: 200 } as Response));
    installFetchPatch();
    await fetch('https://example.com/ok');
    expect(cb).not.toHaveBeenCalled();
  });

  it('installFetchPatch is idempotent', async () => {
    global.fetch = jest.fn(async () => ({ status: 200 } as Response));
    installFetchPatch();
    installFetchPatch();
    await fetch('https://example.com/one');
    expect(getNetworkBuffer()).toHaveLength(1);
  });
});
