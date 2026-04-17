import React from 'react';
import { Text, TouchableOpacity, View, StyleSheet } from 'react-native';
import { useTheme } from '../providers/ThemeProvider';
import type { MirrorStatus } from '../lib/types';

interface Props {
  status: MirrorStatus;
  onRetryPress?: () => void;
}

export function MirrorStatusChip({ status, onRetryPress }: Props) {
  const { theme } = useTheme();
  const c = theme.colors;

  if (status === 'not_applicable' || status === 'ready') return null;

  let label = '';
  let bg = '';
  let fg = '';
  switch (status) {
    case 'pending':
      label = 'QUEUED';
      bg = 'rgba(120, 120, 120, 0.15)';
      fg = c.textMuted;
      break;
    case 'downloading':
    case 'uploading':
      label = 'MIRRORING…';
      bg = 'rgba(212, 168, 83, 0.18)';
      fg = c.accent;
      break;
    case 'failed':
      label = 'FAILED — RETRY';
      bg = 'rgba(194, 62, 62, 0.15)';
      fg = c.liveRed;
      break;
  }

  const chip = (
    <View style={[styles.chip, { backgroundColor: bg }]}>
      <Text style={[styles.label, { color: fg }]}>{label}</Text>
    </View>
  );

  if (status === 'failed' && onRetryPress) {
    return (
      <TouchableOpacity onPress={onRetryPress} activeOpacity={0.7}>
        {chip}
      </TouchableOpacity>
    );
  }
  return chip;
}

const styles = StyleSheet.create({
  chip: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    marginTop: 4,
  },
  label: {
    fontFamily: 'DMSans-SemiBold',
    fontSize: 10,
    letterSpacing: 1.2,
  },
});
