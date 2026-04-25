import { useCallback } from 'react';
import { Alert, I18nManager, Platform } from 'react-native';
import * as Updates from 'expo-updates';
import { saveStoredLanguage } from '../lib/language-pref';
import { supabase } from '../lib/supabase';
import type { Language } from '../lib/language-pref';

/**
 * Switch the app language end-to-end:
 *  1. AsyncStorage save (always — persists even if user cancels)
 *  2. Supabase users.language_pref update (best-effort, signed-in only)
 *  3. Alert prompt — on confirm, forceRTL + reload
 */
export function useLanguageToggle() {
  return useCallback(async (next: Language): Promise<void> => {
    // (1) Persist locally first so even a force-killed app boots into
    // the new language on next launch.
    await saveStoredLanguage(next);

    // (2) Best-effort cloud sync. Failure is silent — AsyncStorage is
    // authoritative for this device.
    try {
      const { data } = await supabase.auth.getUser();
      const userId = data.user?.id;
      if (userId) {
        await supabase.from('users').update({ language_pref: next }).eq('id', userId);
      }
    } catch {
      // Network or auth issue; ignore.
    }

    // (3) Confirm + reload. The reload itself happens inside the
    // confirm handler so cancelling leaves the app running with the
    // pref saved but layout unchanged until the next manual launch.
    return new Promise<void>((resolve) => {
      Alert.alert(
        'Switch language?',
        'The app needs to restart to apply.',
        [
          { text: 'Cancel', style: 'cancel', onPress: () => resolve() },
          {
            text: 'Restart',
            style: 'default',
            onPress: () => {
              const wantRTL = next === 'ur';
              if (I18nManager.isRTL !== wantRTL) {
                I18nManager.forceRTL(wantRTL);
              }
              if (Platform.OS === 'web') {
                if (typeof window !== 'undefined') window.location.reload();
              } else {
                Promise.resolve(Updates.reloadAsync()).catch(() => { /* fall through */ });
              }
              resolve();
            },
          },
        ],
        { cancelable: false },
      );
    });
  }, []);
}
