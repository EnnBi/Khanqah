import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { useTheme } from '../providers/ThemeProvider';
import { useI18n } from '../providers/I18nProvider';
import { ContentType } from '../lib/types';
import { useBilingual, urduTextStyle } from './BilingualText';

const TYPE_LABEL_KEY: Record<ContentType, string> = {
  bayan:     'libraryIndex.tileLabels.bayan',
  clip:      'libraryIndex.tileLabels.clip',
  nazam:     'libraryIndex.tileLabels.nazam',
  quran:     'libraryIndex.tileLabels.quran',
  hamd_naat: 'libraryIndex.tileLabels.hamd_naat',
  book:      'libraryIndex.tileLabels.book',
  mamulat:   'libraryIndex.tileLabels.mamulat',
};

interface CategoryTileProps {
  icon: string;
  name: string;        // Current-language name (kept for compat)
  nameEn?: string;     // Optional — if provided with nameUr, renders with correct font
  nameUr?: string;
  count: number;
  type: ContentType;
  onPress: () => void;
}

export function CategoryTile({ icon, name, nameEn, nameUr, count, type, onPress }: CategoryTileProps) {
  const { theme } = useTheme();
  const c = theme.colors;
  const { t } = useI18n();
  const { isUrdu } = useBilingual();
  const subtitle = TYPE_LABEL_KEY[type] ? t(TYPE_LABEL_KEY[type]) : '';

  // Prefer bilingual props if provided, otherwise fall back to `name`
  const displayName = nameEn && nameUr ? (isUrdu ? nameUr : nameEn) : name;
  const useUrduFont = (nameEn && nameUr) ? isUrdu : false;

  return (
    <TouchableOpacity
      style={[styles.tile, { backgroundColor: c.surface, borderColor: c.border }]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View style={[styles.symbolBox, { backgroundColor: c.primary }]}>
        <Text style={[styles.symbol, { color: c.onPrimary }]}>{icon}</Text>
      </View>
      <Text
        style={[styles.name, { color: c.primary }, useUrduFont && urduTextStyle]}
        numberOfLines={2}
      >
        {displayName}
      </Text>
      <Text style={[styles.subtitle, { color: c.textMuted }]}>
        {subtitle}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    margin: 6,
    borderRadius: 10,
    borderWidth: 1,
    padding: 18,
    minHeight: 150,
  },
  symbolBox: {
    width: 40,
    height: 40,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  symbol: {
    fontSize: 18,
  },
  name: {
    fontFamily: 'CrimsonPro',
    fontSize: 17,
    lineHeight: 20,
    letterSpacing: -0.2,
    marginBottom: 4,
  },
  subtitle: {
    fontFamily: 'DMSans-Medium',
    fontSize: 9,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
});
