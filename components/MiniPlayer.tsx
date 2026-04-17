import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePlayer } from '../hooks/usePlayer';
import { useTheme } from '../providers/ThemeProvider';

// Approximate tab bar height (content + safe-area)
const TAB_BAR_HEIGHT = 64;

export function MiniPlayer() {
  const { currentContent, isPlaying, position, duration, resume, pause } = usePlayer();
  const { theme } = useTheme();
  const c = theme.colors;
  const router = useRouter();
  const insets = useSafeAreaInsets();

  if (!currentContent) return null;

  const progressWidth = duration > 0 ? `${(position / duration) * 100}%` : '0%';

  const handlePlayPause = async () => {
    if (isPlaying) await pause();
    else await resume();
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: c.primary,
          bottom: TAB_BAR_HEIGHT + Math.max(insets.bottom, 10),
        },
      ]}
    >
      {/* Gold progress bar at top */}
      <View style={[styles.progressTrack, { backgroundColor: 'rgba(212, 168, 83, 0.2)' }]}>
        <View style={[styles.progressFill, { width: progressWidth as any, backgroundColor: c.accent }]} />
      </View>

      <TouchableOpacity
        style={styles.row}
        onPress={() => router.push(`/player/${currentContent.id}`)}
        activeOpacity={0.85}
      >
        <View style={[styles.thumb, { borderColor: c.onPrimary }]}>
          <Text style={[styles.thumbSymbol, { color: c.onPrimary }]}>♪</Text>
        </View>

        <View style={styles.info}>
          <Text
            style={[styles.title, { color: c.onPrimary }]}
            numberOfLines={1}
          >
            {currentContent.title_en || currentContent.title_ur || 'Untitled'}
          </Text>
          <Text
            style={[styles.artist, { color: c.onPrimary, opacity: 0.7 }]}
            numberOfLines={1}
          >
            MUFTI ABDUR RASHEED MIFTAHI SAHAB
          </Text>
        </View>

        <TouchableOpacity
          style={styles.playButton}
          onPress={handlePlayPause}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={[styles.playIcon, { color: c.onPrimary }]}>
            {isPlaying ? '▌▌' : '▶'}
          </Text>
        </TouchableOpacity>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 10,
  },
  progressTrack: {
    height: 2,
    width: '100%',
  },
  progressFill: {
    height: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    height: 58,
  },
  thumb: {
    width: 38,
    height: 38,
    borderRadius: 4,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    flexShrink: 0,
  },
  thumbSymbol: {
    fontSize: 16,
  },
  info: {
    flex: 1,
    justifyContent: 'center',
    marginRight: 8,
  },
  title: {
    fontFamily: 'CrimsonPro',
    fontSize: 14,
    lineHeight: 17,
    letterSpacing: -0.2,
  },
  artist: {
    fontFamily: 'DMSans-Medium',
    fontSize: 8,
    lineHeight: 11,
    letterSpacing: 1.5,
    marginTop: 2,
  },
  playButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  playIcon: {
    fontFamily: 'DMSans-SemiBold',
    fontSize: 14,
  },
});
