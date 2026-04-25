import React from 'react';
import { Text, TextStyle, StyleSheet } from 'react-native';
import { useI18n } from '../providers/I18nProvider';

interface BilingualTextProps {
  en: string;
  ur: string;
  style?: TextStyle | TextStyle[];
  numberOfLines?: number;
}

// Shared Urdu (Nastaleeq) text style — reuse anywhere Urdu text is rendered.
// Layout direction (writingDirection, textAlign) is now driven globally by
// I18nManager.forceRTL(); this style keeps only the font and line-height.
export const urduTextStyle: TextStyle = {
  fontFamily: 'NastaleeqUrdu',
  lineHeight: 32,
};

/**
 * Pick text and style based on current language.
 * Use when you can't use BilingualText directly (e.g. for passing to props that accept strings).
 */
export function useBilingual() {
  const { language } = useI18n();
  const isUrdu = language === 'ur';

  function pick(en: string, ur: string): { text: string; style: TextStyle } {
    return {
      text: isUrdu ? ur : en,
      style: isUrdu ? urduTextStyle : ({} as TextStyle),
    };
  }

  return { isUrdu, pick };
}

export function BilingualText({ en, ur, style, numberOfLines }: BilingualTextProps) {
  const { language } = useI18n();
  const text = language === 'ur' ? ur : en;
  const isUrdu = language === 'ur';

  return (
    <Text
      style={[isUrdu && urduTextStyle, style]}
      numberOfLines={numberOfLines}
    >
      {text}
    </Text>
  );
}
