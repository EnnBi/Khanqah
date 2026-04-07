import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { usePlayer } from '../hooks/usePlayer';
import { useTheme } from '../providers/ThemeProvider';

export function PlayerControls() {
  const { theme } = useTheme();
  const { isPlaying, resume, pause, seekBy, skipToNext, skipToPrevious } = usePlayer();
  const c = theme.colors;

  const handlePlayPause = () => {
    if (isPlaying) {
      pause();
    } else {
      resume();
    }
  };

  return (
    <View style={styles.row}>
      {/* Previous */}
      <TouchableOpacity onPress={skipToPrevious} style={styles.sideBtn} accessibilityLabel="Previous">
        <Text style={[styles.sideBtnText, { color: c.textMuted }]}>⏮</Text>
      </TouchableOpacity>

      {/* Seek back 15s */}
      <TouchableOpacity onPress={() => seekBy(-15)} style={styles.sideBtn} accessibilityLabel="Seek back 15 seconds">
        <Text style={[styles.skipText, { color: c.textSecondary }]}>-15</Text>
        <Text style={[styles.skipSubText, { color: c.textMuted }]}>s</Text>
      </TouchableOpacity>

      {/* Play / Pause */}
      <TouchableOpacity onPress={handlePlayPause} style={styles.playBtnWrapper} accessibilityLabel={isPlaying ? 'Pause' : 'Play'}>
        <View style={[styles.playBtn, { backgroundColor: c.primary, shadowColor: c.primaryDark }]}>
          <Text style={styles.playBtnIcon}>{isPlaying ? '⏸' : '▶'}</Text>
        </View>
      </TouchableOpacity>

      {/* Seek forward 15s */}
      <TouchableOpacity onPress={() => seekBy(15)} style={styles.sideBtn} accessibilityLabel="Seek forward 15 seconds">
        <Text style={[styles.skipText, { color: c.textSecondary }]}>+15</Text>
        <Text style={[styles.skipSubText, { color: c.textMuted }]}>s</Text>
      </TouchableOpacity>

      {/* Next */}
      <TouchableOpacity onPress={skipToNext} style={styles.sideBtn} accessibilityLabel="Next">
        <Text style={[styles.sideBtnText, { color: c.textMuted }]}>⏭</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
    paddingVertical: 8,
  },
  sideBtn: {
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 40,
  },
  sideBtnText: {
    fontSize: 24,
  },
  skipText: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 16,
  },
  skipSubText: {
    fontSize: 10,
    lineHeight: 12,
    textAlign: 'center',
  },
  playBtnWrapper: {
    marginHorizontal: 4,
  },
  playBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  playBtnIcon: {
    color: '#ffffff',
    fontSize: 22,
    marginLeft: 2,
  },
});
