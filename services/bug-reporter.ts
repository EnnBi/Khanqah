// Native (iOS/Android) entry point for bug-reporter.
// Re-exports the platform-agnostic core and adds filesystem storage.

import type { Storage } from './bug-reporter-core';
import { BugReport } from './bug-reporter-types';

export * from './bug-reporter-core';

/** Filesystem-backed storage. Uses expo-file-system/legacy. Native only. */
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
