import { I18nManager, Platform } from 'react-native';
import * as Updates from 'expo-updates';
import { loadStoredLanguage } from './language-pref';

/**
 * Read the stored language preference and force the RN/web
 * layout direction to match. On native, a forced direction
 * change requires an app restart to take full effect, so we
 * call Updates.reloadAsync() once. On web, the page reloads
 * via window.location.reload(). Idempotent: subsequent calls
 * with the same stored value are no-ops.
 */
export async function rtlBootstrap(): Promise<void> {
  const stored = await loadStoredLanguage();
  const wantRTL = stored === 'ur';
  if (I18nManager.isRTL === wantRTL) return;

  I18nManager.forceRTL(wantRTL);

  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  } else {
    try {
      await Updates.reloadAsync();
    } catch {
      // In Expo Go or other environments without OTA, reloadAsync may
      // throw. The forceRTL call still persisted; next launch will
      // pick up the right direction natively.
    }
  }
}
