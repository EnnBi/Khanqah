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

    for (let i = 0; i < MAX_REPORTS; i++) {
      await reportBug({ type: 'ui', note: `r${i}` });
    }
    expect(storage._peek()).toHaveLength(MAX_REPORTS);

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
