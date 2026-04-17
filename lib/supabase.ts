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
      // Force immediate session check so subsequent calls don't block
      flowType: 'pkce',
    },
    // Disable realtime on web to avoid websocket init hangs.
    // Re-enable later when Go Live broadcasting is integrated.
    realtime: { params: { eventsPerSecond: 2 } },
    global: {
      // Wrap fetch with a 15s timeout — prevents Supabase calls from
      // hanging forever if the network stalls.
      fetch: (input, init) => {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 15000);
        return fetch(input as any, { ...init, signal: ctrl.signal }).finally(
          () => clearTimeout(timer),
        );
      },
    },
  });

  return _supabase;
}

/**
 * Lazy proxy so existing `import { supabase }` sites keep working.
 *
 * Before `initSupabase()` has run, returning undefined from the Proxy is
 * preferable to throwing, because render phases that touch `supabase` (rare,
 * but possible during SSR or early lifecycle) shouldn't crash the tree.
 * Any real network call during that pre-init window will fail harmlessly.
 */
const handler: ProxyHandler<SupabaseClient> = {
  get(_target, prop) {
    if (!_supabase) {
      // Silent undefined before init — avoids throwing inside render.
      // Real usage after configLoaded=true always has _supabase set.
      return undefined;
    }
    return Reflect.get(_supabase, prop, _supabase);
  },
};

export const supabase = new Proxy({} as SupabaseClient, handler);
