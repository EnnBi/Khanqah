import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Animated,
  Easing,
  Share,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Content } from '../../lib/types';
import { supabase } from '../../lib/supabase';
import { useLiveSession } from '../../hooks/useLiveSession';
import { usePlayer } from '../../hooks/usePlayer';
import { useSafeBack } from '../../hooks/useSafeBack';
import { useTheme } from '../../providers/ThemeProvider';
import { useI18n } from '../../providers/I18nProvider';

const ARTWORK_SIZE = 240;

function formatElapsed(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function formatStartedAt(isoString: string): string {
  const d = new Date(isoString);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function LivePlayerScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { language } = useI18n();
  const c = theme.colors;
  const safeBack = useSafeBack();

  const { session: liveSession, loading } = useLiveSession();
  const { isPlaying, playContent, pause, resume } = usePlayer();

  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [listenerCount, setListenerCount] = useState(0);
  const hasStartedPlayback = useRef(false);

  // Pulsing animation for live dot
  const pulseAnim = useRef(new Animated.Value(1)).current;
  // Scale animation for play button press
  const playBtnScale = useRef(new Animated.Value(1)).current;

  // Start continuous pulse loop
  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.6,
          duration: 800,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  // Calculate elapsed time from started_at
  useEffect(() => {
    if (!liveSession?.started_at) return;

    const startedAt = new Date(liveSession.started_at).getTime();

    const tick = () => {
      const now = Date.now();
      const diff = Math.max(0, Math.floor((now - startedAt) / 1000));
      setElapsedSeconds(diff);
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [liveSession?.started_at]);

  // Supabase presence — register this client as a listener and read the
  // live count. Both admin + all listeners subscribe to the same
  // `live:<id>` channel, so the count agrees on both sides.
  useEffect(() => {
    if (!liveSession?.id) {
      setListenerCount(0);
      return;
    }
    const clientKey = `listener-${Math.random().toString(36).slice(2)}`;
    const channel = supabase.channel(`live:${liveSession.id}`, {
      config: { presence: { key: clientKey } },
    });
    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const listeners = Object.keys(state).filter((k) => k !== 'broadcaster');
        setListenerCount(listeners.length);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ role: 'listener' });
        }
      });
    return () => { channel.unsubscribe(); };
  }, [liveSession?.id]);

  // Begin HLS playback when session is available
  useEffect(() => {
    if (!liveSession || hasStartedPlayback.current) return;
    hasStartedPlayback.current = true;

    const syntheticContent: Content = {
      id: liveSession.id,
      title_en: liveSession.title_en,
      title_ur: liveSession.title_ur,
      description_en: null,
      description_ur: null,
      type: 'bayan',
      category_id: '',
      media_url: liveSession.stream_url,
      thumbnail_url: null,
      duration: null,
      file_size: null,
      is_video: false,
      uploaded_by: liveSession.started_by,
      created_at: liveSession.started_at,
      updated_at: liveSession.started_at,
      mirror_status: 'not_applicable',
      mirror_format: null,
      mirror_source_url: null,
      mirror_error: null,
      mirror_attempts: 0,
      mirror_updated_at: liveSession.started_at,
    };

    playContent(syntheticContent);
  }, [liveSession]);

  const handleBack = async () => {
    await pause();
    safeBack();
  };

  const handlePlayPause = async () => {
    Animated.sequence([
      Animated.timing(playBtnScale, { toValue: 0.92, duration: 80, useNativeDriver: true }),
      Animated.timing(playBtnScale, { toValue: 1, duration: 120, useNativeDriver: true }),
    ]).start();
    if (isPlaying) {
      await pause();
    } else {
      await resume();
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: liveSession
          ? `Listening live: ${liveSession.title_en}`
          : 'Listening to a live session',
      });
    } catch {
      // ignore
    }
  };

  const title = liveSession
    ? language === 'ur'
      ? liveSession.title_ur
      : liveSession.title_en
    : '';

  // ── Loading state ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={[styles.screen, { backgroundColor: c.background }]}>
        <ActivityIndicator size="large" color={c.liveRed} style={{ flex: 1 }} />
      </View>
    );
  }

  // ── No live session ───────────────────────────────────────────────────────
  if (!liveSession) {
    return (
      <View style={[styles.screen, { backgroundColor: c.background }]}>
        <View style={[styles.emptyContainer, { paddingTop: insets.top + 16 }]}>
          <TouchableOpacity onPress={safeBack} style={styles.emptyBack}>
            <Text style={[styles.backBtnText, { color: c.primary }]}>‹ Back</Text>
          </TouchableOpacity>
          <View style={styles.emptyBody}>
            <Text style={[styles.emptySymbol, { color: c.liveRed }]}>◉</Text>
            <Text style={[styles.emptyTitle, { color: c.text, fontFamily: 'CrimsonPro' }]}>
              No Live Session
            </Text>
            <Text style={[styles.emptySubtitle, { color: c.textMuted, fontFamily: 'DMSans' }]}>
              There is no broadcast in progress right now.
            </Text>
          </View>
        </View>
      </View>
    );
  }

  // ── Live player ───────────────────────────────────────────────────────────
  return (
    <View style={[styles.screen, { backgroundColor: c.background }]}>
      <View
        style={[
          styles.container,
          { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 32 },
        ]}
      >
        {/* ── Header ── */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={handleBack}
            style={styles.headerBtn}
            accessibilityLabel="Back"
          >
            <Text style={[styles.backBtnText, { color: c.primary }]}>‹ Back</Text>
          </TouchableOpacity>

          {/* LIVE badge */}
          <View style={[styles.liveBadge, { backgroundColor: c.liveRed }]}>
            {/* Pulsing dot */}
            <Animated.View
              style={[
                styles.liveDotRing,
                {
                  borderColor: c.liveRed,
                  transform: [{ scale: pulseAnim }],
                  opacity: pulseAnim.interpolate({
                    inputRange: [1, 1.6],
                    outputRange: [0.6, 0],
                  }),
                },
              ]}
            />
            <View style={styles.liveDotInner} />
            <Text style={styles.liveBadgeText}>
              LIVE · {listenerCount} LISTENING
            </Text>
          </View>

          <TouchableOpacity style={styles.headerBtn} accessibilityLabel="Options">
            <Text style={[styles.optionsBtnText, { color: c.primary }]}>⋮</Text>
          </TouchableOpacity>
        </View>

        {/* ── Artwork ── */}
        <View style={styles.artworkContainer}>
          <View
            style={[
              styles.artwork,
              { backgroundColor: c.primary },
            ]}
          >
            {/* Low-opacity geometric decoration */}
            <Text style={styles.geometricPattern}>✦ ✧ ✦ ✧ ✦</Text>
            <Text style={styles.geometricPatternB}>✧ ✦ ✧ ✦ ✧</Text>

            {/* Red glowing orb in center */}
            <View style={styles.redOrbOuter}>
              <Animated.View
                style={[
                  styles.redOrbGlow,
                  {
                    transform: [{ scale: pulseAnim }],
                    opacity: pulseAnim.interpolate({
                      inputRange: [1, 1.6],
                      outputRange: [0.4, 0],
                    }),
                  },
                ]}
              />
              <View style={[styles.redOrb, { backgroundColor: c.liveRed }]} />
            </View>
          </View>
        </View>

        {/* ── Track info ── */}
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

        {/* ── Red hairline accent + elapsed timer ── */}
        <View style={styles.timerSection}>
          <View style={[styles.timerHairline, { backgroundColor: c.liveRed }]} />
          <Text
            style={[
              styles.timerText,
              { color: c.text, fontFamily: 'CrimsonPro' },
            ]}
          >
            {formatElapsed(elapsedSeconds)}
          </Text>
          <View style={[styles.timerHairline, { backgroundColor: c.liveRed }]} />
        </View>

        {/* ── Controls ── */}
        <View style={styles.controls}>
          {/* Volume */}
          <TouchableOpacity style={styles.sideBtn} accessibilityLabel="Volume">
            <Text style={[styles.sideBtnText, { color: c.textMuted }]}>◁)</Text>
            <Text style={[styles.sideBtnLabel, { color: c.textMuted }]}>VOLUME</Text>
          </TouchableOpacity>

          {/* Play / Pause — big red circle */}
          <Animated.View style={{ transform: [{ scale: playBtnScale }] }}>
            <TouchableOpacity
              onPress={handlePlayPause}
              style={[
                styles.playBtn,
                {
                  backgroundColor: c.liveRed,
                  shadowColor: c.liveRed,
                },
              ]}
              accessibilityLabel={isPlaying ? 'Pause' : 'Play'}
            >
              <Text style={styles.playBtnIcon}>{isPlaying ? '▌▌' : '▶'}</Text>
            </TouchableOpacity>
          </Animated.View>

          {/* Share */}
          <TouchableOpacity
            onPress={handleShare}
            style={styles.sideBtn}
            accessibilityLabel="Share"
          >
            <Text style={[styles.sideBtnText, { color: c.textMuted }]}>↗</Text>
            <Text style={[styles.sideBtnLabel, { color: c.textMuted }]}>SHARE</Text>
          </TouchableOpacity>
        </View>

        {/* ── Session info ── */}
        <View style={[styles.sessionInfo, { borderTopColor: c.hairline }]}>
          <Text
            style={[
              styles.sessionTitle,
              { color: c.text },
              language === 'ur' && { fontFamily: 'NastaleeqUrdu', writingDirection: 'rtl', textAlign: 'center', lineHeight: 32 },
            ]}
          >
            {title}
          </Text>
          {liveSession.started_at ? (
            <Text style={[styles.sessionStarted, { color: c.textMuted }]}>
              STARTED AT {formatStartedAt(liveSession.started_at)}
            </Text>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
  },

  // Empty state
  emptyContainer: {
    flex: 1,
    paddingHorizontal: 24,
  },
  emptyBack: {
    height: 36,
    justifyContent: 'center',
  },
  emptyBody: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  emptySymbol: {
    fontSize: 48,
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 26,
    lineHeight: 32,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
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
  optionsBtnText: {
    fontSize: 22,
    lineHeight: 26,
  },

  // LIVE badge
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 100,
  },
  liveDotRing: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    left: 8,
  },
  liveDotInner: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#ffffff',
  },
  liveBadgeText: {
    fontFamily: 'DMSans-SemiBold',
    fontSize: 10,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: '#ffffff',
  },

  // ── Artwork ──
  artworkContainer: {
    alignItems: 'center',
    marginBottom: 28,
  },
  artwork: {
    width: ARTWORK_SIZE,
    height: ARTWORK_SIZE,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 18,
    elevation: 10,
  },
  geometricPattern: {
    position: 'absolute',
    top: 28,
    fontSize: 13,
    letterSpacing: 18,
    color: 'rgba(212, 168, 83, 0.06)',
    fontFamily: 'DMSans',
  },
  geometricPatternB: {
    position: 'absolute',
    bottom: 28,
    fontSize: 13,
    letterSpacing: 18,
    color: 'rgba(212, 168, 83, 0.06)',
    fontFamily: 'DMSans',
  },
  redOrbOuter: {
    width: 72,
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
  },
  redOrbGlow: {
    position: 'absolute',
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#c23e3e',
  },
  redOrb: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },

  // ── Track info ──
  trackInfo: {
    alignItems: 'center',
    marginBottom: 24,
    gap: 8,
    paddingHorizontal: 8,
  },
  trackTitle: {
    fontFamily: 'CrimsonPro',
    fontSize: 26,
    lineHeight: 32,
    textAlign: 'center',
  },
  trackArtist: {
    fontFamily: 'DMSans',
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    textAlign: 'center',
  },

  // ── Timer ──
  timerSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 36,
  },
  timerHairline: {
    flex: 1,
    height: 1,
    maxWidth: 60,
  },
  timerText: {
    fontSize: 52,
    lineHeight: 60,
    letterSpacing: 4,
    fontVariant: ['tabular-nums'],
  },

  // ── Controls ──
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 40,
    marginBottom: 36,
  },
  sideBtn: {
    alignItems: 'center',
    gap: 5,
    minWidth: 52,
  },
  sideBtnText: {
    fontSize: 20,
    lineHeight: 24,
  },
  sideBtnLabel: {
    fontFamily: 'DMSans',
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  playBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 10,
  },
  playBtnIcon: {
    fontSize: 26,
    color: '#ffffff',
    marginLeft: 2,
  },

  // ── Session info ──
  sessionInfo: {
    alignItems: 'center',
    gap: 6,
    borderTopWidth: 1,
    paddingTop: 20,
  },
  sessionTitle: {
    fontFamily: 'CrimsonPro-Italic',
    fontSize: 20,
    lineHeight: 26,
    textAlign: 'center',
  },
  sessionStarted: {
    fontFamily: 'DMSans',
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
});
