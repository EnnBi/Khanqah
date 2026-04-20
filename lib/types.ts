export type ContentType = 'bayan' | 'clip' | 'nazam' | 'quran' | 'hamd_naat' | 'book' | 'mamulat';
export type UserRole = 'listener' | 'editor' | 'admin';
export type ThemePref = 'light' | 'dark' | 'system';
export type LiveSessionStatus = 'live' | 'ended' | 'processing';

export interface User {
  id: string; email: string; display_name: string;
  role: UserRole; language_pref: 'en' | 'ur';
  theme_pref: ThemePref; created_at: string;
}

export interface Category {
  id: string; name_en: string; name_ur: string;
  type: ContentType; parent_id: string | null; sort_order: number;
}

export type MirrorStatus =
  | 'pending'
  | 'downloading'
  | 'uploading'
  | 'ready'
  | 'failed'
  | 'not_applicable';

export type MirrorFormat = 'audio' | 'video';

export interface Content {
  id: string; title_en: string; title_ur: string;
  description_en: string | null; description_ur: string | null;
  credit_en: string | null; credit_ur: string | null;
  type: ContentType; category_id: string; media_url: string;
  thumbnail_url: string | null; duration: number | null;
  file_size: number | null; is_video: boolean;
  uploaded_by: string; created_at: string; updated_at: string;
  mirror_status: MirrorStatus;
  mirror_format: MirrorFormat | null;
  mirror_source_url: string | null;
  mirror_error: string | null;
  mirror_attempts: number;
  mirror_updated_at: string;
}

export interface Topic {
  id: string; content_id: string; title_en: string; title_ur: string;
  timestamp_seconds: number; sort_order: number;
}

export interface Playlist {
  id: string; user_id: string; name: string;
  is_public: boolean; created_at: string;
}

export interface PlaylistItem {
  id: string; playlist_id: string; content_id: string;
  sort_order: number; added_at: string;
}

export interface Download {
  id: string; user_id: string; content_id: string; downloaded_at: string;
}

export interface ListeningProgress {
  id: string; user_id: string; content_id: string;
  position_seconds: number; completed: boolean; updated_at: string;
}

export interface LiveSession {
  id: string; title_en: string; title_ur: string;
  stream_url: string; started_by: string; started_at: string;
  ended_at: string | null; recording_url: string | null;
  status: LiveSessionStatus;
}

export interface ScheduledSession {
  id: string; title_en: string; title_ur: string;
  description_en: string | null; description_ur: string | null;
  scheduled_at: string; is_recurring: boolean;
  recurrence_rule: string | null; created_by: string; created_at: string;
}

export interface PushSubscription {
  id: string; user_id: string; onesignal_player_id: string;
  device_type: 'android' | 'ios' | 'web'; created_at: string;
}

// Picks the credit string to display for a content item. Prefers the
// user's current language; falls back to the other language so a row
// with only one credit filled in still shows something; returns null
// when both are empty, so the caller can skip rendering.
export function pickCredit(
  content: Pick<Content, 'credit_en' | 'credit_ur'>,
  language: string,
): string | null {
  const isUr = language === 'ur';
  const primary = isUr ? content.credit_ur : content.credit_en;
  const fallback = isUr ? content.credit_en : content.credit_ur;
  const value = (primary && primary.trim()) || (fallback && fallback.trim()) || null;
  return value;
}
