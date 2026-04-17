import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { useTheme } from '../providers/ThemeProvider';
import { ContentType } from '../lib/types';

const TYPE_LABEL: Record<ContentType, string> = {
  bayan:     'Discourses',
  clip:      'Moments',
  nazam:     'Nazams',
  quran:     'Recitations',
  hamd_naat: 'Hamd & Naat',
  book:      'Volumes',
};

interface CategoryTileProps {
  icon: string;
  name: string;
  count: number;
  type: ContentType;
  onPress: () => void;
}

export function CategoryTile({ icon, name, count, type, onPress }: CategoryTileProps) {
  const { theme } = useTheme();
  const c = theme.colors;
  const subtitle = TYPE_LABEL[type] ?? 'Collection';

  return (
    <TouchableOpacity
      style={[styles.tile, { backgroundColor: c.surface, borderColor: c.border }]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View style={[styles.symbolBox, { backgroundColor: c.primary }]}>
        <Text style={[styles.symbol, { color: c.accent }]}>{icon}</Text>
      </View>
      <Text style={[styles.name, { color: c.primary }]} numberOfLines={2}>
        {name}
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
