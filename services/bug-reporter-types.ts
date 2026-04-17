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

export type BugStatus = 'open' | 'fixed' | 'ignored';

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
  status?: BugStatus;        // Defaults to 'open' if missing (old local reports)
  fixedAt?: string | null;
  fixedBy?: string | null;
  fixedNote?: string | null;
}

/** Max reports to keep before dropping oldest. */
export const MAX_REPORTS = 500;

/** Log buffer size. */
export const LOG_BUFFER_SIZE = 50;

/** Network buffer size. */
export const NETWORK_BUFFER_SIZE = 20;
