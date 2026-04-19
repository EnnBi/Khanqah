import AsyncStorage from '@react-native-async-storage/async-storage';

const CONFIG_CACHE_KEY = 'app_remote_config_v2';
const CONFIG_URL = 'http://165.22.208.103/api/config.json';
const CONFIG_TTL_MS = 60 * 60 * 1000; // Re-fetch every 1 hour

// Origin of the DO server — used by clients that need to hit server-side
// endpoints (e.g. the PDF proxy at /pdf-proxy/).
export const API_BASE_URL = CONFIG_URL.replace(/\/api\/config\.json$/, '');

// Fallback config for local development when remote config is unreachable
// Fallback reads from .env.local for local dev only — no real creds in source
const FALLBACK_CONFIG: AppConfig = {
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL || '',
  supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '',
  onesignalAppId: process.env.EXPO_PUBLIC_ONESIGNAL_APP_ID || '',
  streamHlsUrl: '',
  streamRtmpUrl: '',
  audioRelayWsUrl: '',
  archiveOrgCollection: 'khanqah-maseeh-ul-ummah',
  appVersion: '1.0.0',
  maintenanceMode: false,
};

export interface AppConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  onesignalAppId: string;
  streamHlsUrl: string;
  streamRtmpUrl: string;
  audioRelayWsUrl: string;
  archiveOrgCollection: string;
  appVersion: string;
  maintenanceMode: boolean;
  maintenanceMessage?: string;
}

interface CachedConfig {
  config: AppConfig;
  fetchedAt: number;
}

let _config: AppConfig | null = null;

/**
 * Fetch remote config from DO server, with local cache fallback.
 * Call this once at app startup before initializing Supabase.
 */
export async function loadConfig(): Promise<AppConfig> {
  // Return in-memory config if already loaded
  if (_config) return _config;

  // Try cache first
  const cached = await getCachedConfig();
  if (cached && Date.now() - cached.fetchedAt < CONFIG_TTL_MS) {
    _config = cached.config;
    // Refresh in background
    fetchAndCacheConfig().catch(() => {});
    return _config;
  }

  // Fetch fresh config
  try {
    _config = await fetchAndCacheConfig();
    return _config;
  } catch (error) {
    console.warn('Remote config fetch failed:', error);
    // Fall back to stale cache if available
    if (cached) {
      _config = cached.config;
      return _config;
    }
    // Fall back to built-in config (for dev or when server is unreachable)
    console.warn('Using fallback config');
    _config = FALLBACK_CONFIG;
    return _config;
  }
}

/**
 * Get current config (must call loadConfig first)
 */
export function getConfig(): AppConfig {
  if (!_config) {
    throw new Error('Config not loaded. Call loadConfig() first.');
  }
  return _config;
}

async function fetchAndCacheConfig(): Promise<AppConfig> {
  const response = await fetch(CONFIG_URL, {
    headers: { 'Cache-Control': 'no-cache' },
  });

  if (!response.ok) {
    throw new Error(`Config fetch failed: ${response.status}`);
  }

  const config: AppConfig = await response.json();

  // Validate required fields
  if (!config.supabaseUrl || !config.supabaseAnonKey) {
    throw new Error('Invalid config: missing required fields');
  }

  // Cache locally
  const cached: CachedConfig = { config, fetchedAt: Date.now() };
  await AsyncStorage.setItem(CONFIG_CACHE_KEY, JSON.stringify(cached));

  return config;
}

async function getCachedConfig(): Promise<CachedConfig | null> {
  try {
    const raw = await AsyncStorage.getItem(CONFIG_CACHE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as CachedConfig;
  } catch {
    return null;
  }
}
