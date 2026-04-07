import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useTheme } from '../providers/ThemeProvider';

interface SearchBarProps {
  placeholder: string;
  onPress: () => void;
}

export function SearchBar({ placeholder, onPress }: SearchBarProps) {
  const { theme } = useTheme();

  return (
    <TouchableOpacity
      style={[
        styles.bar,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[styles.icon, { color: theme.colors.textMuted }]}>🔍</Text>
      <Text style={[styles.placeholder, { color: theme.colors.textMuted }]}>
        {placeholder}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginHorizontal: 16,
    marginVertical: 12,
    gap: 8,
  },
  icon: {
    fontSize: 16,
  },
  placeholder: {
    fontSize: 15,
    flex: 1,
  },
});
