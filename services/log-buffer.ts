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
