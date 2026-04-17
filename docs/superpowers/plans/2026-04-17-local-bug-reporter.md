# Local Bug Reporter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a dev-only, local bug capture system (auto + manual) for the Khanqah app with an in-app admin screen to browse reports.

**Architecture:** Ring buffers patch `console` and `fetch` to capture recent activity. A floating 🐛 button lets the user file manual reports. All bugs store to filesystem (native) or IndexedDB (web). The admin screen lists and exports them. Everything guarded by `__DEV__`.

**Tech Stack:** TypeScript, React Native (Expo SDK 54), expo-file-system, IndexedDB (web), jest-expo

**Spec:** `docs/superpowers/specs/2026-04-17-local-bug-reporter-design.md`

---

## File Structure

```
services/
  log-buffer.ts                  # Console patch + ring buffer
  network-buffer.ts              # fetch patch + ring buffer
  bug-reporter.ts                # Public API, native storage (expo-file-system)
  bug-reporter.web.ts            # Web storage stub (IndexedDB)
  bug-reporter-types.ts          # Shared types (BugReport, LogEntry, NetworkEntry)

components/
  BugReporterButton.tsx          # Floating 🐛 button + submit modal

app/admin/
  bug-reports.tsx                # List + detail view

app/_layout.tsx                  # Install patches + mount BugReporterButton (modified)
app/admin/index.tsx              # Add "Bug Reports" nav card (modified)

__tests__/services/
  log-buffer.test.ts             # Ring buffer tests
  network-buffer.test.ts         # Fetch capture tests
  bug-reporter.test.ts           # Serialization + capacity tests
```

---

## Task 1: Shared types

**Files:**
- Create: `services/bug-reporter-types.ts`

- [ ] **Step 1: Create the types file**

Create `services/bug-reporter-types.ts`:

```typescript
export type BugType =
  | 'ui'
  | 'backend'
  | 'auto-error'
  | 'auto-warn'
  | 'auto-network'
  | 'other';

export interface LogEntry {
  timestamp: string;        // ISO 8601
  level: 'log' | 'warn' | 'error';
  message: string;
}

export interface NetworkEntry {
  timestamp: string;        // ISO 8601
  method: string;           // GET, POST, etc.
  url: string;
  status?: number;          // Missing on network error
  durationMs?: number;
  error?: string;
}

export interface BugReportErrorInfo {
  message: string;
  stack?: string;
  source?: string;
}

export interface BugReport {
  id: string;
  timestamp: string;
  type: BugType;
  note: string | null;
  route: string;
  appVersion: string;
  platform: 'ios' | 'android' | 'web';
  logs: LogEntry[];
  network: NetworkEntry[];
  error?: BugReportErrorInfo;
}

/** Max reports to keep before dropping oldest. */
export const MAX_REPORTS = 500;

/** Log buffer size. */
export const LOG_BUFFER_SIZE = 50;

/** Network buffer size. */
export const NETWORK_BUFFER_SIZE = 20;
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add services/bug-reporter-types.ts
git commit -m "feat(bug-reporter): add shared types"
```

---

## Task 2: Log buffer — ring buffer only (no patch yet)

**Files:**
- Create: `services/log-buffer.ts`
- Create: `__tests__/services/log-buffer.test.ts`

- [ ] **Step 1: Write failing tests**

Create `__tests__/services/log-buffer.test.ts`:

```typescript
import {
  pushLogEntry,
  getLogBuffer,
  clearLogBuffer,
} from '../../services/log-buffer';
import { LOG_BUFFER_SIZE } from '../../services/bug-reporter-types';

describe('log-buffer', () => {
  beforeEach(() => {
    clearLogBuffer();
  });

  it('starts empty', () => {
    expect(getLogBuffer()).toEqual([]);
  });

  it('pushes an entry', () => {
    pushLogEntry('log', 'hello');
    const buf = getLogBuffer();
    expect(buf).toHaveLength(1);
    expect(buf[0].level).toBe('log');
    expect(buf[0].message).toBe('hello');
    expect(buf[0].timestamp).toMatch(/\d{4}-\d{2}-\d{2}T/);
  });

  it('keeps at most LOG_BUFFER_SIZE entries (FIFO drop)', () => {
    for (let i = 0; i < LOG_BUFFER_SIZE + 10; i++) {
      pushLogEntry('log', `msg-${i}`);
    }
    const buf = getLogBuffer();
    expect(buf).toHaveLength(LOG_BUFFER_SIZE);
    expect(buf[0].message).toBe('msg-10');  // oldest dropped
    expect(buf[buf.length - 1].message).toBe(`msg-${LOG_BUFFER_SIZE + 9}`);
  });

  it('getLogBuffer returns a copy (caller mutation does not affect buffer)', () => {
    pushLogEntry('log', 'a');
    const buf = getLogBuffer();
    buf.push({ timestamp: 'x', level: 'log', message: 'injected' });
    expect(getLogBuffer()).toHaveLength(1);
  });

  it('clearLogBuffer empties the buffer', () => {
    pushLogEntry('log', 'a');
    pushLogEntry('log', 'b');
    clearLogBuffer();
    expect(getLogBuffer()).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/services/log-buffer.test.ts`
Expected: FAIL with "Cannot find module '../../services/log-buffer'".

- [ ] **Step 3: Implement log-buffer.ts**

Create `services/log-buffer.ts`:

```typescript
import { LogEntry, LOG_BUFFER_SIZE } from './bug-reporter-types';

let buffer: LogEntry[] = [];

export function pushLogEntry(level: LogEntry['level'], message: string): void {
  buffer.push({
    timestamp: new Date().toISOString(),
    level,
    message,
  });
  if (buffer.length > LOG_BUFFER_SIZE) {
    buffer.splice(0, buffer.length - LOG_BUFFER_SIZE);
  }
}

export function getLogBuffer(): LogEntry[] {
  return buffer.slice();
}

export function clearLogBuffer(): void {
  buffer = [];
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest __tests__/services/log-buffer.test.ts`
Expected: PASS — all 5 tests green.

- [ ] **Step 5: Commit**

```bash
git add services/log-buffer.ts __tests__/services/log-buffer.test.ts
git commit -m "feat(bug-reporter): add log buffer ring buffer"
```

---

## Task 3: Log buffer — console patching + serialization

**Files:**
- Modify: `services/log-buffer.ts`
- Modify: `__tests__/services/log-buffer.test.ts`

- [ ] **Step 1: Write failing tests for serialization + patch**

Append to `__tests__/services/log-buffer.test.ts`:

```typescript
import { serializeLogArgs, installConsolePatch, __restoreConsoleForTest } from '../../services/log-buffer';

describe('serializeLogArgs', () => {
  it('stringifies plain args separated by spaces', () => {
    expect(serializeLogArgs(['hi', 42, true])).toBe('hi 42 true');
  });

  it('serializes objects with JSON', () => {
    expect(serializeLogArgs([{ a: 1 }])).toBe('{"a":1}');
  });

  it('handles circular references gracefully', () => {
    const o: any = { name: 'x' };
    o.self = o;
    const out = serializeLogArgs([o]);
    expect(out).toContain('[Circular]');
  });

  it('handles Error objects by showing message', () => {
    expect(serializeLogArgs([new Error('boom')])).toContain('boom');
  });
});

describe('installConsolePatch', () => {
  afterEach(() => {
    __restoreConsoleForTest();
    clearLogBuffer();
  });

  it('captures console.log calls into the buffer', () => {
    installConsolePatch();
    console.log('captured');
    const buf = getLogBuffer();
    expect(buf).toHaveLength(1);
    expect(buf[0].level).toBe('log');
    expect(buf[0].message).toBe('captured');
  });

  it('captures console.warn and console.error', () => {
    installConsolePatch();
    console.warn('w');
    console.error('e');
    const buf = getLogBuffer();
    expect(buf.map((e) => e.level)).toEqual(['warn', 'error']);
  });

  it('calling installConsolePatch twice is idempotent', () => {
    installConsolePatch();
    installConsolePatch();
    console.log('once');
    expect(getLogBuffer()).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest __tests__/services/log-buffer.test.ts`
Expected: FAIL — "serializeLogArgs is not a function", etc.

- [ ] **Step 3: Implement serialization + patch**

Replace `services/log-buffer.ts` with:

```typescript
import { LogEntry, LOG_BUFFER_SIZE } from './bug-reporter-types';

let buffer: LogEntry[] = [];

// Keep references to originals so we can restore and avoid recursion.
let originalConsole: {
  log: typeof console.log;
  warn: typeof console.warn;
  error: typeof console.error;
} | null = null;

// Tee for on-error callback (installed by bug-reporter.ts).
let errorCallback: ((message: string) => void) | null = null;
let warnCallback: ((message: string) => void) | null = null;

export function pushLogEntry(level: LogEntry['level'], message: string): void {
  buffer.push({
    timestamp: new Date().toISOString(),
    level,
    message,
  });
  if (buffer.length > LOG_BUFFER_SIZE) {
    buffer.splice(0, buffer.length - LOG_BUFFER_SIZE);
  }
}

export function getLogBuffer(): LogEntry[] {
  return buffer.slice();
}

export function clearLogBuffer(): void {
  buffer = [];
}

/** Serialize an array of console args into a single string. */
export function serializeLogArgs(args: unknown[]): string {
  return args
    .map((a) => {
      if (a instanceof Error) return a.message + (a.stack ? '\n' + a.stack : '');
      if (typeof a === 'object' && a !== null) {
        try {
          return JSON.stringify(a);
        } catch {
          return safeJsonStringify(a);
        }
      }
      return String(a);
    })
    .join(' ');
}

function safeJsonStringify(obj: unknown): string {
  const seen = new WeakSet();
  return JSON.stringify(obj, (_key, value) => {
    if (typeof value === 'object' && value !== null) {
      if (seen.has(value as object)) return '[Circular]';
      seen.add(value as object);
    }
    return value;
  });
}

export function installConsolePatch(): void {
  if (originalConsole) return; // already installed

  originalConsole = {
    log: console.log.bind(console),
    warn: console.warn.bind(console),
    error: console.error.bind(console),
  };

  console.log = (...args: unknown[]) => {
    pushLogEntry('log', serializeLogArgs(args));
    originalConsole!.log(...args);
  };
  console.warn = (...args: unknown[]) => {
    const msg = serializeLogArgs(args);
    pushLogEntry('warn', msg);
    originalConsole!.warn(...args);
    warnCallback?.(msg);
  };
  console.error = (...args: unknown[]) => {
    const msg = serializeLogArgs(args);
    pushLogEntry('error', msg);
    originalConsole!.error(...args);
    errorCallback?.(msg);
  };
}

/** Set a callback invoked on every console.error. Used by bug-reporter. */
export function setErrorCallback(cb: (message: string) => void): void {
  errorCallback = cb;
}

/** Set a callback invoked on every console.warn. Used by bug-reporter. */
export function setWarnCallback(cb: (message: string) => void): void {
  warnCallback = cb;
}

/** Get the original console (safe to call from bug-reporter without recursion). */
export function getOriginalConsole(): typeof originalConsole {
  return originalConsole;
}

/** TEST ONLY: restore console and clear callbacks. */
export function __restoreConsoleForTest(): void {
  if (originalConsole) {
    console.log = originalConsole.log;
    console.warn = originalConsole.warn;
    console.error = originalConsole.error;
    originalConsole = null;
  }
  errorCallback = null;
  warnCallback = null;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest __tests__/services/log-buffer.test.ts`
Expected: PASS — all 9 tests green.

- [ ] **Step 5: Commit**

```bash
git add services/log-buffer.ts __tests__/services/log-buffer.test.ts
git commit -m "feat(bug-reporter): add console patch and arg serialization"
```

---

## Task 4: Network buffer

**Files:**
- Create: `services/network-buffer.ts`
- Create: `__tests__/services/network-buffer.test.ts`

- [ ] **Step 1: Write failing tests**

Create `__tests__/services/network-buffer.test.ts`:

```typescript
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest __tests__/services/network-buffer.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement network-buffer.ts**

Create `services/network-buffer.ts`:

```typescript
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
```

- [ ] **Step 4: Run tests**

Run: `npx jest __tests__/services/network-buffer.test.ts`
Expected: PASS — all 9 tests green.

- [ ] **Step 5: Commit**

```bash
git add services/network-buffer.ts __tests__/services/network-buffer.test.ts
git commit -m "feat(bug-reporter): add network buffer with fetch patch"
```

---

## Task 5: Bug reporter core (native, with in-memory storage adapter)

**Files:**
- Create: `services/bug-reporter.ts`
- Create: `__tests__/services/bug-reporter.test.ts`

This task sets up the public API and capacity pruning, using a pluggable storage adapter so we can unit-test without touching the real filesystem. The native FS-backed adapter comes in Task 6.

- [ ] **Step 1: Write failing tests**

Create `__tests__/services/bug-reporter.test.ts`:

```typescript
import {
  reportBug,
  getAllReports,
  clearReports,
  __setStorageForTest,
  __setRouteProviderForTest,
} from '../../services/bug-reporter';
import { clearLogBuffer, pushLogEntry } from '../../services/log-buffer';
import { clearNetworkBuffer, pushNetworkEntry } from '../../services/network-buffer';
import { BugReport, MAX_REPORTS } from '../../services/bug-reporter-types';

// In-memory storage backend
function memoryStorage() {
  let store: BugReport[] = [];
  return {
    async save(report: BugReport) {
      store.push(report);
    },
    async list() {
      return store.slice().sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    },
    async clear() {
      store = [];
    },
    async deleteOldest(count: number) {
      // keep newest (MAX_REPORTS), drop `count` oldest
      store = store
        .slice()
        .sort((a, b) => a.timestamp.localeCompare(b.timestamp))
        .slice(count);
    },
    async get(id: string) {
      return store.find((r) => r.id === id) ?? null;
    },
    _peek: () => store,
  };
}

describe('bug-reporter', () => {
  beforeEach(() => {
    __setStorageForTest(memoryStorage());
    __setRouteProviderForTest(() => '/some/route');
    clearLogBuffer();
    clearNetworkBuffer();
  });

  it('reportBug stores a report with current context', async () => {
    pushLogEntry('log', 'log line');
    pushNetworkEntry({ method: 'GET', url: 'u', status: 200, durationMs: 10 });
    const r = await reportBug({ type: 'ui', note: 'broken' });

    expect(r).toMatchObject({
      type: 'ui',
      note: 'broken',
      route: '/some/route',
    });
    expect(r.id).toBeTruthy();
    expect(r.timestamp).toMatch(/\d{4}-\d{2}-\d{2}T/);
    expect(r.logs).toHaveLength(1);
    expect(r.network).toHaveLength(1);
  });

  it('getAllReports returns newest first', async () => {
    const a = await reportBug({ type: 'ui', note: 'first' });
    await new Promise((r) => setTimeout(r, 10));
    const b = await reportBug({ type: 'ui', note: 'second' });
    const list = await getAllReports();
    expect(list[0].id).toBe(b.id);
    expect(list[1].id).toBe(a.id);
  });

  it('clearReports empties storage', async () => {
    await reportBug({ type: 'ui', note: 'x' });
    await clearReports();
    expect(await getAllReports()).toEqual([]);
  });

  it('prunes oldest when count exceeds MAX_REPORTS', async () => {
    const storage = memoryStorage();
    __setStorageForTest(storage);

    // Seed to MAX_REPORTS
    for (let i = 0; i < MAX_REPORTS; i++) {
      await reportBug({ type: 'ui', note: `r${i}` });
    }
    expect(storage._peek()).toHaveLength(MAX_REPORTS);

    // One more should drop the oldest
    await reportBug({ type: 'ui', note: 'new' });
    expect(storage._peek()).toHaveLength(MAX_REPORTS);
    expect(storage._peek().some((r) => r.note === 'new')).toBe(true);
    expect(storage._peek().some((r) => r.note === 'r0')).toBe(false);
  });

  it('attaches error info when provided', async () => {
    const r = await reportBug({
      type: 'auto-error',
      error: { message: 'boom', stack: 'at foo' },
    });
    expect(r.error).toEqual({ message: 'boom', stack: 'at foo' });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest __tests__/services/bug-reporter.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement bug-reporter.ts**

Create `services/bug-reporter.ts`:

```typescript
import { Platform } from 'react-native';
import {
  BugReport,
  BugReportErrorInfo,
  BugType,
  MAX_REPORTS,
} from './bug-reporter-types';
import { getLogBuffer } from './log-buffer';
import { getNetworkBuffer } from './network-buffer';

// ── Storage abstraction ────────────────────────────────────────────────────

export interface Storage {
  save(report: BugReport): Promise<void>;
  list(): Promise<BugReport[]>;              // newest first
  clear(): Promise<void>;
  deleteOldest(count: number): Promise<void>;
  get(id: string): Promise<BugReport | null>;
}

let storage: Storage | null = null;

/** Set the storage backend. Called by install-time setup in _layout.tsx. */
export function setStorage(s: Storage): void {
  storage = s;
}

/** TEST ONLY: force storage backend. */
export function __setStorageForTest(s: Storage): void {
  storage = s;
}

// ── Route provider (read current route without pulling expo-router here) ───

type RouteProvider = () => string;
let routeProvider: RouteProvider = () => '';

export function setRouteProvider(fn: RouteProvider): void {
  routeProvider = fn;
}

/** TEST ONLY. */
export function __setRouteProviderForTest(fn: RouteProvider): void {
  routeProvider = fn;
}

// ── App metadata provider ──────────────────────────────────────────────────

let appVersion = '0.0.0';
export function setAppVersion(v: string): void {
  appVersion = v;
}

// ── Public API ─────────────────────────────────────────────────────────────

function newId(): string {
  // Small UUID-ish id: timestamp + 6 random chars
  return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
}

function currentPlatform(): BugReport['platform'] {
  if (Platform.OS === 'ios') return 'ios';
  if (Platform.OS === 'android') return 'android';
  return 'web';
}

export interface ReportParams {
  type: BugType;
  note?: string | null;
  error?: BugReportErrorInfo;
  route?: string;
}

export async function reportBug(params: ReportParams): Promise<BugReport> {
  if (!storage) throw new Error('bug-reporter: storage not configured');

  const report: BugReport = {
    id: newId(),
    timestamp: new Date().toISOString(),
    type: params.type,
    note: params.note ?? null,
    route: params.route ?? routeProvider(),
    appVersion,
    platform: currentPlatform(),
    logs: getLogBuffer(),
    network: getNetworkBuffer(),
    error: params.error,
  };

  await storage.save(report);

  const all = await storage.list();
  if (all.length > MAX_REPORTS) {
    await storage.deleteOldest(all.length - MAX_REPORTS);
  }

  return report;
}

export async function getAllReports(): Promise<BugReport[]> {
  if (!storage) return [];
  return storage.list();
}

export async function getReport(id: string): Promise<BugReport | null> {
  if (!storage) return null;
  return storage.get(id);
}

export async function clearReports(): Promise<void> {
  if (!storage) return;
  await storage.clear();
}

export async function exportReportsJson(): Promise<string> {
  const reports = await getAllReports();
  return JSON.stringify(reports, null, 2);
}
```

- [ ] **Step 4: Run tests**

Run: `npx jest __tests__/services/bug-reporter.test.ts`
Expected: PASS — all 5 tests green.

- [ ] **Step 5: Commit**

```bash
git add services/bug-reporter.ts __tests__/services/bug-reporter.test.ts
git commit -m "feat(bug-reporter): add core API with pluggable storage"
```

---

## Task 6: Native filesystem storage backend

**Files:**
- Modify: `services/bug-reporter.ts` (add `createFileSystemStorage`)

The native filesystem storage writes one JSON file per report to `FileSystem.documentDirectory + 'bug-reports/'`. Test manually since filesystem mocking is heavy for this small surface.

- [ ] **Step 1: Add createFileSystemStorage to services/bug-reporter.ts**

Append to `services/bug-reporter.ts`:

```typescript
// ── Native filesystem storage ──────────────────────────────────────────────
// Lazy-imported so the web bundle never loads expo-file-system.

export function createFileSystemStorage(): Storage {
  const FS = require('expo-file-system/legacy') as typeof import('expo-file-system/legacy');
  const DIR = (FS.documentDirectory as string) + 'bug-reports/';

  async function ensureDir(): Promise<void> {
    const info = await FS.getInfoAsync(DIR);
    if (!info.exists) {
      await FS.makeDirectoryAsync(DIR, { intermediates: true });
    }
  }

  function filenameFor(report: BugReport): string {
    // Timestamp prefix ensures filesystem sort matches timestamp sort.
    return `${report.timestamp}-${report.id}.json`;
  }

  return {
    async save(report) {
      await ensureDir();
      await FS.writeAsStringAsync(
        DIR + filenameFor(report),
        JSON.stringify(report),
      );
    },
    async list() {
      await ensureDir();
      const files = await FS.readDirectoryAsync(DIR);
      const reports: BugReport[] = [];
      for (const f of files) {
        if (!f.endsWith('.json')) continue;
        try {
          const text = await FS.readAsStringAsync(DIR + f);
          reports.push(JSON.parse(text) as BugReport);
        } catch {
          // skip corrupt files silently
        }
      }
      return reports.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    },
    async clear() {
      const info = await FS.getInfoAsync(DIR);
      if (info.exists) {
        await FS.deleteAsync(DIR, { idempotent: true });
      }
    },
    async deleteOldest(count) {
      await ensureDir();
      const files = (await FS.readDirectoryAsync(DIR)).filter((f) => f.endsWith('.json'));
      const sorted = files.slice().sort(); // timestamp prefix → ascending
      const toDelete = sorted.slice(0, count);
      for (const f of toDelete) {
        await FS.deleteAsync(DIR + f, { idempotent: true });
      }
    },
    async get(id) {
      const list = await this.list();
      return list.find((r) => r.id === id) ?? null;
    },
  };
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Verify existing tests still pass**

Run: `npx jest __tests__/services/bug-reporter.test.ts`
Expected: PASS — previous 5 tests still green.

- [ ] **Step 4: Commit**

```bash
git add services/bug-reporter.ts
git commit -m "feat(bug-reporter): add native filesystem storage backend"
```

---

## Task 7: Web storage backend (IndexedDB)

**Files:**
- Create: `services/bug-reporter.web.ts`

The web build uses a separate file that Metro auto-resolves via the `.web.ts` extension. It re-exports everything from the native file except we swap in an IndexedDB-backed storage factory.

- [ ] **Step 1: Create services/bug-reporter.web.ts**

Create `services/bug-reporter.web.ts`:

```typescript
// Web storage backend for bug-reporter using IndexedDB.
// Metro resolves this file on web and the .ts file on native.

import type { Storage } from './bug-reporter';
import { BugReport } from './bug-reporter-types';

export * from './bug-reporter';

const DB_NAME = 'khanqah-bug-reports';
const STORE = 'reports';
const DB_VERSION = 1;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: 'id' });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function withStore<T>(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => Promise<T> | T,
): Promise<T> {
  const db = await openDb();
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const store = tx.objectStore(STORE);
    let result: T;
    Promise.resolve(fn(store))
      .then((r) => {
        result = r;
      })
      .catch(reject);
    tx.oncomplete = () => resolve(result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

export function createWebStorage(): Storage {
  return {
    async save(report: BugReport) {
      await withStore('readwrite', (store) => {
        store.put(report);
      });
    },
    async list() {
      return withStore('readonly', (store) => {
        return new Promise<BugReport[]>((resolve, reject) => {
          const req = store.getAll();
          req.onsuccess = () => {
            const all = (req.result as BugReport[]).slice();
            all.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
            resolve(all);
          };
          req.onerror = () => reject(req.error);
        });
      });
    },
    async clear() {
      await withStore('readwrite', (store) => {
        store.clear();
      });
    },
    async deleteOldest(count) {
      const all = await this.list();
      // list() returned newest first; oldest are at the end
      const toDelete = all.slice(all.length - count);
      await withStore('readwrite', (store) => {
        for (const r of toDelete) store.delete(r.id);
      });
    },
    async get(id) {
      return withStore('readonly', (store) => {
        return new Promise<BugReport | null>((resolve, reject) => {
          const req = store.get(id);
          req.onsuccess = () => resolve((req.result as BugReport | undefined) ?? null);
          req.onerror = () => reject(req.error);
        });
      });
    },
  };
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add services/bug-reporter.web.ts
git commit -m "feat(bug-reporter): add IndexedDB storage backend for web"
```

---

## Task 8: Install patches + wire reporter into app startup

**Files:**
- Modify: `app/_layout.tsx`

Add a `useEffect` in the root layout that installs all patches, configures storage based on platform, and wires up the route + version providers.

- [ ] **Step 1: Read existing app/_layout.tsx**

Check its current shape to avoid breaking existing providers and the auth gate. In particular, the file already calls `loadConfig().then(() => initSupabase())` inside a `useEffect`.

- [ ] **Step 2: Add bug reporter installation**

Edit `app/_layout.tsx`:

Add at the top with the other imports:

```typescript
import { Platform } from 'react-native';
import { usePathname } from 'expo-router';
import { installConsolePatch, setErrorCallback, setWarnCallback } from '../services/log-buffer';
import { installFetchPatch, setNetworkErrorCallback } from '../services/network-buffer';
import {
  setStorage,
  setRouteProvider,
  setAppVersion,
  reportBug,
} from '../services/bug-reporter';
```

Add just below the imports (module scope):

```typescript
// Track current pathname for bug reports (updated by BugReporterPathnameTracker below)
let currentPathname = '';
```

Inside `RootLayout` component (the default export), add at the top of the component body:

```typescript
// Install bug reporter in dev only, once.
React.useEffect(() => {
  if (!__DEV__) return;
  let cancelled = false;
  (async () => {
    if (Platform.OS === 'web') {
      const { createWebStorage } = require('../services/bug-reporter.web');
      setStorage(createWebStorage());
    } else {
      const { createFileSystemStorage } = require('../services/bug-reporter');
      setStorage(createFileSystemStorage());
    }
    if (cancelled) return;

    setRouteProvider(() => currentPathname || '/');

    installConsolePatch();
    installFetchPatch();

    setErrorCallback((message) => {
      reportBug({ type: 'auto-error', error: { message, source: 'console.error' } }).catch(() => {});
    });
    setWarnCallback((message) => {
      reportBug({ type: 'auto-warn', error: { message, source: 'console.warn' } }).catch(() => {});
    });
    setNetworkErrorCallback((entry) => {
      reportBug({
        type: 'auto-network',
        error: {
          message: entry.error ?? `HTTP ${entry.status} ${entry.method} ${entry.url}`,
          source: 'fetch',
        },
      }).catch(() => {});
    });
  })();
  return () => {
    cancelled = true;
  };
}, []);
```

Add a tiny pathname tracker inside `RootLayout` return (before `<Slot />` or wherever the children render). The tracker must be rendered inside the router context:

```typescript
function BugReporterPathnameTracker() {
  const pathname = usePathname();
  React.useEffect(() => {
    currentPathname = pathname;
  }, [pathname]);
  return null;
}
```

Then include `<BugReporterPathnameTracker />` inside the rendered tree (next to `<Slot />`).

After the version becomes available (config loaded), also call `setAppVersion(config.appVersion)`. Do this at the end of the config loading effect:

```typescript
// Find the effect that calls loadConfig().then(...).
// After initSupabase() succeeds, add:
const { getConfig } = require('../lib/remote-config');
try {
  setAppVersion(getConfig().appVersion || '0.0.0');
} catch {
  /* config not ready yet, will stay '0.0.0' */
}
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 4: Start the dev server and confirm no runtime errors**

Run: `npx expo start --web` (hit `w` or open the localhost URL).
Open browser devtools and run:

```javascript
console.error('test bug');
```

Then check IndexedDB in DevTools → Application → IndexedDB → `khanqah-bug-reports` → `reports`. You should see one entry with `type: 'auto-error'`.

- [ ] **Step 5: Commit**

```bash
git add app/_layout.tsx
git commit -m "feat(bug-reporter): install patches and storage at app startup"
```

---

## Task 9: Floating bug reporter button

**Files:**
- Create: `components/BugReporterButton.tsx`
- Modify: `app/_layout.tsx` (mount the button)

- [ ] **Step 1: Create the component**

Create `components/BugReporterButton.tsx`:

```typescript
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  TextInput,
  StyleSheet,
  Alert,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { reportBug } from '../services/bug-reporter';
import { useTheme } from '../providers/ThemeProvider';
import type { BugType } from '../services/bug-reporter-types';

type ModalType = Exclude<BugType, 'auto-error' | 'auto-warn' | 'auto-network'>;

const TYPE_OPTIONS: { value: ModalType; label: string }[] = [
  { value: 'ui', label: 'UI Bug' },
  { value: 'backend', label: 'Backend Bug' },
  { value: 'other', label: 'Other' },
];

export function BugReporterButton() {
  if (!__DEV__) return null;

  const { theme } = useTheme();
  const c = theme.colors;
  const insets = useSafeAreaInsets();

  const [open, setOpen] = useState(false);
  const [type, setType] = useState<ModalType>('ui');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [justSubmitted, setJustSubmitted] = useState(false);

  async function handleSubmit() {
    setSubmitting(true);
    try {
      await reportBug({ type, note: note.trim() || null });
      setOpen(false);
      setNote('');
      setType('ui');
      setJustSubmitted(true);
      setTimeout(() => setJustSubmitted(false), 1500);
    } catch (err: any) {
      Alert.alert('Bug report failed', err?.message ?? String(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <TouchableOpacity
        style={[
          styles.fab,
          {
            backgroundColor: justSubmitted ? '#16a34a' : c.accent,
            bottom: Math.max(insets.bottom, 10) + 80,
          },
        ]}
        onPress={() => setOpen(true)}
        accessibilityLabel="Report a bug"
        activeOpacity={0.8}
      >
        <Text style={styles.fabEmoji}>{justSubmitted ? '✓' : '🐛'}</Text>
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View style={[styles.overlay, { backgroundColor: 'rgba(0,0,0,0.4)' }]}>
          <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
            <Text style={[styles.kicker, { color: c.textMuted }]}>REPORT A BUG</Text>
            <Text style={[styles.title, { color: c.primary }]}>What went wrong?</Text>

            <Text style={[styles.label, { color: c.textMuted }]}>TYPE</Text>
            <View style={styles.typeRow}>
              {TYPE_OPTIONS.map((opt) => {
                const active = opt.value === type;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    onPress={() => setType(opt.value)}
                    style={[
                      styles.typeChip,
                      {
                        backgroundColor: active ? c.primary : c.surface,
                        borderColor: active ? c.primary : c.border,
                      },
                    ]}
                  >
                    <Text style={[styles.typeText, { color: active ? '#fff' : c.textMuted }]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={[styles.label, { color: c.textMuted }]}>NOTE</Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: c.surface2,
                  color: c.text,
                  borderColor: c.border,
                },
              ]}
              placeholder="Describe the issue (optional)"
              placeholderTextColor={c.textMuted}
              multiline
              value={note}
              onChangeText={setNote}
            />

            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.btnSecondary, { borderColor: c.border }]}
                onPress={() => setOpen(false)}
                disabled={submitting}
              >
                <Text style={[styles.btnText, { color: c.textMuted }]}>CANCEL</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btnPrimary, { backgroundColor: c.primary }]}
                onPress={handleSubmit}
                disabled={submitting}
              >
                <Text style={[styles.btnText, { color: '#fff' }]}>
                  {submitting ? 'SAVING…' : 'SUBMIT'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: 16,
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
    zIndex: 9999,
  },
  fabEmoji: {
    fontSize: 22,
  },
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 440,
    padding: 24,
    borderRadius: 12,
    borderWidth: 1,
  },
  kicker: {
    fontFamily: 'DMSans-Medium',
    fontSize: 11,
    letterSpacing: 3,
    marginBottom: 6,
  },
  title: {
    fontFamily: 'CrimsonPro-Italic',
    fontSize: 24,
    marginBottom: 18,
    letterSpacing: -0.3,
  },
  label: {
    fontFamily: 'DMSans-Medium',
    fontSize: 10,
    letterSpacing: 2,
    marginTop: 8,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  typeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  typeChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
  },
  typeText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  input: {
    minHeight: 80,
    borderRadius: 8,
    borderWidth: 1,
    padding: 12,
    fontFamily: 'CrimsonPro',
    fontSize: 15,
    textAlignVertical: 'top',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 18,
  },
  btnSecondary: {
    borderWidth: 1,
    borderRadius: 6,
    paddingVertical: 10,
    paddingHorizontal: 18,
  },
  btnPrimary: {
    borderRadius: 6,
    paddingVertical: 10,
    paddingHorizontal: 22,
  },
  btnText: {
    fontFamily: 'DMSans-SemiBold',
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
});
```

- [ ] **Step 2: Mount the button in app/_layout.tsx**

Add to imports in `app/_layout.tsx`:

```typescript
import { BugReporterButton } from '../components/BugReporterButton';
```

Render `<BugReporterButton />` at the very end of the rendered tree inside the outermost `View` that wraps Slot. It sits on top because of its own `zIndex`. Placement: after `<Slot />` and the pathname tracker:

```tsx
<Slot />
<BugReporterPathnameTracker />
<BugReporterButton />
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 4: Manual test**

1. `npx expo start --web`
2. Open the app, see 🐛 in the bottom-right above the tab bar
3. Tap it → modal opens with type chips and note textarea
4. Pick "UI Bug", type "test note", tap SUBMIT
5. Modal closes, button briefly turns green with ✓
6. Open DevTools → Application → IndexedDB → `khanqah-bug-reports` → `reports` → confirm the report exists with `type: 'ui'`, `note: 'test note'`

- [ ] **Step 5: Commit**

```bash
git add components/BugReporterButton.tsx app/_layout.tsx
git commit -m "feat(bug-reporter): add floating dev-only bug report button"
```

---

## Task 10: Admin bug reports screen

**Files:**
- Create: `app/admin/bug-reports.tsx`
- Modify: `app/admin/index.tsx` (add nav card)

- [ ] **Step 1: Create the screen**

Create `app/admin/bug-reports.tsx`:

```typescript
import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { useTheme } from '../../providers/ThemeProvider';
import {
  getAllReports,
  clearReports,
  exportReportsJson,
} from '../../services/bug-reporter';
import type { BugReport, BugType } from '../../services/bug-reporter-types';

const TYPE_COLOR: Record<BugType, string> = {
  ui: '#0f2e24',
  backend: '#1a4638',
  'auto-error': '#c23e3e',
  'auto-warn': '#d4a853',
  'auto-network': '#d4a853',
  other: '#8a7d66',
};

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function BugReportsScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const c = theme.colors;

  const [reports, setReports] = useState<BugReport[]>([]);
  const [selected, setSelected] = useState<BugReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<BugType | 'all'>('all');

  const load = useCallback(async () => {
    setLoading(true);
    const list = await getAllReports();
    setReports(list);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (!__DEV__) {
    return (
      <View style={[styles.root, { backgroundColor: c.background }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={[styles.back, { color: c.primary }]}>‹ Back</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.empty}>
          <Text style={[styles.emptyText, { color: c.textMuted }]}>
            Bug reports are only available in development builds.
          </Text>
        </View>
      </View>
    );
  }

  async function handleExport() {
    const json = await exportReportsJson();
    await Clipboard.setStringAsync(json);
    Alert.alert('Exported', `Copied ${reports.length} report(s) to clipboard.`);
  }

  function handleClear() {
    Alert.alert('Clear all reports?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: async () => {
          await clearReports();
          await load();
          setSelected(null);
        },
      },
    ]);
  }

  const filtered = filter === 'all' ? reports : reports.filter((r) => r.type === filter);

  // ── Detail view ──
  if (selected) {
    return (
      <ScrollView
        style={[styles.root, { backgroundColor: c.background }]}
        contentContainerStyle={styles.detailContent}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setSelected(null)}>
            <Text style={[styles.back, { color: c.primary }]}>‹ Back</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.detailHead}>
          <View
            style={[styles.typeBadge, { backgroundColor: TYPE_COLOR[selected.type] }]}
          >
            <Text style={styles.typeBadgeText}>{selected.type.toUpperCase()}</Text>
          </View>
          <Text style={[styles.detailTime, { color: c.textMuted }]}>
            {new Date(selected.timestamp).toLocaleString()}
          </Text>
        </View>

        <DetailRow label="ROUTE" value={selected.route} colors={c} />
        <DetailRow label="PLATFORM" value={selected.platform} colors={c} />
        <DetailRow label="APP VERSION" value={selected.appVersion} colors={c} />
        {selected.note ? <DetailRow label="NOTE" value={selected.note} colors={c} /> : null}

        {selected.error ? (
          <>
            <Text style={[styles.sectionLabel, { color: c.textMuted }]}>ERROR</Text>
            <View style={[styles.code, { backgroundColor: c.surface2, borderColor: c.border }]}>
              <Text style={[styles.codeText, { color: c.text }]}>
                {selected.error.message}
              </Text>
              {selected.error.stack ? (
                <Text style={[styles.codeText, { color: c.textMuted, marginTop: 8 }]}>
                  {selected.error.stack}
                </Text>
              ) : null}
            </View>
          </>
        ) : null}

        <Text style={[styles.sectionLabel, { color: c.textMuted }]}>
          LOGS ({selected.logs.length})
        </Text>
        <View style={[styles.code, { backgroundColor: c.surface2, borderColor: c.border }]}>
          {selected.logs.length === 0 ? (
            <Text style={[styles.codeText, { color: c.textMuted }]}>(empty)</Text>
          ) : (
            selected.logs.map((l, i) => (
              <Text
                key={i}
                style={[
                  styles.codeText,
                  {
                    color:
                      l.level === 'error'
                        ? '#c23e3e'
                        : l.level === 'warn'
                          ? '#d4a853'
                          : c.text,
                  },
                ]}
              >
                [{l.level.toUpperCase()}] {l.message}
              </Text>
            ))
          )}
        </View>

        <Text style={[styles.sectionLabel, { color: c.textMuted }]}>
          NETWORK ({selected.network.length})
        </Text>
        <View style={[styles.code, { backgroundColor: c.surface2, borderColor: c.border }]}>
          {selected.network.length === 0 ? (
            <Text style={[styles.codeText, { color: c.textMuted }]}>(empty)</Text>
          ) : (
            selected.network.map((n, i) => (
              <Text
                key={i}
                style={[
                  styles.codeText,
                  {
                    color:
                      n.error || (n.status && n.status >= 400) ? '#c23e3e' : c.text,
                  },
                ]}
              >
                {n.method} {n.url} — {n.status ?? 'ERR'} ({n.durationMs ?? '?'}ms)
                {n.error ? ` ${n.error}` : ''}
              </Text>
            ))
          )}
        </View>
      </ScrollView>
    );
  }

  // ── List view ──
  return (
    <View style={[styles.root, { backgroundColor: c.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={[styles.back, { color: c.primary }]}>‹ Back</Text>
        </TouchableOpacity>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={handleExport} style={styles.headerBtn}>
            <Text style={[styles.headerBtnText, { color: c.primary }]}>EXPORT</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleClear} style={styles.headerBtn}>
            <Text style={[styles.headerBtnText, { color: '#c23e3e' }]}>CLEAR</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.hero}>
        <Text style={[styles.kicker, { color: c.textMuted }]}>
          {String(reports.length).padStart(2, '0')} · BUG REPORTS
        </Text>
        <Text style={[styles.title, { color: c.primary }]}>Local captures</Text>
      </View>

      {/* Filter chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
        {(['all', 'ui', 'backend', 'auto-error', 'auto-warn', 'auto-network', 'other'] as const).map((f) => {
          const active = f === filter;
          return (
            <TouchableOpacity
              key={f}
              onPress={() => setFilter(f)}
              style={[
                styles.filterChip,
                {
                  backgroundColor: active ? c.primary : c.surface,
                  borderColor: active ? c.primary : c.border,
                },
              ]}
            >
              <Text
                style={[styles.filterText, { color: active ? '#fff' : c.textMuted }]}
              >
                {f.toUpperCase()}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {loading ? (
        <View style={styles.empty}>
          <Text style={[styles.emptyText, { color: c.textMuted }]}>Loading…</Text>
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.empty}>
          <Text style={[styles.emptyText, { color: c.textMuted }]}>
            No reports yet.
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: 80 }}>
          {filtered.map((r) => {
            const preview =
              r.note ?? r.error?.message ?? '(no message)';
            return (
              <TouchableOpacity
                key={r.id}
                onPress={() => setSelected(r)}
                style={[styles.row, { borderBottomColor: c.border }]}
                activeOpacity={0.7}
              >
                <View style={[styles.rowBadge, { backgroundColor: TYPE_COLOR[r.type] }]}>
                  <Text style={styles.rowBadgeText}>{r.type.toUpperCase()}</Text>
                </View>
                <View style={styles.rowBody}>
                  <Text
                    style={[styles.rowPreview, { color: c.primary }]}
                    numberOfLines={1}
                  >
                    {preview}
                  </Text>
                  <Text style={[styles.rowMeta, { color: c.textMuted }]}>
                    {r.route} · {relativeTime(r.timestamp)}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

function DetailRow({
  label,
  value,
  colors,
}: {
  label: string;
  value: string;
  colors: ReturnType<typeof useTheme>['theme']['colors'];
}) {
  return (
    <View style={{ marginBottom: 10 }}>
      <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>{label}</Text>
      <Text style={[styles.detailValue, { color: colors.text }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 12,
  },
  back: {
    fontFamily: 'CrimsonPro-Italic',
    fontSize: 16,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 16,
  },
  headerBtn: {
    paddingVertical: 4,
  },
  headerBtnText: {
    fontFamily: 'DMSans-SemiBold',
    fontSize: 11,
    letterSpacing: 1.5,
  },
  hero: {
    paddingHorizontal: 28,
    paddingTop: 16,
    paddingBottom: 8,
  },
  kicker: {
    fontFamily: 'DMSans-Medium',
    fontSize: 11,
    letterSpacing: 3,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  title: {
    fontFamily: 'CrimsonPro-Italic',
    fontSize: 30,
    letterSpacing: -0.3,
  },
  filterRow: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
  },
  filterText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 10,
    letterSpacing: 1.5,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyText: {
    fontFamily: 'CrimsonPro-Italic',
    fontSize: 15,
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  rowBadgeText: {
    fontFamily: 'DMSans-SemiBold',
    fontSize: 9,
    letterSpacing: 1.5,
    color: '#fff',
  },
  rowBody: {
    flex: 1,
    minWidth: 0,
  },
  rowPreview: {
    fontFamily: 'CrimsonPro',
    fontSize: 16,
    letterSpacing: -0.2,
  },
  rowMeta: {
    fontFamily: 'DMSans',
    fontSize: 11,
    marginTop: 2,
  },
  detailContent: {
    paddingHorizontal: 20,
    paddingBottom: 80,
  },
  detailHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  typeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 4,
  },
  typeBadgeText: {
    fontFamily: 'DMSans-SemiBold',
    fontSize: 10,
    letterSpacing: 1.5,
    color: '#fff',
  },
  detailTime: {
    fontFamily: 'DMSans',
    fontSize: 12,
  },
  sectionLabel: {
    fontFamily: 'DMSans-Medium',
    fontSize: 10,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 6,
    marginTop: 12,
  },
  detailValue: {
    fontFamily: 'CrimsonPro',
    fontSize: 15,
    letterSpacing: -0.1,
  },
  code: {
    borderWidth: 1,
    borderRadius: 6,
    padding: 12,
  },
  codeText: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 12,
    lineHeight: 18,
  },
});
```

- [ ] **Step 2: Install clipboard dependency**

Run: `npx expo install expo-clipboard`
Expected: installed without errors.

- [ ] **Step 3: Add nav card to admin dashboard**

Edit `app/admin/index.tsx`. Find the `navCards` array and add this entry (inside `__DEV__`):

```typescript
...(__DEV__
  ? [
      {
        symbol: '🐛',
        title: 'Bug Reports',
        subtitle: 'LOCAL CAPTURES · DEV ONLY',
        route: '/admin/bug-reports',
      },
    ]
  : []),
```

Insert just before the closing `]` of `navCards`.

- [ ] **Step 4: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 5: Manual test the flow**

1. `npx expo start --web`
2. Sign in as admin
3. Go to Admin dashboard → see "Bug Reports" nav card (dev only)
4. Trigger some bugs:
   - Open DevTools console, run `console.error('test error')`
   - Tap the 🐛 button, submit a manual UI bug
5. Open "Bug Reports" screen → see at least 2 reports listed
6. Tap one → see detail view with logs and network
7. Tap EXPORT → confirm clipboard contains a JSON array
8. Tap CLEAR → confirm empty list

- [ ] **Step 6: Commit**

```bash
git add app/admin/bug-reports.tsx app/admin/index.tsx package.json package-lock.json
git commit -m "feat(bug-reporter): add admin bug reports list and detail view"
```

---

## Task 11: Final verification + docs update

**Files:**
- Modify: `README.md` or create `docs/bug-reporter.md` if no README exists

- [ ] **Step 1: Run the full test suite**

Run: `npx jest`
Expected: all suites pass, including the 3 new suites (log-buffer, network-buffer, bug-reporter).

- [ ] **Step 2: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Build web to verify production guard works**

Run: `NODE_ENV=production npx expo export --platform web`

Verify that in `dist/_expo/static/js/web/*.js`, the strings "BugReporterButton" and "bug-reports" are either absent or present only as unreachable code. You can do a quick grep:

```bash
grep -c "reportBug" dist/_expo/static/js/web/*.js
```

The number should be small (imports/types that got tree-shaken may remain as empty references; the actual button UI and console patches should not be present because `__DEV__` is false in production builds).

- [ ] **Step 4: Add a short doc**

Create or append to `docs/bug-reporter.md`:

```markdown
# Local Bug Reporter (Dev Only)

A dev-only, local-only bug capture system.

## Usage

- **Spot a bug**: tap the floating 🐛 button (bottom-right) → pick a type → add a note → submit.
- **Auto-captured events**: every `console.error`, `console.warn`, failed network request, and unhandled rejection creates a report automatically.
- **View all reports**: Admin dashboard → "Bug Reports" (visible only in dev).
- **Export**: tap EXPORT to copy all reports as JSON to the clipboard.
- **Clear**: tap CLEAR (with confirmation) to delete all stored reports.

## Storage

- **iOS/Android**: `FileSystem.documentDirectory + 'bug-reports/'` — one JSON file per report
- **Web**: IndexedDB `khanqah-bug-reports` → object store `reports`

Reports are capped at 500 (oldest dropped on overflow).

## Disabled in production

Everything is gated by `__DEV__`. In production builds:
- No button rendered
- No console / fetch patches installed
- `reportBug()` is a no-op
- The admin screen shows "not available in production"
```

- [ ] **Step 5: Commit**

```bash
git add docs/bug-reporter.md
git commit -m "docs: add bug reporter usage guide"
```

---

## Summary of what was built

- `services/bug-reporter-types.ts` — Shared types (Task 1)
- `services/log-buffer.ts` — Console patch + ring buffer (Tasks 2, 3)
- `services/network-buffer.ts` — Fetch patch + ring buffer (Task 4)
- `services/bug-reporter.ts` — Public API + filesystem storage (Tasks 5, 6)
- `services/bug-reporter.web.ts` — IndexedDB storage (Task 7)
- `app/_layout.tsx` modifications — Wire up patches at startup (Task 8)
- `components/BugReporterButton.tsx` — Floating dev-only button (Task 9)
- `app/admin/bug-reports.tsx` — Admin list + detail screen (Task 10)
- `docs/bug-reporter.md` — Usage guide (Task 11)
