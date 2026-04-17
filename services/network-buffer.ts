import { NetworkEntry, NETWORK_BUFFER_SIZE } from './bug-reporter-types';

let buffer: NetworkEntry[] = [];
let originalFetch: typeof global.fetch | null = null;
let errorCallback: ((entry: NetworkEntry) => void) | null = null;

export function pushNetworkEntry(entry: Omit<NetworkEntry, 'timestamp'>): void {
  buffer.push({ timestamp: new Date().toISOString(), ...entry });
  if (buffer.length > NETWORK_BUFFER_SIZE) {
    buffer.splice(0, buffer.length - NETWORK_BUFFER_SIZE);
  }
}

export function getNetworkBuffer(): NetworkEntry[] {
  return buffer.slice();
}

export function clearNetworkBuffer(): void {
  buffer = [];
}

export function setNetworkErrorCallback(cb: (entry: NetworkEntry) => void): void {
  errorCallback = cb;
}

export function installFetchPatch(): void {
  if (originalFetch) return; // already installed
  originalFetch = global.fetch.bind(global);

  global.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const start = Date.now();
    const method = (init?.method || 'GET').toUpperCase();
    const url =
      typeof input === 'string'
        ? input
        : input instanceof URL
          ? input.toString()
          : (input as Request).url;

    try {
      const res = await originalFetch!(input, init);
      const entry: NetworkEntry = {
        timestamp: new Date().toISOString(),
        method,
        url,
        status: res.status,
        durationMs: Date.now() - start,
      };
      pushToBufferRaw(entry);
      if (res.status >= 400) errorCallback?.(entry);
      return res;
    } catch (err: any) {
      const entry: NetworkEntry = {
        timestamp: new Date().toISOString(),
        method,
        url,
        durationMs: Date.now() - start,
        error: err?.message ?? String(err),
      };
      pushToBufferRaw(entry);
      errorCallback?.(entry);
      throw err;
    }
  }) as typeof global.fetch;
}

function pushToBufferRaw(entry: NetworkEntry): void {
  buffer.push(entry);
  if (buffer.length > NETWORK_BUFFER_SIZE) {
    buffer.splice(0, buffer.length - NETWORK_BUFFER_SIZE);
  }
}

/** TEST ONLY: restore fetch. */
export function __restoreFetchForTest(): void {
  if (originalFetch) {
    global.fetch = originalFetch;
    originalFetch = null;
  }
  errorCallback = null;
}
