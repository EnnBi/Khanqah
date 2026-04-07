import AsyncStorage from '@react-native-async-storage/async-storage';

const CONFIG_CACHE_KEY = 'app_remote_config';
const CONFIG_URL = 'http://165.22.208.103/api/config.json';
const CONFIG_TTL_MS = 60 * 60 * 1000; // Re-fetch every 1 hour

export interface AppConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  onesignalAppId: string;
  streamHlsUrl: string;
  streamRtmpUrl: string;
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
    // Fall back to stale cache if available
    if (cached) {
      _config = cached.config;
      return _config;
    }
    throw new Error('Failed to load app configuration. Please check your internet connection.');
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
