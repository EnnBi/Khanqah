import * as SQLite from 'expo-sqlite';

const db = SQLite.openDatabaseSync('khanqah-offline.db');

export function initOfflineDB() {
  db.execSync(`
    CREATE TABLE IF NOT EXISTS downloaded_content (
      id TEXT PRIMARY KEY,
      content_json TEXT NOT NULL,
      local_file_path TEXT NOT NULL,
      downloaded_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS listening_progress_local (
      content_id TEXT PRIMARY KEY,
      position_seconds INTEGER NOT NULL DEFAULT 0,
      completed INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL
    );
  `);
}

// Ensure the schema exists before any caller reads/writes the DB. Module
// load happens once per JS context, so this is cheap and idempotent.
initOfflineDB();

export function saveDownloadedContent(id: string, contentJson: string, localPath: string) {
  db.runSync(
    `INSERT OR REPLACE INTO downloaded_content (id, content_json, local_file_path, downloaded_at) VALUES (?, ?, ?, ?)`,
    id, contentJson, localPath, new Date().toISOString(),
  );
}

export function getDownloadedContent() {
  return db.getAllSync<{ id: string; content_json: string; local_file_path: string; downloaded_at: string }>(
    'SELECT * FROM downloaded_content ORDER BY downloaded_at DESC',
  );
}

export function getDownloadedContentById(id: string) {
  return db.getFirstSync<{ id: string; content_json: string; local_file_path: string; downloaded_at: string }>(
    'SELECT * FROM downloaded_content WHERE id = ?', id,
  ) ?? null;
}

export function deleteDownloadedContent(id: string) {
  db.runSync('DELETE FROM downloaded_content WHERE id = ?', id);
}

export function saveLocalProgress(contentId: string, positionSeconds: number, completed: boolean) {
  db.runSync(
    `INSERT OR REPLACE INTO listening_progress_local (content_id, position_seconds, completed, updated_at) VALUES (?, ?, ?, ?)`,
    contentId, positionSeconds, completed ? 1 : 0, new Date().toISOString(),
  );
}

export function getLocalProgress(contentId: string) {
  const row = db.getFirstSync<{ position_seconds: number; completed: number }>(
    'SELECT position_seconds, completed FROM listening_progress_local WHERE content_id = ?', contentId,
  );
  if (!row) return null;
  return { position_seconds: row.position_seconds, completed: row.completed === 1 };
}

export function getAllLocalProgress() {
  const rows = db.getAllSync<{ content_id: string; position_seconds: number; completed: number; updated_at: string }>(
    'SELECT * FROM listening_progress_local ORDER BY updated_at DESC',
  );
  return rows.map((r) => ({ ...r, completed: r.completed === 1 }));
}
