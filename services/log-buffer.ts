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
