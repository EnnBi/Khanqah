import { Text, TextInput } from 'react-native';
import { loadStoredLanguage } from './language-pref';

/**
 * When the stored language is Urdu, set NastaleeqUrdu as the default
 * fontFamily for every <Text> and <TextInput> in the app. Components
 * that explicitly set their own `fontFamily` in their `style` prop
 * still win — RN merges the explicit style on top of defaultProps.
 *
 * Called once at app launch (after rtlBootstrap). Re-applies on next
 * launch via the same hook because we trigger a reload on toggle.
 */
export async function applyTextDefaults(): Promise<void> {
  const stored = await loadStoredLanguage();
  // Use the file basename — that's the name expo-font's plugin registers
  // when the .ttf is bundled at native build time. The runtime alias
  // 'NastaleeqUrdu' from useFonts() also resolves but only after the
  // font finishes loading; the plugin-bundled name works on first paint.
  const fontFamily = stored === 'ur' ? 'JameelNooriNastaleeq' : undefined;

  // RN's `defaultProps` API is technically private but is the standard
  // mechanism for setting cross-app text defaults; it's how reanimated,
  // navigation, and other libs do font theming. Safe enough for our use.
  const setDefault = (cls: typeof Text | typeof TextInput) => {
    const c = cls as unknown as { defaultProps?: { style?: unknown } };
    c.defaultProps = c.defaultProps || {};
    if (fontFamily) {
      c.defaultProps.style = [{ fontFamily }, c.defaultProps.style];
    }
  };

  setDefault(Text);
  setDefault(TextInput);
}
