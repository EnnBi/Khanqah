import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { useTheme } from '../providers/ThemeProvider';

interface SearchBarProps {
  placeholder: string;
  onPress: () => void;
}

export function SearchBar({ placeholder, onPress }: SearchBarProps) {
  const { theme } = useTheme();
  const c = theme.colors;

  return (
    <TouchableOpacity
      style={[styles.bar, { backgroundColor: c.surface, borderColor: c.border }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[styles.icon, { color: c.textMuted }]}>⌕</Text>
      <Text style={[styles.placeholder, { color: c.textMuted }]}>
        {placeholder}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginHorizontal: 20,
    marginTop: 20,
    gap: 10,
  },
  icon: {
    fontFamily: 'DMSans',
    fontSize: 18,
  },
  placeholder: {
    fontFamily: 'CrimsonPro-Italic',
    fontSize: 15,
    flex: 1,
    letterSpacing: -0.2,
  },
});
