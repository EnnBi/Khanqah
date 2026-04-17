import 'react-native-url-polyfill/auto';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getConfig } from './remote-config';

let _supabase: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!_supabase) {
    throw new Error('Supabase not initialized. Call initSupabase() after loadConfig().');
  }
  return _supabase;
}

/**
 * Initialize the Supabase client using values from remote config.
 * Call once after loadConfig() resolves.
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

/**
 * Lazy-getter proxy so existing `import { supabase }` call sites keep working.
 * Every method/property access reads through to the real client at call time.
 *
 * Notes:
 *   - `from('table').select(...)` returns a real PostgrestFilterBuilder,
 *     so chained calls go directly to the real client (no more Proxy hops).
 *   - Plain property access (e.g. `supabase.auth.getUser()`) returns the
 *     real sub-object, so it's bound to the correct `this`.
 */
const handler: ProxyHandler<SupabaseClient> = {
  get(_target, prop, receiver) {
    const client = getSupabase();
    return Reflect.get(client, prop, client);
  },
};

export const supabase = new Proxy({} as SupabaseClient, handler);
