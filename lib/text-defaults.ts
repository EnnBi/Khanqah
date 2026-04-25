import { I18nManager, Text, TextInput } from 'react-native';

/**
 * When the layout direction is RTL (Urdu), set NastaleeqUrdu /
 * JameelNooriNastaleeq as the default fontFamily for every <Text> and
 * <TextInput> in the app. Components that explicitly set their own
 * `fontFamily` in their `style` prop still win — RN merges the explicit
 * style on top of defaultProps.
 *
 * Synchronous: must run BEFORE any component renders, hence we read
 * I18nManager.isRTL (set by rtlBootstrap on the previous boot) instead
 * of async-loading the language pref again.
 */
export function applyTextDefaults(): void {
  const fontFamily = I18nManager.isRTL ? 'JameelNooriNastaleeq' : undefined;
  if (!fontFamily) return;

  // RN's `defaultProps` API is technically private but is the standard
  // mechanism for setting cross-app text defaults; it's how reanimated,
  // navigation, and other libs do font theming.
  const setDefault = (cls: typeof Text | typeof TextInput) => {
    const c = cls as unknown as { defaultProps?: { style?: unknown } };
    c.defaultProps = c.defaultProps || {};
    c.defaultProps.style = [{ fontFamily }, c.defaultProps.style];
  };

  setDefault(Text);
  setDefault(TextInput);
}
