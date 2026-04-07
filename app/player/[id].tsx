import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions,
  PanResponder,
  Animated,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { supabase } from '../../lib/supabase';
import { Content } from '../../lib/types';
import { usePlayer } from '../../hooks/usePlayer';
import { useTheme } from '../../providers/ThemeProvider';
import { useI18n } from '../../providers/I18nProvider';
import { PlayerControls } from '../../components/PlayerControls';
import { TopicsList } from '../../components/TopicsList';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ARTWORK_SIZE = 180;
const PROGRESS_BAR_WIDTH = SCREEN_WIDTH - 48;

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${m}:${String(s).padStart(2, '0')}`;
}

const SPEED_OPTIONS = [0.75, 1.0, 1.25, 1.5, 1.75, 2.0];

export default function PlayerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { language, t } = useI18n();
  const c = theme.colors;

  const {
    currentContent,
    isPlaying,
    position,
    duration,
    playbackSpeed,
    playContent,
    seekTo,
    setSpeed,
  } = usePlayer();

  const [content, setContent] = useState<Content | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSeeking, setIsSeeking] = useState(false);
  const [seekPosition, setSeekPosition] = useState(0);

  // Fetch content from supabase
  useEffect(() => {
    if (!id) return;
    supabase
      .from('content')
      .select('*')
      .eq('id', id)
      .single()
      .then(({ data, error }) => {
        if (!error && data) {
          setContent(data as Content);
        }
        setLoading(false);
      });
  }, [id]);

  // Start playback if this content isn't already playing
  useEffect(() => {
    if (!content) return;
    if (currentContent?.id !== content.id) {
      playContent(content);
    }
  }, [content]);

  // Cycle through speed options
  const handleSpeedPress = () => {
    const idx = SPEED_OPTIONS.indexOf(playbackSpeed);
    const next = SPEED_OPTIONS[(idx + 1) % SPEED_OPTIONS.length];
    setSpeed(next);
  };

  const displayPosition = isSeeking ? seekPosition : position;
  const progress = duration > 0 ? displayPosition / duration : 0;
  const elapsed = formatTime(displayPosition);
  const remaining = duration > 0 ? `-${formatTime(duration - displayPosition)}` : '--:--';

  // Progress bar seek via PanResponder
  const progressBarRef = useRef<View>(null);
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        setIsSeeking(true);
        const ratio = Math.min(1, Math.max(0, evt.nativeEvent.locationX / PROGRESS_BAR_WIDTH));
        setSeekPosition(ratio * (duration || 0));
      },
      onPanResponderMove: (evt) => {
        const ratio = Math.min(1, Math.max(0, evt.nativeEvent.locationX / PROGRESS_BAR_WIDTH));
        setSeekPosition(ratio * (duration || 0));
      },
      onPanResponderRelease: (evt) => {
        const ratio = Math.min(1, Math.max(0, evt.nativeEvent.locationX / PROGRESS_BAR_WIDTH));
        const targetSeconds = ratio * (duration || 0);
        seekTo(targetSeconds);
        setIsSeeking(false);
      },
    }),
  ).current;

  const title = content
    ? language === 'ur'
      ? content.title_ur
      : content.title_en
    : '';

  const bgTop = theme.dark ? c.primaryDark : '#d1fae5';
  const bgBottom = theme.dark ? '#09090b' : '#ffffff';

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: c.background }]}>
        <ActivityIndicator size="large" color={c.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: bgBottom }]}>
      {/* Background gradient simulation */}
      <View
        style={[
          StyleSheet.absoluteFillObject,
          { backgroundColor: bgTop, height: '50%', top: 0 },
        ]}
      />

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 24 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn} accessibilityLabel="Back">
            <Text style={[styles.headerBtnText, { color: theme.dark ? c.text : c.primaryDark }]}>‹</Text>
          </TouchableOpacity>
          <Text style={[styles.nowPlayingLabel, { color: theme.dark ? c.textSecondary : c.primaryDark }]}>
            {t('player.nowPlaying')}
          </Text>
          <TouchableOpacity style={styles.headerBtn} accessibilityLabel="Options">
            <Text style={[styles.headerBtnText, { color: theme.dark ? c.text : c.primaryDark }]}>⋮</Text>
          </TouchableOpacity>
        </View>

        {/* Artwork */}
        <View style={styles.artworkContainer}>
          <View style={[styles.artwork, { backgroundColor: c.primaryDark }]}>
            {/* Islamic pattern overlay */}
            <Text style={styles.arabicOverlay}>ﷲ</Text>
            {/* Content emoji */}
            <Text style={styles.artworkEmoji}>🎙</Text>
          </View>
        </View>

        {/* Track Info */}
        <View style={styles.trackInfo}>
          <Text style={[styles.trackTitle, { color: c.text }]} numberOfLines={2}>
            {title || '—'}
          </Text>
          <Text style={[styles.trackArtist, { color: c.textMuted }]} numberOfLines={1}>
            Hazrat Mufti Abdur Rasheed Miftahi Sahab
          </Text>
        </View>

        {/* Progress Bar */}
        <View style={styles.progressSection}>
          <View
            ref={progressBarRef}
            style={styles.progressTrack}
            {...panResponder.panHandlers}
            accessible={false}
          >
            <View style={[styles.progressFill, { backgroundColor: c.primary, width: `${progress * 100}%` }]} />
            {/* Gold dot */}
            <View
              style={[
                styles.progressDot,
                { backgroundColor: c.gold, left: `${progress * 100}%` as any },
              ]}
            />
          </View>
          <View style={styles.timeRow}>
            <Text style={[styles.timeText, { color: c.textMuted }]}>{elapsed}</Text>
            <Text style={[styles.timeText, { color: c.textMuted }]}>{remaining}</Text>
          </View>
        </View>

        {/* Player Controls */}
        <PlayerControls />

        {/* Actions Row */}
        <View style={[styles.actionsRow, { borderTopColor: c.border, borderBottomColor: c.border }]}>
          {/* Speed */}
          <TouchableOpacity style={styles.actionBtn} onPress={handleSpeedPress} accessibilityLabel="Playback speed">
            <Text style={[styles.actionIcon, { color: c.primary }]}>🔁</Text>
            <Text style={[styles.actionLabel, { color: c.textSecondary }]}>
              {playbackSpeed.toFixed(2).replace(/\.?0+$/, '')}x
            </Text>
          </TouchableOpacity>

          {/* Save */}
          <TouchableOpacity style={styles.actionBtn} accessibilityLabel="Save offline">
            <Text style={styles.actionIcon}>⬇</Text>
            <Text style={[styles.actionLabel, { color: c.textSecondary }]}>{t('player.save')}</Text>
          </TouchableOpacity>

          {/* Share */}
          <TouchableOpacity style={styles.actionBtn} accessibilityLabel="Share">
            <Text style={styles.actionIcon}>🔀</Text>
            <Text style={[styles.actionLabel, { color: c.textSecondary }]}>{t('player.share')}</Text>
          </TouchableOpacity>

          {/* Queue */}
          <TouchableOpacity style={styles.actionBtn} accessibilityLabel="Queue">
            <Text style={styles.actionIcon}>☰</Text>
            <Text style={[styles.actionLabel, { color: c.textSecondary }]}>{t('player.queue')}</Text>
          </TouchableOpacity>
        </View>

        {/* Topics Panel */}
        {content && (
          <View style={styles.topicsSection}>
            <Text style={[styles.topicsHeading, { color: c.text }]}>{t('player.topics')}</Text>
            <TopicsList contentId={content.id} currentPosition={position} />
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: 24,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  headerBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBtnText: {
    fontSize: 28,
    fontWeight: '300',
    lineHeight: 32,
  },
  nowPlayingLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },

  // Artwork
  artworkContainer: {
    alignItems: 'center',
    marginBottom: 28,
  },
  artwork: {
    width: ARTWORK_SIZE,
    height: ARTWORK_SIZE,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
    overflow: 'hidden',
  },
  arabicOverlay: {
    position: 'absolute',
    fontSize: 120,
    color: 'rgba(255,255,255,0.07)',
    fontWeight: '400',
  },
  artworkEmoji: {
    fontSize: 64,
    zIndex: 1,
  },

  // Track info
  trackInfo: {
    alignItems: 'center',
    marginBottom: 24,
    gap: 6,
  },
  trackTitle: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 22,
  },
  trackArtist: {
    fontSize: 12,
    textAlign: 'center',
  },

  // Progress
  progressSection: {
    marginBottom: 8,
  },
  progressTrack: {
    height: 4,
    backgroundColor: 'rgba(150,150,150,0.25)',
    borderRadius: 2,
    width: PROGRESS_BAR_WIDTH,
    alignSelf: 'center',
    marginBottom: 8,
    position: 'relative',
    justifyContent: 'center',
  },
  progressFill: {
    height: 4,
    borderRadius: 2,
    position: 'absolute',
    left: 0,
    top: 0,
  },
  progressDot: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    marginLeft: -6,
    top: -4,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 0,
  },
  timeText: {
    fontSize: 12,
    fontVariant: ['tabular-nums'],
  },

  // Actions
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    paddingVertical: 14,
    marginVertical: 16,
  },
  actionBtn: {
    alignItems: 'center',
    gap: 4,
    minWidth: 60,
  },
  actionIcon: {
    fontSize: 18,
  },
  actionLabel: {
    fontSize: 11,
    fontWeight: '500',
  },

  // Topics
  topicsSection: {
    gap: 12,
  },
  topicsHeading: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
