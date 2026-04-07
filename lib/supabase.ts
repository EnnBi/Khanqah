import 'react-native-url-polyfill/auto';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getConfig } from './remote-config';

let _supabase: SupabaseClient | null = null;

/**
 * Get the Supabase client. Must call initSupabase() first (after loadConfig).
 */
export function getSupabase(): SupabaseClient {
  if (!_supabase) {
    throw new Error('Supabase not initialized. Call initSupabase() after loadConfig().');
  }
  return _supabase;
}

/**
 * Initialize Supabase client using values from remote config.
 * Call this once after loadConfig() completes.
 */
export function initSupabase(): SupabaseClient {
  if (_supabase) return _supabase;

  const config = getConfig();

  _supabase = createClient(config.supabaseUrl, config.supabaseAnonKey, {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });

  return _supabase;
}

// Backward-compatible export — lazily gets the initialized client
// This allows existing imports of `supabase` to keep working
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const client = getSupabase();
    const value = (client as any)[prop];
    if (typeof value === 'function') {
      return value.bind(client);
    }
    return value;
  },
});
