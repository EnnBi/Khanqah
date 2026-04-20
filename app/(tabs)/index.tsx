import React from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, TouchableOpacity, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../providers/ThemeProvider';
import { useI18n } from '../../providers/I18nProvider';
import { useLatestContent, useRecentLiveSessions } from '../../hooks/useContent';
import { useLiveSession } from '../../hooks/useLiveSession';
import { useNextScheduledSession } from '../../hooks/useScheduledSessions';
import { ContentCard } from '../../components/ContentCard';
import { NextLiveCard } from '../../components/NextLiveCard';
import { BilingualText } from '../../components/BilingualText';
import { type as typeP } from '../../lib/typography';

function formatIslamicDate(): string {
  // Simple locale-aware weekday + month
  const today = new Date();
  const weekday = today.toLocaleDateString('en-US', { weekday: 'long' });
  return `${weekday} · Latest discourses`;
}

export default function HomeScreen() {
  const { theme } = useTheme();
  const { language } = useI18n();
  const router = useRouter();
  const c = theme.colors;

  const { session: liveSession, loading: liveLoading } = useLiveSession();
  const { session: nextSession } = useNextScheduledSession();
  const { content: bayans, loading: bayansLoading } = useLatestContent('bayan', 5);
  const { content: clips, loading: clipsLoading } = useLatestContent('clip', 5);
  const { content: liveSessions, loading: liveSessionsLoading } = useRecentLiveSessions(5);

  const showNextSession = !liveSession && nextSession;
  const bayanCount = bayans.length;

  return (
    <View style={[styles.root, { backgroundColor: c.background }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Dark hero with concentric circles */}
        <View style={[styles.hero, { backgroundColor: c.headerBg }]}>
          <View style={[styles.circleA, { borderColor: 'rgba(212, 168, 83, 0.2)' }]} />
          <View style={[styles.circleB, { borderColor: 'rgba(212, 168, 83, 0.15)' }]} />

          <Text style={[styles.kicker, { color: c.accent }]}>{formatIslamicDate()}</Text>

          <View style={styles.brandBlock}>
            <Image
              source={require('../../assets/images/icon.png')}
              style={styles.brandMark}
              resizeMode="contain"
              accessibilityLabel="Ar-Rashid"
            />
            <Text style={styles.brandSubtitle}>Khanqah Maseeh-ul-Ummah</Text>
            <Text style={styles.brandUrdu}>خانقاہ مسیح الامت</Text>
          </View>
        </View>

        {/* Floating Live Card (negative margin over hero) */}
        {!liveLoading && liveSession && (
          <TouchableOpacity
            style={[styles.liveCard, { backgroundColor: c.background, borderColor: c.primary }]}
            onPress={() =>
              router.push({ pathname: '/modal', params: { type: 'live', id: liveSession.id } })
            }
            activeOpacity={0.85}
          >
            <View style={styles.liveHead}>
              <View style={[styles.liveDot, { backgroundColor: c.liveRed }]} />
              <Text style={[styles.liveLabel, { color: c.liveRed }]}>LIVE NOW</Text>
            </View>
            <BilingualText
              en={liveSession.title_en}
              ur={liveSession.title_ur}
              style={[styles.liveTitle, { color: c.primary }]}
              numberOfLines={1}
            />
            <View style={[styles.liveBtn, { backgroundColor: c.primary }]}>
              <Text style={styles.liveBtnText}>JOIN SESSION</Text>
            </View>
          </TouchableOpacity>
        )}

        {/* Next scheduled session (fallback) */}
        {showNextSession && nextSession && (
          <View style={styles.nextWrap}>
            <NextLiveCard session={nextSession} />
          </View>
        )}

        {/* Section: Recent live sessions */}
        {liveSessions.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: c.textMuted }]}>
              {String(liveSessions.length).padStart(2, '0')} · RECORDINGS
            </Text>
            <Text style={[styles.sectionTitle, { color: c.primary }]}>Recent live sessions</Text>

            {liveSessionsLoading ? (
              <ActivityIndicator color={c.primary} style={styles.loader} />
            ) : (
              liveSessions.map((item) => (
                <ContentCard
                  key={item.id}
                  content={item}
                  language={language as 'en' | 'ur'}
                  onPress={() =>
                    router.push({ pathname: '/modal', params: { type: 'content', id: item.id } })
                  }
                />
              ))
            )}
          </View>
        )}

        {/* Section: Recent bayans */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: c.textMuted }]}>
            {String(bayanCount).padStart(2, '0')} · DISCOURSES
          </Text>
          <Text style={[styles.sectionTitle, { color: c.primary }]}>Recent bayans</Text>

          {bayansLoading ? (
            <ActivityIndicator color={c.primary} style={styles.loader} />
          ) : bayans.length === 0 ? (
            <Text style={[styles.emptyText, { color: c.textMuted }]}>
              No bayans available yet.
            </Text>
          ) : (
            bayans.map((item) => (
              <ContentCard
                key={item.id}
                content={item}
                language={language as 'en' | 'ur'}
                onPress={() =>
                  router.push({ pathname: '/modal', params: { type: 'content', id: item.id } })
                }
              />
            ))
          )}
        </View>

        {/* Section: Short clips */}
        {clips.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: c.textMuted }]}>
              {String(clips.length).padStart(2, '0')} · MOMENTS
            </Text>
            <Text style={[styles.sectionTitle, { color: c.primary }]}>Short clips</Text>

            {clipsLoading ? (
              <ActivityIndicator color={c.primary} style={styles.loader} />
            ) : (
              clips.map((item) => (
                <ContentCard
                  key={item.id}
                  content={item}
                  language={language as 'en' | 'ur'}
                  onPress={() =>
                    router.push({ pathname: '/modal', params: { type: 'content', id: item.id } })
                  }
                />
              ))
            )}
          </View>
        )}

        <View style={styles.bottomPad} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 0 },

  // Hero section
  hero: {
    paddingTop: 60,
    paddingBottom: 48,
    paddingHorizontal: 28,
    overflow: 'hidden',
    position: 'relative',
  },
  circleA: {
    position: 'absolute',
    top: -60,
    right: -40,
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 1,
  },
  circleB: {
    position: 'absolute',
    top: -40,
    right: -20,
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 1,
  },
  kicker: {
    ...typeP.label,
    marginBottom: 18,
  },
  brandBlock: {
    alignItems: 'center',
  },
  brandMark: {
    width: 220,
    height: 220,
    marginBottom: 6,
  },
  brandSubtitle: {
    fontFamily: 'CrimsonPro-Italic',
    fontSize: 18,
    color: '#f7f5f0',
    marginBottom: 6,
  },
  brandUrdu: {
    fontFamily: 'NastaleeqUrdu',
    fontSize: 24,
    textAlign: 'center',
    writingDirection: 'rtl',
    color: '#d4a853',
    lineHeight: 40,
  },

  // Live card (floats over hero)
  liveCard: {
    marginTop: -24,
    marginHorizontal: 20,
    borderRadius: 12,
    borderWidth: 2,
    padding: 22,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  liveHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  liveLabel: {
    fontFamily: 'DMSans-SemiBold',
    fontSize: 10,
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  liveTitle: {
    fontFamily: 'CrimsonPro',
    fontSize: 22,
    letterSpacing: -0.3,
    lineHeight: 26,
  },
  liveBtn: {
    alignSelf: 'flex-start',
    marginTop: 14,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 6,
  },
  liveBtnText: {
    fontFamily: 'DMSans-Medium',
    color: '#f7f5f0',
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },

  nextWrap: {
    marginTop: -16,
    marginHorizontal: 20,
  },

  // Sections
  section: {
    paddingHorizontal: 28,
    paddingTop: 32,
  },
  sectionLabel: {
    fontFamily: 'DMSans-Medium',
    fontSize: 11,
    letterSpacing: 3,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  sectionTitle: {
    fontFamily: 'CrimsonPro-Italic',
    fontSize: 24,
    letterSpacing: -0.3,
    marginBottom: 20,
  },

  loader: { marginVertical: 16 },
  emptyText: {
    fontFamily: 'CrimsonPro-Italic',
    fontSize: 15,
    marginTop: 4,
  },
  bottomPad: {
    height: 80,
  },
});
