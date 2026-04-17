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
      const sorted = files.slice().sort();
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
