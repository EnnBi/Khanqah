import { I18nManager, Platform } from 'react-native';
import * as Updates from 'expo-updates';
import { loadStoredLanguage } from './language-pref';

/**
 * Read the stored language preference and force the RN/web
 * layout direction to match. On native, a forced direction
 * change requires an app restart to take full effect, so we
 * call Updates.reloadAsync() once. On web, forceRTL is applied
 * inline (sets <html dir>) and React renders in the new direction
 * without a reload — reloading would loop because forceRTL state
 * doesn't survive a page reload on web.
 * Idempotent: subsequent calls with the same stored value are no-ops.
 */
export async function rtlBootstrap(): Promise<void> {
  const stored = await loadStoredLanguage();
  const wantRTL = stored === 'ur';
  if (I18nManager.isRTL === wantRTL) return;

  I18nManager.forceRTL(wantRTL);

  if (Platform.OS === 'web') {
    // forceRTL on web sets <html dir> immediately; no reload needed.
    return;
  }
  try {
    await Updates.reloadAsync();
  } catch {
    // In Expo Go or other environments without OTA, reloadAsync may
    // throw. The forceRTL call still persisted; next launch will
    // pick up the right direction natively.
  }
}
