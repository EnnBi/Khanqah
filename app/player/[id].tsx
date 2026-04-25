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
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AVPlaybackStatus, ResizeMode, Video } from 'expo-av';

import { supabase } from '../../lib/supabase';
import { Content, ContentType, pickCredit } from '../../lib/types';
import { usePlayer } from '../../hooks/usePlayer';
import { useSafeBack } from '../../hooks/useSafeBack';
import { useTheme } from '../../providers/ThemeProvider';
import { useI18n } from '../../providers/I18nProvider';
import { YouTubeEmbed, isYouTubeUrl, isDirectVideoUrl } from '../../components/YouTubeEmbed';

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
  mamulat: '❂',
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
    isBuffering,
    isLoading,
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

  // Local state for direct <video> playback — the custom player chrome
  // (scrubber, play/pause, speed pill) drives a local HTMLVideoElement
  // instead of the shared PlayerProvider audio element. Lives on this
  // screen only — navigating away stops the video.
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const nativeVideoRef = useRef<Video | null>(null);
  const [vidPlaying, setVidPlaying] = useState(false);
  const [vidPosition, setVidPosition] = useState(0);
  const [vidDuration, setVidDuration] = useState(0);
  const [vidSpeed, setVidSpeed] = useState(1);
  const [vidBuffering, setVidBuffering] = useState(false);

  // Derive once per render. `content` is declared above; isDirectVideo
  // gates whether we use the local <video> state or the shared audio
  // state everywhere downstream (handlers, scrubber, speed pill).
  const isYouTube = isYouTubeUrl(content?.media_url);
  const isDirectVideo = !isYouTube && isDirectVideoUrl(content?.media_url);
  const activePosition = isDirectVideo ? vidPosition : position;
  const activeDuration = isDirectVideo ? vidDuration : duration;
  const activeIsPlaying = isDirectVideo ? vidPlaying : isPlaying;
  const activeSpeed = isDirectVideo ? vidSpeed : playbackSpeed;
  const activeBuffering = isDirectVideo ? vidBuffering : isBuffering;
  // Audio "spinning up" state — from playContent() until the sound
  // actually starts playing. Direct video uses vidBuffering instead.
  const activeLoading = isDirectVideo ? false : isLoading;

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

  // Start playback if this content isn't already playing. Skip for
  // YouTube and direct-video URLs — those have their own in-page
  // players (YouTubeEmbed, HTML5 <video> on web, expo-av Video on
  // native) and must not be pushed through PlayerProvider's audio path.
  useEffect(() => {
    if (!content) return;
    if (!content.media_url) return;
    if (isYouTube || isDirectVideo) return;
    if (currentContent?.id !== content.id) {
      playContent(content);
    }
  }, [content, isYouTube, isDirectVideo]);

  // Cycle through speed options — video uses the local element, audio
  // routes through the PlayerProvider as before.
  const handleSpeedPress = () => {
    const idx = SPEED_OPTIONS.indexOf(activeSpeed);
    const next = SPEED_OPTIONS[(idx + 1) % SPEED_OPTIONS.length];
    if (isDirectVideo) {
      if (Platform.OS === 'web') {
        if (videoRef.current) videoRef.current.playbackRate = next;
      } else {
        nativeVideoRef.current?.setRateAsync(next, true).catch(() => {});
      }
      setVidSpeed(next);
    } else {
      setSpeed(next);
    }
  };

  const handlePlayPause = () => {
    Animated.sequence([
      Animated.timing(playBtnScale, { toValue: 0.92, duration: 80, useNativeDriver: true }),
      Animated.timing(playBtnScale, { toValue: 1, duration: 120, useNativeDriver: true }),
    ]).start();
    if (isDirectVideo) {
      if (Platform.OS === 'web') {
        const el = videoRef.current;
        if (!el) return;
        if (el.paused) {
          el.play().catch((err: unknown) => console.warn('[player] video play failed:', err));
        } else {
          el.pause();
        }
      } else {
        const ref = nativeVideoRef.current;
        if (!ref) return;
        if (vidPlaying) ref.pauseAsync().catch(() => {});
        else ref.playAsync().catch(() => {});
      }
      return;
    }
    if (isPlaying) {
      pause();
    } else if (currentContent?.id === content?.id) {
      resume();
    } else if (content) {
      // Either no track is loaded yet (browser blocked autoplay) or a
      // different track is loaded — kick playback under the user gesture.
      playContent(content);
    }
  };

  const handleSeekTo = (seconds: number) => {
    if (isDirectVideo) {
      if (Platform.OS === 'web') {
        const el = videoRef.current;
        if (!el) return;
        el.currentTime = Math.max(0, Math.min(seconds, el.duration || seconds));
      } else {
        nativeVideoRef.current?.setPositionAsync(Math.max(0, seconds) * 1000).catch(() => {});
      }
      return;
    }
    seekTo(seconds);
  };

  const handleSeekBy = (delta: number) => {
    if (isDirectVideo) {
      if (Platform.OS === 'web') {
        const el = videoRef.current;
        if (!el) return;
        el.currentTime = Math.max(0, Math.min(el.duration || 0, el.currentTime + delta));
      } else {
        const target = Math.max(0, (vidPosition + delta));
        nativeVideoRef.current?.setPositionAsync(target * 1000).catch(() => {});
      }
      return;
    }
    seekBy(delta);
  };

  // Native-Video playback status → drives the same vid* state that web uses.
  const onNativeVideoStatus = (status: AVPlaybackStatus) => {
    if (!status.isLoaded) {
      setVidPlaying(false);
      return;
    }
    setVidPlaying(status.isPlaying);
    setVidBuffering(status.isBuffering);
    setVidPosition((status.positionMillis ?? 0) / 1000);
    if (status.durationMillis) setVidDuration(status.durationMillis / 1000);
  };

  const displayPosition = isSeeking ? seekPosition : activePosition;
  const progress = activeDuration > 0 ? displayPosition / activeDuration : 0;
  const elapsed = formatTime(displayPosition);
  const remaining = activeDuration > 0 ? `-${formatTime(activeDuration - displayPosition)}` : '--:--';

  // Progress bar seek via PanResponder
  const progressBarRef = useRef<View>(null);
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        setIsSeeking(true);
        const ratio = Math.min(1, Math.max(0, evt.nativeEvent.locationX / PROGRESS_BAR_WIDTH));
        setSeekPosition(ratio * (activeDuration || 0));
      },
      onPanResponderMove: (evt) => {
        const ratio = Math.min(1, Math.max(0, evt.nativeEvent.locationX / PROGRESS_BAR_WIDTH));
        setSeekPosition(ratio * (activeDuration || 0));
      },
      onPanResponderRelease: (evt) => {
        const ratio = Math.min(1, Math.max(0, evt.nativeEvent.locationX / PROGRESS_BAR_WIDTH));
        const targetSeconds = ratio * (activeDuration || 0);
        handleSeekTo(targetSeconds);
        setIsSeeking(false);
      },
    }),
  ).current;

  const title = content
    ? language === 'ur'
      ? content.title_ur
      : content.title_en
    : '';

  const credit = content ? pickCredit(content, language) : null;

  const contentSymbol = content ? (TYPE_SYMBOL[content.type] ?? '♪') : '♪';

  // Attach listeners to the local <video> element so our custom chrome
  // can reflect play/pause/time/duration/ended.
  useEffect(() => {
    if (!isDirectVideo || Platform.OS !== 'web') return;
    const el = videoRef.current;
    if (!el) return;
    const onPlay = () => setVidPlaying(true);
    const onPause = () => setVidPlaying(false);
    const onEnded = () => setVidPlaying(false);
    const onTime = () => setVidPosition(el.currentTime || 0);
    const onMeta = () => setVidDuration(isFinite(el.duration) ? el.duration : 0);
    const onBufferingStart = () => setVidBuffering(true);
    const onBufferingEnd = () => setVidBuffering(false);
    el.addEventListener('play', onPlay);
    el.addEventListener('pause', onPause);
    el.addEventListener('ended', onEnded);
    el.addEventListener('timeupdate', onTime);
    el.addEventListener('loadedmetadata', onMeta);
    el.addEventListener('loadstart', onBufferingStart);
    el.addEventListener('waiting', onBufferingStart);
    el.addEventListener('canplay', onBufferingEnd);
    el.addEventListener('playing', onBufferingEnd);
    return () => {
      el.removeEventListener('play', onPlay);
      el.removeEventListener('pause', onPause);
      el.removeEventListener('ended', onEnded);
      el.removeEventListener('timeupdate', onTime);
      el.removeEventListener('loadedmetadata', onMeta);
      el.removeEventListener('loadstart', onBufferingStart);
      el.removeEventListener('waiting', onBufferingStart);
      el.removeEventListener('canplay', onBufferingEnd);
      el.removeEventListener('playing', onBufferingEnd);
    };
  }, [isDirectVideo, content?.id]);

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

        {/* ── Artwork / YouTube embed / direct video ── */}
        {isYouTube && content ? (
          <View style={styles.youtubeContainer}>
            <YouTubeEmbed url={content.media_url} title={content.title_en} />
          </View>
        ) : isDirectVideo && content ? (
          <View style={styles.youtubeContainer}>
            {Platform.OS === 'web'
              ? React.createElement('video', {
                  ref: videoRef,
                  src: content.media_url,
                  playsInline: true,
                  preload: 'metadata',
                  // Our own scrubber / play-pause / speed chrome drives
                  // this element — browser controls stay hidden.
                  style: {
                    width: '100%',
                    aspectRatio: '16 / 9',
                    background: '#000',
                    borderRadius: 8,
                    display: 'block',
                  },
                })
              : (
                <Video
                  ref={nativeVideoRef}
                  source={{ uri: content.media_url }}
                  style={{ width: '100%', aspectRatio: 16 / 9, borderRadius: 8, backgroundColor: '#000' }}
                  resizeMode={ResizeMode.CONTAIN}
                  shouldPlay
                  onPlaybackStatusUpdate={onNativeVideoStatus}
                />
              )}
            {activeBuffering && (
              <View style={styles.mediaBufferingOverlay} pointerEvents="none">
                <ActivityIndicator size="large" color={c.gold} />
              </View>
            )}
          </View>
        ) : (
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
                {/* Content-type symbol (hidden while buffering) */}
                {!activeBuffering && (
                  <Text style={[styles.artworkSymbol, { color: c.onPrimary }]}>{contentSymbol}</Text>
                )}
                {activeBuffering && (
                  <ActivityIndicator size="large" color={c.onPrimary} />
                )}
              </View>
            </View>
          </View>
        )}

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
          {credit ? (
            <Text style={[styles.trackArtist, { color: c.textMuted }]} numberOfLines={1}>
              {credit}
            </Text>
          ) : null}
        </View>

        {/* ── Mirror-processing placeholder (no media_url yet) ── */}
        {content && !content.media_url && content.mirror_status !== 'ready' && content.mirror_status !== 'not_applicable' && (
          <View style={{ alignItems: 'center', paddingVertical: 32, paddingHorizontal: 24 }}>
            <Text style={[{ color: c.textMuted, fontFamily: 'DMSans', textAlign: 'center', lineHeight: 18, fontSize: 13 }]}>
              {content.mirror_status === 'failed'
                ? 'The mirror for this content failed. Retry from the admin dashboard.'
                : 'Mirroring this track to the archive — usually takes 5–15 min. This row is only visible to admins.'}
            </Text>
          </View>
        )}

        {/* ── Progress Bar (hidden for YouTube or when media_url is absent) ── */}
        {!isYouTube && !!content?.media_url && (
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
        )}

        {/* ── Player Controls (hidden for YouTube or when media_url is absent) ── */}
        {!isYouTube && !!content?.media_url && (
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
            onPress={() => handleSeekBy(-15)}
            style={styles.seekControl}
            accessibilityLabel="Seek back 15 seconds"
          >
            <Text style={[styles.seekText, { color: c.textMuted }]}>−15s</Text>
          </TouchableOpacity>

          {/* Play / Pause */}
          <Animated.View style={{ transform: [{ scale: playBtnScale }] }}>
            <TouchableOpacity
              onPress={handlePlayPause}
              disabled={activeLoading}
              style={[
                styles.playBtn,
                {
                  backgroundColor: c.primary,
                  borderColor: c.gold,
                  shadowColor: c.gold,
                },
              ]}
              accessibilityLabel={
                activeLoading ? "Loading" : activeIsPlaying ? "Pause" : "Play"
              }
            >
              {activeLoading ? (
                <ActivityIndicator size="small" color={c.onPrimary} />
              ) : (
                <Text style={[styles.playBtnIcon, { color: c.onPrimary }]}>
                  {activeIsPlaying ? "▌▌" : "▶"}
                </Text>
              )}
            </TouchableOpacity>
          </Animated.View>

          {/* Seek forward 15s */}
          <TouchableOpacity
            onPress={() => handleSeekBy(15)}
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
        )}

        {/* ── Speed pill (hidden for YouTube or when media_url is absent) ── */}
        {!isYouTube && !!content?.media_url && (
        <View style={styles.speedRow}>
          <TouchableOpacity
            onPress={handleSpeedPress}
            style={[styles.speedPill, { borderColor: c.border }]}
            accessibilityLabel="Playback speed"
          >
            <Text style={[styles.speedPillText, { color: c.primary }]}>
              {activeSpeed % 1 === 0
                ? `${activeSpeed.toFixed(1)}×`
                : `${activeSpeed}×`}
            </Text>
          </TouchableOpacity>
        </View>
        )}

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

  // ── YouTube ──
  youtubeContainer: {
    width: '100%',
    marginBottom: 24,
    position: 'relative',
  },
  mediaBufferingOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    borderRadius: 8,
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

});
