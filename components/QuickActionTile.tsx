import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../providers/ThemeProvider';

interface QuickActionTileProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  accent?: boolean;
}

export function QuickActionTile({ icon, label, onPress, accent = false }: QuickActionTileProps) {
  const { theme } = useTheme();
  const c = theme.colors;
  const holderBg = accent ? `${c.accent}33` : c.surface2;
  const holderColor = accent ? c.accent : c.primary;

  return (
    <TouchableOpacity
      style={[styles.tile, { backgroundColor: c.surface, borderColor: c.border }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={[styles.icon, { backgroundColor: holderBg }]}>
        <Ionicons name={icon} size={22} color={holderColor} />
      </View>
      <Text style={[styles.label, { color: c.text }]} numberOfLines={1}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    gap: 6,
  },
  icon: {
    width: 42, height: 42, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  label: {
    fontFamily: 'DMSans-Medium',
    fontSize: 11,
    textAlign: 'center',
  },
});
