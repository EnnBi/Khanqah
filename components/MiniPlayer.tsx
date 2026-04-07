import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { usePlayer } from '../hooks/usePlayer';
import { useTheme } from '../providers/ThemeProvider';

export function MiniPlayer() {
  const { currentContent, isPlaying, position, duration, resume, pause } = usePlayer();
  const { theme } = useTheme();
  const colors = theme.colors;
  const router = useRouter();

  if (!currentContent) return null;

  const progressWidth = duration > 0 ? `${(position / duration) * 100}%` : '0%';

  const handlePlayPause = async () => {
    if (isPlaying) {
      await pause();
    } else {
      await resume();
    }
  };

  const handleNavigate = () => {
    router.push(`/player/${currentContent.id}`);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.miniPlayerBg }]}>
      {/* Gold progress bar */}
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: progressWidth as any }]} />
      </View>

      {/* Main content row */}
      <TouchableOpacity
        style={styles.row}
        onPress={handleNavigate}
        activeOpacity={0.8}
      >
        {/* Thumbnail */}
        <View style={styles.thumbnail}>
          <Text style={styles.thumbnailEmoji}>🎙</Text>
        </View>

        {/* Title + artist */}
        <View style={styles.info}>
          <Text
            style={[styles.title, { color: colors.text }]}
            numberOfLines={1}
          >
            {currentContent.title_en || currentContent.title_ur || 'Untitled'}
          </Text>
          <Text
            style={[styles.artist, { color: colors.textMuted }]}
            numberOfLines={1}
          >
            Mufti Abdur Rasheed Miftahi Sahab
          </Text>
        </View>

        {/* Play / Pause button */}
        <TouchableOpacity
          style={styles.playButton}
          onPress={handlePlayPause}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={[styles.playIcon, { color: colors.primaryLight }]}>
            {isPlaying ? '⏸' : '▶'}
          </Text>
        </TouchableOpacity>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 50,
    left: 0,
    right: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 8,
  },
  progressTrack: {
    height: 2,
    backgroundColor: 'rgba(0,0,0,0.1)',
    width: '100%',
  },
  progressFill: {
    height: 2,
    backgroundColor: '#d4a853',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    height: 50,
  },
  thumbnail: {
    width: 34,
    height: 34,
    borderRadius: 4,
    backgroundColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    flexShrink: 0,
  },
  thumbnailEmoji: {
    fontSize: 18,
  },
  info: {
    flex: 1,
    justifyContent: 'center',
    marginRight: 8,
  },
  title: {
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 14,
  },
  artist: {
    fontSize: 9,
    lineHeight: 12,
    marginTop: 1,
  },
  playButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  playIcon: {
    fontSize: 18,
  },
});
