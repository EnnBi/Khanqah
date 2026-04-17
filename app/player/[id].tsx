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
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { supabase } from '../../lib/supabase';
import { Content, ContentType } from '../../lib/types';
import { usePlayer } from '../../hooks/usePlayer';
import { useSafeBack } from '../../hooks/useSafeBack';
import { useTheme } from '../../providers/ThemeProvider';
import { useI18n } from '../../providers/I18nProvider';
import { TopicsList } from '../../components/TopicsList';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ARTWORK_SIZE = 240;
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

const TYPE_SYMBOL: Record<ContentType, string> = {
  bayan: '♪',
  clip: '▸',
  nazam: '✧',
  quran: '☪',
  hamd_naat: '✦',
  book: '❖',
};

export default function PlayerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { language, t } = useI18n();
  const c = theme.colors;
  const goBack = useSafeBack();

  const {
    currentContent,
    isPlaying,
    position,
    duration,
    playbackSpeed,
    playContent,
    pause,
    resume,
    seekTo,
    seekBy,
    setSpeed,
    skipToNext,
    skipToPrevious,
  } = usePlayer();

  const [content, setContent] = useState<Content | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSeeking, setIsSeeking] = useState(false);
  const [seekPosition, setSeekPosition] = useState(0);

  // Animated scale for play button press
  const playBtnScale = useRef(new Animated.Value(1)).current;

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

  const handlePlayPause = () => {
    Animated.sequence([
      Animated.timing(playBtnScale, { toValue: 0.92, duration: 80, useNativeDriver: true }),
      Animated.timing(playBtnScale, { toValue: 1, duration: 120, useNativeDriver: true }),
    ]).start();
    if (isPlaying) {
      pause();
    } else {
      resume();
    }
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

  const contentSymbol = content ? (TYPE_SYMBOL[content.type] ?? '♪') : '♪';

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: c.background }]}>
        <ActivityIndicator size="large" color={c.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: c.background }]}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 32 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ── */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={goBack}
            style={styles.headerBtn}
            accessibilityLabel="Back"
          >
            <Text style={[styles.backBtnText, { color: c.primary }]}>‹ Back</Text>
          </TouchableOpacity>

          <Text style={[styles.nowPlayingLabel, { color: c.textMuted }]}>
            NOW PLAYING
          </Text>

          <TouchableOpacity style={styles.headerBtn} accessibilityLabel="Options">
            <Text style={[styles.optionsBtnText, { color: c.primary }]}>⋮</Text>
          </TouchableOpacity>
        </View>

        {/* ── Artwork ── */}
        <View style={styles.artworkContainer}>
          {/* Outer gold ring */}
          <View style={[styles.artworkRing, { borderColor: c.gold }]}>
            <View
              style={[
                styles.artwork,
                { backgroundColor: c.primary },
              ]}
            >
              {/* Low-opacity geometric pattern */}
              <Text style={styles.geometricPattern}>✦ ✧ ✦ ✧ ✦</Text>
              <Text style={styles.geometricPatternB}>✧ ✦ ✧ ✦ ✧</Text>
              {/* Content-type symbol */}
              <Text style={[styles.artworkSymbol, { color: c.gold }]}>{contentSymbol}</Text>
            </View>
          </View>
        </View>

        {/* ── Track Info ── */}
        <View style={styles.trackInfo}>
          <Text
            style={[
              styles.trackTitle,
              { color: c.text },
              language === 'ur' && { fontFamily: 'NastaleeqUrdu', writingDirection: 'rtl', textAlign: 'center', lineHeight: 40 },
            ]}
            numberOfLines={2}
          >
            {title || '—'}
          </Text>
          <Text style={[styles.trackArtist, { color: c.textMuted }]} numberOfLines={1}>
            Hazrat Mufti Abdur Rasheed Miftahi Sahab
          </Text>
        </View>

        {/* ── Progress Bar ── */}
        <View style={styles.progressSection}>
          <View
            ref={progressBarRef}
            style={[styles.progressTrack, { backgroundColor: c.border }]}
            {...panResponder.panHandlers}
            accessible={false}
          >
            <View
              style={[
                styles.progressFill,
                { backgroundColor: c.gold, width: `${progress * 100}%` },
              ]}
            />
            {/* Gold handle circle */}
            <View
              style={[
                styles.progressHandle,
                { backgroundColor: c.gold, left: `${progress * 100}%` as any },
              ]}
            />
          </View>
          <View style={styles.timeRow}>
            <Text style={[styles.timeText, { color: c.textMuted }]}>{elapsed}</Text>
            <Text style={[styles.timeText, { color: c.textMuted }]}>{remaining}</Text>
          </View>
        </View>

        {/* ── Player Controls ── */}
        <View style={styles.controlsRow}>
          {/* Previous */}
          <TouchableOpacity
            onPress={skipToPrevious}
            style={styles.sideControl}
            accessibilityLabel="Previous"
          >
            <Text style={[styles.serifNavText, { color: c.textMuted }]}>‹‹</Text>
          </TouchableOpacity>

          {/* Seek back 15s */}
          <TouchableOpacity
            onPress={() => seekBy(-15)}
            style={styles.seekControl}
            accessibilityLabel="Seek back 15 seconds"
          >
            <Text style={[styles.seekText, { color: c.textMuted }]}>−15s</Text>
          </TouchableOpacity>

          {/* Play / Pause */}
          <Animated.View style={{ transform: [{ scale: playBtnScale }] }}>
            <TouchableOpacity
              onPress={handlePlayPause}
              style={[
                styles.playBtn,
                {
                  backgroundColor: c.primary,
                  borderColor: c.gold,
                  shadowColor: c.gold,
                },
              ]}
              accessibilityLabel={isPlaying ? 'Pause' : 'Play'}
            >
              <Text style={[styles.playBtnIcon, { color: c.gold }]}>
                {isPlaying ? '▌▌' : '▶'}
              </Text>
            </TouchableOpacity>
          </Animated.View>

          {/* Seek forward 15s */}
          <TouchableOpacity
            onPress={() => seekBy(15)}
            style={styles.seekControl}
            accessibilityLabel="Seek forward 15 seconds"
          >
            <Text style={[styles.seekText, { color: c.textMuted }]}>+15s</Text>
          </TouchableOpacity>

          {/* Next */}
          <TouchableOpacity
            onPress={skipToNext}
            style={styles.sideControl}
            accessibilityLabel="Next"
          >
            <Text style={[styles.serifNavText, { color: c.textMuted }]}>››</Text>
          </TouchableOpacity>
        </View>

        {/* ── Speed pill ── */}
        <View style={styles.speedRow}>
          <TouchableOpacity
            onPress={handleSpeedPress}
            style={[styles.speedPill, { borderColor: c.border }]}
            accessibilityLabel="Playback speed"
          >
            <Text style={[styles.speedPillText, { color: c.primary }]}>
              {playbackSpeed % 1 === 0
                ? `${playbackSpeed.toFixed(1)}×`
                : `${playbackSpeed}×`}
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── Actions Row ── */}
        <View style={[styles.actionsRow, { borderTopColor: c.hairline, borderBottomColor: c.hairline }]}>
          {/* Save */}
          <TouchableOpacity style={styles.actionBtn} accessibilityLabel="Save offline">
            <Text style={[styles.actionIcon, { color: c.primary }]}>↓</Text>
            <Text style={[styles.actionLabel, { color: c.textMuted }]}>SAVE</Text>
          </TouchableOpacity>

          {/* Share */}
          <TouchableOpacity style={styles.actionBtn} accessibilityLabel="Share">
            <Text style={[styles.actionIcon, { color: c.primary }]}>↗</Text>
            <Text style={[styles.actionLabel, { color: c.textMuted }]}>SHARE</Text>
          </TouchableOpacity>

          {/* Queue */}
          <TouchableOpacity style={styles.actionBtn} accessibilityLabel="Queue">
            <Text style={[styles.actionIcon, { color: c.primary }]}>≡</Text>
            <Text style={[styles.actionLabel, { color: c.textMuted }]}>QUEUE</Text>
          </TouchableOpacity>

          {/* Speed (repeat here for quick access) */}
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={handleSpeedPress}
            accessibilityLabel="Playback speed"
          >
            <Text style={[styles.actionIcon, { color: c.primary }]}>⟳</Text>
            <Text style={[styles.actionLabel, { color: c.textMuted }]}>SPEED</Text>
          </TouchableOpacity>
        </View>

        {/* ── Topics Panel ── */}
        {content && (
          <View style={styles.topicsSection}>
            {/* Section header */}
            <View style={styles.topicsHeader}>
              <Text style={[styles.topicsLabel, { color: c.textMuted }]}>TOPICS</Text>
              <Text style={[styles.topicsHeading, { color: c.text }]}>Chapters</Text>
            </View>
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

  // ── Header ──
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  headerBtn: {
    minWidth: 64,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnText: {
    fontFamily: 'CrimsonPro-Italic',
    fontSize: 17,
    letterSpacing: 0.2,
  },
  nowPlayingLabel: {
    fontFamily: 'DMSans',
    fontSize: 11,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  optionsBtnText: {
    fontSize: 22,
    lineHeight: 26,
  },

  // ── Artwork ──
  artworkContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  artworkRing: {
    borderRadius: 28,
    borderWidth: 2,
    padding: 4,
    shadowColor: '#d4a853',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 18,
    elevation: 8,
  },
  artwork: {
    width: ARTWORK_SIZE,
    height: ARTWORK_SIZE,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  geometricPattern: {
    position: 'absolute',
    top: 28,
    fontSize: 13,
    letterSpacing: 18,
    color: 'rgba(212, 168, 83, 0.08)',
    fontFamily: 'DMSans',
  },
  geometricPatternB: {
    position: 'absolute',
    bottom: 28,
    fontSize: 13,
    letterSpacing: 18,
    color: 'rgba(212, 168, 83, 0.08)',
    fontFamily: 'DMSans',
  },
  artworkSymbol: {
    fontSize: 72,
    zIndex: 1,
  },

  // ── Track info ──
  trackInfo: {
    alignItems: 'center',
    marginBottom: 28,
    gap: 8,
    paddingHorizontal: 8,
  },
  trackTitle: {
    fontFamily: 'CrimsonPro',
    fontSize: 28,
    lineHeight: 34,
    textAlign: 'center',
  },
  trackArtist: {
    fontFamily: 'DMSans',
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    textAlign: 'center',
  },

  // ── Progress ──
  progressSection: {
    marginBottom: 28,
  },
  progressTrack: {
    height: 2,
    borderRadius: 1,
    width: PROGRESS_BAR_WIDTH,
    alignSelf: 'center',
    marginBottom: 10,
    position: 'relative',
    justifyContent: 'center',
  },
  progressFill: {
    height: 2,
    borderRadius: 1,
    position: 'absolute',
    left: 0,
    top: 0,
  },
  progressHandle: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    marginLeft: -5,
    top: -4,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 0,
  },
  timeText: {
    fontFamily: 'DMSans',
    fontSize: 12,
    fontVariant: ['tabular-nums'],
  },

  // ── Controls ──
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 20,
  },
  sideControl: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  serifNavText: {
    fontFamily: 'CrimsonPro',
    fontSize: 22,
    lineHeight: 26,
  },
  seekControl: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  seekText: {
    fontFamily: 'DMSans',
    fontSize: 12,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  playBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  playBtnIcon: {
    fontSize: 22,
    marginLeft: 2,
  },

  // ── Speed pill ──
  speedRow: {
    alignItems: 'center',
    marginBottom: 24,
  },
  speedPill: {
    borderWidth: 1,
    borderRadius: 100,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  speedPillText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 13,
    letterSpacing: 0.3,
  },

  // ── Actions ──
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    paddingVertical: 16,
    marginBottom: 28,
  },
  actionBtn: {
    alignItems: 'center',
    gap: 5,
    minWidth: 56,
  },
  actionIcon: {
    fontSize: 18,
    lineHeight: 22,
  },
  actionLabel: {
    fontFamily: 'DMSans',
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },

  // ── Topics ──
  topicsSection: {
    gap: 12,
  },
  topicsHeader: {
    gap: 2,
  },
  topicsLabel: {
    fontFamily: 'DMSans',
    fontSize: 11,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  topicsHeading: {
    fontFamily: 'CrimsonPro-Italic',
    fontSize: 22,
    lineHeight: 28,
  },
});
