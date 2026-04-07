import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { useTheme } from '../providers/ThemeProvider';
import { ContentType } from '../lib/types';

interface TileColors {
  light: string;
  dark: string;
}

const TYPE_TINTS: Record<ContentType, TileColors> = {
  bayan:     { light: '#dcfce7', dark: '#14532d' },
  clip:      { light: '#fef9c3', dark: '#713f12' },
  nazam:     { light: '#f3e8ff', dark: '#581c87' },
  quran:     { light: '#dbeafe', dark: '#1e3a5f' },
  hamd_naat: { light: '#fce7f3', dark: '#831843' },
  book:      { light: '#fef3c7', dark: '#78350f' },
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
  const tints = TYPE_TINTS[type] ?? TYPE_TINTS.bayan;
  const bgColor = theme.dark ? tints.dark : tints.light;

  return (
    <TouchableOpacity
      style={[
        styles.tile,
        {
          backgroundColor: bgColor,
          borderColor: theme.colors.border,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <Text style={styles.emoji}>{icon}</Text>
      <Text style={[styles.name, { color: theme.colors.text }]} numberOfLines={2}>
        {name}
      </Text>
      <Text style={[styles.count, { color: theme.colors.textMuted }]}>
        {count} items
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    margin: 6,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    paddingHorizontal: 12,
    minHeight: 130,
  },
  emoji: {
    fontSize: 36,
    marginBottom: 10,
  },
  name: {
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 4,
  },
  count: {
    fontSize: 12,
    textAlign: 'center',
  },
});
