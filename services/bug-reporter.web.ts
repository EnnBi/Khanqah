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
