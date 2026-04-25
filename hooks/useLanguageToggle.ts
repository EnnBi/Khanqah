import { useCallback } from 'react';
import { Alert, I18nManager, Platform } from 'react-native';
import * as Updates from 'expo-updates';
import { saveStoredLanguage } from '../lib/language-pref';
import { supabase } from '../lib/supabase';
import type { Language } from '../lib/language-pref';

/**
 * Switch the app language end-to-end:
 *  1. AsyncStorage save (always — persists even if user cancels)
 *  2. Alert prompt — on confirm, forceRTL + reload
 *  3. Supabase users.language_pref update fires fire-and-forget;
 *     it never gates the prompt or the reload, so a slow/hung
 *     network can't prevent the user from restarting.
 */
export function useLanguageToggle() {
  return useCallback(async (next: Language): Promise<void> => {
    // (1) Persist locally first so even a force-killed app boots into
    // the new language on next launch.
    await saveStoredLanguage(next);

    // (2) Best-effort cloud sync — fire and forget. We do NOT await this.
    // If the user is signed in we update users.language_pref; otherwise
    // we just skip. Either branch is silent on failure because the
    // AsyncStorage save above is authoritative for this device.
    void (async () => {
      try {
        const { data } = await supabase.auth.getUser();
        const userId = data.user?.id;
        if (userId) {
          await supabase.from('users').update({ language_pref: next }).eq('id', userId);
        }
      } catch {
        // Ignore.
      }
    })();

    // (3) Confirm + reload. Cancelling leaves the app running with the
    // pref saved; next launch will pick up the new direction.
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
                Promise.resolve(Updates.reloadAsync()).catch((err) => {
                  console.warn('[language-toggle] Updates.reloadAsync failed:', err);
                });
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
