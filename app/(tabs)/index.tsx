import React from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../providers/ThemeProvider';
import { useI18n } from '../../providers/I18nProvider';
import { useLatestContent } from '../../hooks/useContent';
import { useLiveSession } from '../../hooks/useLiveSession';
import { useNextScheduledSession } from '../../hooks/useScheduledSessions';
import { ContentCard } from '../../components/ContentCard';
import { LiveBanner } from '../../components/LiveBanner';
import { NextLiveCard } from '../../components/NextLiveCard';

export default function HomeScreen() {
  const { theme } = useTheme();
  const { language } = useI18n();
  const router = useRouter();

  const { session: liveSession, loading: liveLoading } = useLiveSession();
  const { session: nextSession } = useNextScheduledSession();
  const { content: bayans, loading: bayansLoading } = useLatestContent('bayan', 5);
  const { content: clips, loading: clipsLoading } = useLatestContent('clip', 5);

  const showNextSession = !liveSession && nextSession;

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      {/* Islamic Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.headerBg }]}>
        <Text style={styles.headerTitle}>Khanqah Maseeh-ul-Ummah</Text>
        <Text style={styles.headerArabic}>خانقاہ مسیح الامت</Text>
        <Text style={styles.headerSubtitle}>Mufti Saeed Ahmad Saeedi (db)</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Live Banner */}
        {!liveLoading && liveSession && (
          <LiveBanner
            session={liveSession}
            onPress={() => router.push({ pathname: '/modal', params: { type: 'live', id: liveSession.id } })}
          />
        )}

        {/* Next Scheduled Session */}
        {showNextSession && nextSession && <NextLiveCard session={nextSession} />}

        {/* Latest Bayans */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Latest Bayans
          </Text>
          {bayansLoading ? (
            <ActivityIndicator color={theme.colors.primary} style={styles.loader} />
          ) : bayans.length === 0 ? (
            <Text style={[styles.emptyText, { color: theme.colors.textMuted }]}>
              No bayans available yet.
            </Text>
          ) : (
            bayans.map((item) => (
              <ContentCard
                key={item.id}
                content={item}
                language={language as 'en' | 'ur'}
                onPress={() => router.push({ pathname: '/modal', params: { type: 'content', id: item.id } })}
              />
            ))
          )}
        </View>

        {/* Short Clips */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            Short Clips
          </Text>
          {clipsLoading ? (
            <ActivityIndicator color={theme.colors.primary} style={styles.loader} />
          ) : clips.length === 0 ? (
            <Text style={[styles.emptyText, { color: theme.colors.textMuted }]}>
              No clips available yet.
            </Text>
          ) : (
            clips.map((item) => (
              <ContentCard
                key={item.id}
                content={item}
                language={language as 'en' | 'ur'}
                onPress={() => router.push({ pathname: '/modal', params: { type: 'content', id: item.id } })}
              />
            ))
          )}
        </View>

        <View style={styles.bottomPad} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    paddingTop: 56,
    paddingBottom: 18,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  headerArabic: {
    color: '#bbf7d0',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 4,
    fontWeight: '500',
  },
  headerSubtitle: {
    color: '#d1fae5',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 2,
    opacity: 0.85,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 8,
  },
  section: {
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginHorizontal: 16,
    marginBottom: 8,
  },
  loader: {
    marginVertical: 16,
  },
  emptyText: {
    marginHorizontal: 16,
    marginVertical: 8,
    fontSize: 14,
  },
  bottomPad: {
    height: 32,
  },
});
