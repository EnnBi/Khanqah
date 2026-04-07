import React from 'react';
import { Text, TextStyle, StyleSheet } from 'react-native';
import { useI18n } from '../providers/I18nProvider';

interface BilingualTextProps {
  en: string;
  ur: string;
  style?: TextStyle | TextStyle[];
  numberOfLines?: number;
}

export function BilingualText({ en, ur, style, numberOfLines }: BilingualTextProps) {
  const { language } = useI18n();
  const text = language === 'ur' ? ur : en;
  const isUrdu = language === 'ur';

  return (
    <Text
      style={[
        isUrdu && styles.urdu,
        style,
      ]}
      numberOfLines={numberOfLines}
    >
      {text}
    </Text>
  );
}

const styles = StyleSheet.create({
  urdu: {
    fontFamily: 'NastaleeqUrdu',
    writingDirection: 'rtl',
    textAlign: 'right',
    lineHeight: 32,
  },
});
