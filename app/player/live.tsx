import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Share,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Content } from '../../lib/types';
import { useLiveSession } from '../../hooks/useLiveSession';
import { usePlayer } from '../../hooks/usePlayer';
import { useTheme } from '../../providers/ThemeProvider';
import { useI18n } from '../../providers/I18nProvider';

const ARTWORK_SIZE = 180;

// Red palette overrides
const RED = {
  primary: '#dc2626',
  primaryDark: '#991b1b',
  deepDark: '#3b0a0a',
  deepDarkest: '#1a0505',
  muted: '#fca5a5',
  liveDot: '#ef4444',
  shadow: 'rgba(220,38,38,0.45)',
  pillBg: 'rgba(220,38,38,0.15)',
  pillBorder: 'rgba(220,38,38,0.35)',
};

function formatElapsed(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function LivePlayerScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { language } = useI18n();
  const c = theme.colors;

  const { session: liveSession, loading } = useLiveSession();
  const { isPlaying, playContent, pause, resume } = usePlayer();

  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const hasStartedPlayback = useRef(false);

  // Calculate elapsed time from started_at
  useEffect(() => {
    if (!liveSession?.started_at) return;

    const startedAt = new Date(liveSession.started_at).getTime();

    const tick = () => {
      const now = Date.now();
      const diff = Math.max(0, Math.floor((now - startedAt) / 1000));
      setElapsedSeconds(diff);
    };

    tick(); // immediate first tick
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [liveSession?.started_at]);

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
    };

    playContent(syntheticContent);
  }, [liveSession]);

  const handleBack = async () => {
    await pause();
    router.back();
  };

  const handlePlayPause = async () => {
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

  const bgTop = RED.deepDark;
  const bgBottom = theme.dark ? '#09090b' : '#1a0505';

  // ── Loading state ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={[styles.screen, { backgroundColor: c.background }]}>
        <ActivityIndicator size="large" color={RED.primary} style={{ flex: 1 }} />
      </View>
    );
  }

  // ── No live session ──────────────────────────────────────────────────────
  if (!liveSession) {
    return (
      <View style={[styles.screen, { backgroundColor: c.background }]}>
        <View style={[styles.emptyContainer, { paddingTop: insets.top + 16 }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.emptyBack}>
            <Text style={[styles.headerBtnText, { color: RED.primary }]}>‹</Text>
          </TouchableOpacity>
          <View style={styles.emptyBody}>
            <Text style={styles.emptyDot}>🔴</Text>
            <Text style={[styles.emptyTitle, { color: c.text }]}>No live session</Text>
            <Text style={[styles.emptySubtitle, { color: c.textMuted }]}>
              There is no broadcast in progress right now.
            </Text>
          </View>
        </View>
      </View>
    );
  }

  // ── Live player ──────────────────────────────────────────────────────────
  return (
    <View style={[styles.screen, { backgroundColor: bgBottom }]}>
      {/* Dark red gradient top half */}
      <View
        style={[
          StyleSheet.absoluteFillObject,
          { backgroundColor: bgTop, height: '55%', top: 0 },
        ]}
      />

      <View
        style={[
          styles.container,
          { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 32 },
        ]}
      >
        {/* ── Header ── */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.headerBtn} accessibilityLabel="Back">
            <Text style={[styles.headerBtnText, { color: RED.muted }]}>‹</Text>
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <View style={[styles.liveDot, { backgroundColor: RED.liveDot }]} />
            <Text style={styles.liveLabel}>LIVE</Text>
          </View>

          <TouchableOpacity style={styles.headerBtn} accessibilityLabel="Options">
            <Text style={[styles.headerBtnText, { color: RED.muted }]}>⋮</Text>
          </TouchableOpacity>
        </View>

        {/* ── Artwork ── */}
        <View style={styles.artworkContainer}>
          <View
            style={[
              styles.artwork,
              {
                backgroundColor: RED.deepDarkest,
                shadowColor: RED.shadow,
              },
            ]}
          >
            {/* Arabic pattern overlay */}
            <Text style={styles.arabicOverlay}>ﷲ</Text>
            {/* Mic emoji */}
            <Text style={styles.artworkEmoji}>🎙</Text>
          </View>
        </View>

        {/* ── Track info ── */}
        <View style={styles.trackInfo}>
          <Text style={[styles.trackTitle, { color: '#fff' }]} numberOfLines={2}>
            {title || '—'}
          </Text>
          <Text style={[styles.trackArtist, { color: RED.muted }]} numberOfLines={1}>
            Hazrat Mufti Abdur Rasheed Miftahi DB
          </Text>
        </View>

        {/* ── Live badge ── */}
        <View style={styles.liveBadgeRow}>
          <View
            style={[
              styles.liveBadge,
              { backgroundColor: RED.pillBg, borderColor: RED.pillBorder },
            ]}
          >
            <View style={[styles.liveBadgeDot, { backgroundColor: RED.liveDot }]} />
            <Text style={[styles.liveBadgeText, { color: RED.muted }]}>
              Live • 127 listening
            </Text>
          </View>
        </View>

        {/* ── Elapsed timer ── */}
        <View style={styles.timerRow}>
          <Text style={[styles.timerText, { color: '#fff' }]}>
            {formatElapsed(elapsedSeconds)}
          </Text>
        </View>

        {/* ── Controls ── */}
        <View style={styles.controls}>
          {/* Volume */}
          <TouchableOpacity style={styles.sideBtn} accessibilityLabel="Volume">
            <Text style={styles.sideBtnIcon}>🔊</Text>
          </TouchableOpacity>

          {/* Play / Pause */}
          <TouchableOpacity
            onPress={handlePlayPause}
            style={[styles.playBtn, { shadowColor: RED.shadow }]}
            accessibilityLabel={isPlaying ? 'Pause' : 'Play'}
          >
            {/* Red gradient approximated with a solid + overlay */}
            <View style={[StyleSheet.absoluteFillObject, styles.playBtnGradientTop]} />
            <View style={[StyleSheet.absoluteFillObject, styles.playBtnGradientBottom]} />
            <Text style={styles.playBtnIcon}>{isPlaying ? '⏸' : '▶'}</Text>
          </TouchableOpacity>

          {/* Share */}
          <TouchableOpacity onPress={handleShare} style={styles.sideBtn} accessibilityLabel="Share">
            <Text style={styles.sideBtnIcon}>🔀</Text>
          </TouchableOpacity>
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
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyBody: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  emptyDot: {
    fontSize: 48,
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 32,
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
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  liveLabel: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 2,
    color: '#ef4444',
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
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 14,
    overflow: 'hidden',
  },
  arabicOverlay: {
    position: 'absolute',
    fontSize: 120,
    color: 'rgba(255,100,100,0.08)',
    fontWeight: '400',
  },
  artworkEmoji: {
    fontSize: 64,
    zIndex: 1,
    color: '#fca5a5',
  },

  // Track info
  trackInfo: {
    alignItems: 'center',
    marginBottom: 20,
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

  // Live badge
  liveBadgeRow: {
    alignItems: 'center',
    marginBottom: 20,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 100,
    borderWidth: 1,
  },
  liveBadgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  liveBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.3,
  },

  // Timer
  timerRow: {
    alignItems: 'center',
    marginBottom: 40,
  },
  timerText: {
    fontSize: 52,
    fontWeight: '200',
    letterSpacing: 4,
    fontVariant: ['tabular-nums'],
  },

  // Controls
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 36,
  },
  sideBtn: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sideBtnIcon: {
    fontSize: 24,
  },
  playBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.55,
    shadowRadius: 12,
    elevation: 10,
    overflow: 'hidden',
  },
  playBtnGradientTop: {
    borderRadius: 36,
    backgroundColor: '#dc2626',
    top: 0,
    bottom: '50%',
  },
  playBtnGradientBottom: {
    borderRadius: 36,
    backgroundColor: '#991b1b',
    top: '50%',
    bottom: 0,
  },
  playBtnIcon: {
    fontSize: 28,
    color: '#fff',
    zIndex: 1,
  },
});
