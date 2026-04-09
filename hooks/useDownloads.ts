import { useState, useEffect, useCallback } from 'react';
import * as FileSystem from 'expo-file-system/legacy';
import { supabase } from '../lib/supabase';
import { Content } from '../lib/types';
import {
  saveDownloadedContent,
  getDownloadedContent,
  getDownloadedContentById,
  deleteDownloadedContent,
} from '../services/offline-db';
import { useAuth } from './useAuth';

const DOWNLOAD_DIR = `${FileSystem.documentDirectory}downloads/`;

// Ensure the download directory exists
async function ensureDownloadDir() {
  const info = await FileSystem.getInfoAsync(DOWNLOAD_DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(DOWNLOAD_DIR, { intermediates: true });
  }
}

// Derive a safe filename from a URL
function fileNameFromUrl(url: string): string {
  const segments = url.split('/');
  const last = segments[segments.length - 1];
  // Strip query params
  return last.split('?')[0] || 'audio.mp3';
}

// ── Actions ────────────────────────────────────────────────────────────────

export async function downloadContent(content: Content): Promise<void> {
  await ensureDownloadDir();

  const fileName = fileNameFromUrl(content.media_url);
  const localPath = `${DOWNLOAD_DIR}${content.id}_${fileName}`;

  // Download the file
  const result = await FileSystem.downloadAsync(content.media_url, localPath);
  if (result.status !== 200) {
    throw new Error(`Download failed with status ${result.status}`);
  }

  // Persist to SQLite
  saveDownloadedContent(content.id, JSON.stringify(content), localPath);

  // Record in Supabase (best-effort — no throw on failure)
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session?.user) {
      await supabase.from('downloads').upsert(
        { user_id: session.user.id, content_id: content.id },
        { onConflict: 'user_id,content_id' },
      );
    }
  } catch {
    // Offline or auth issue — local copy already saved, ignore remote error
  }
}

export async function deleteDownload(contentId: string): Promise<void> {
  const row = getDownloadedContentById(contentId);
  if (!row) return;

  // Delete physical file (ignore errors — file may already be gone)
  try {
    await FileSystem.deleteAsync(row.local_file_path, { idempotent: true });
  } catch {
    // Ignore
  }

  // Remove from SQLite
  deleteDownloadedContent(contentId);

  // Remove from Supabase (best-effort)
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session?.user) {
      await supabase
        .from('downloads')
        .delete()
        .eq('user_id', session.user.id)
        .eq('content_id', contentId);
    }
  } catch {
    // Ignore
  }
}

export function getLocalPath(contentId: string): string | null {
  const row = getDownloadedContentById(contentId);
  return row ? row.local_file_path : null;
}

// ── Hook ───────────────────────────────────────────────────────────────────

interface DownloadItem {
  content: Content;
  localPath: string;
  downloadedAt: string;
}

interface UseDownloadsResult {
  downloads: DownloadItem[];
  loading: boolean;
  totalSize: number;
  refresh: () => void;
}

export function useDownloads(): UseDownloadsResult {
  const [downloads, setDownloads] = useState<DownloadItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalSize, setTotalSize] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const rows = getDownloadedContent();
      const items: DownloadItem[] = rows.map((row) => ({
        content: JSON.parse(row.content_json) as Content,
        localPath: row.local_file_path,
        downloadedAt: row.downloaded_at,
      }));
      setDownloads(items);

      // Calculate total size from file_size field; fall back to stat if missing
      let total = 0;
      for (const item of items) {
        if (item.content.file_size) {
          total += item.content.file_size;
        } else {
          try {
            const info = await FileSystem.getInfoAsync(item.localPath, { size: true } as any);
            if (info.exists && 'size' in info) {
              total += (info as FileSystem.FileInfo & { size: number }).size;
            }
          } catch {
            // Ignore stat errors
          }
        }
      }
      setTotalSize(total);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { downloads, loading, totalSize, refresh: load };
}
