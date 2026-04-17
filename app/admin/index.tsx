import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../providers/ThemeProvider';
import { useI18n } from '../../providers/I18nProvider';
import { useLiveSession } from '../../hooks/useLiveSession';
import { supabase } from '../../lib/supabase';
import { type as typeP, font } from '../../lib/typography';

interface Stats {
  totalContent: number | null;
  totalUsers: number | null;
  scheduledSessions: number | null;
}

interface NavCard {
  symbol: string;
  title: string;
  subtitle: string;
  route: string;
  isLive?: boolean;
}

export default function AdminDashboard() {
  const { theme } = useTheme();
  const { t } = useI18n();
  const router = useRouter();
  const { session: liveSession, loading: liveLoading } = useLiveSession();
  const c = theme.colors;

  const [stats, setStats] = useState<Stats>({
    totalContent: null,
    totalUsers: null,
    scheduledSessions: null,
  });
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      const [contentRes, usersRes, scheduledRes] = await Promise.all([
        supabase.from('content').select('*', { count: 'exact', head: true }),
        supabase.from('users').select('*', { count: 'exact', head: true }),
        supabase
          .from('scheduled_sessions')
          .select('*', { count: 'exact', head: true })
          .gte('scheduled_at', new Date().toISOString()),
      ]);

      setStats({
        totalContent: contentRes.count ?? 0,
        totalUsers: usersRes.count ?? 0,
        scheduledSessions: scheduledRes.count ?? 0,
      });
      setStatsLoading(false);
    }

    fetchStats();
  }, []);

  const isLive = !liveLoading && liveSession !== null;

  const navCards: NavCard[] = [
    {
      symbol: '◉',
      title: t('admin.goLive') || 'Go Live',
      subtitle: 'BROADCAST · RECORDING ENABLED',
      route: '/admin/go-live',
      isLive: true,
    },
    {
      symbol: '↑',
      title: t('admin.uploadContent') || 'Upload Content',
      subtitle: 'AUDIO · VIDEO · BOOKS',
      route: '/admin/upload',
    },
    {
      symbol: '≡',
      title: t('admin.manageContent') || 'Manage Content',
      subtitle: 'EDIT · DELETE · ORGANISE',
      route: '/admin/manage-content',
    },
    {
      symbol: '◷',
      title: t('admin.scheduleSessions') || 'Schedule Sessions',
      subtitle: 'UPCOMING · RECURRING',
      route: '/admin/schedule',
    },
    {
      symbol: '◈',
      title: t('admin.manageTeam') || 'Manage Team',
      subtitle: 'ADMINS · EDITORS',
      route: '/admin/team',
    },
    {
      symbol: '◯',
      title: t('admin.profile') || 'Profile',
      subtitle: 'ACCOUNT · SETTINGS',
      route: '/(tabs)/profile',
    },
    ...(__DEV__
      ? [
          {
            symbol: '🐛',
            title: 'Bug Reports',
            subtitle: 'LOCAL CAPTURES · DEV ONLY',
            route: '/admin/bug-reports',
          },
        ]
      : []),
  ];

  const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: c.background },
    scroll: { flex: 1 },

    // Hero
    hero: {
      backgroundColor: c.headerBg,
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
      borderColor: 'rgba(212, 168, 83, 0.2)',
    },
    circleB: {
      position: 'absolute',
      top: -40,
      right: -20,
      width: 160,
      height: 160,
      borderRadius: 80,
      borderWidth: 1,
      borderColor: 'rgba(212, 168, 83, 0.15)',
    },
    kicker: {
      ...typeP.label,
      color: c.accent,
      marginBottom: 18,
    },
    heroTitle: {
      fontFamily: font.serif,
      fontSize: 34,
      lineHeight: 38,
      letterSpacing: -0.5,
      color: '#f7f5f0',
    },
    heroTitleItalic: {
      fontFamily: font.serifItalic,
      color: c.accent,
    },
    heroArabic: {
      fontFamily: font.urdu,
      fontSize: 22,
      textAlign: 'right',
      writingDirection: 'rtl',
      color: c.accent,
      marginTop: 20,
      lineHeight: 36,
    },

    // Stats grid
    statsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      paddingHorizontal: 16,
      gap: 10,
      paddingTop: 28,
      paddingBottom: 4,
    },
    statCard: {
      flex: 1,
      minWidth: '45%',
      backgroundColor: c.surface,
      borderRadius: 4,
      padding: 18,
      borderWidth: 1,
      borderColor: c.border,
      alignItems: 'flex-start',
    },
    statNumber: {
      fontFamily: font.serif,
      fontSize: 32,
      color: c.primary,
      marginBottom: 4,
      lineHeight: 36,
    },
    statNumberLive: {
      fontFamily: font.serif,
      fontSize: 32,
      color: c.liveRed,
      marginBottom: 4,
      lineHeight: 36,
    },
    statLabel: {
      ...typeP.labelSmall,
      color: c.textMuted,
    },
    liveIndicatorRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    liveDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: c.liveRed,
    },

    // Section label
    sectionWrap: {
      paddingHorizontal: 28,
      paddingTop: 32,
      paddingBottom: 12,
    },
    sectionLabel: {
      ...typeP.label,
      color: c.textMuted,
      marginBottom: 6,
    },
    sectionSubtitle: {
      fontFamily: font.serifItalic,
      fontSize: 24,
      letterSpacing: -0.3,
      color: c.primary,
    },
    sectionSubtitleBold: {
      fontFamily: font.serifItalic,
      fontSize: 24,
      color: c.primary,
    },

    // Nav cards
    cardsContainer: {
      paddingHorizontal: 16,
      gap: 10,
      paddingBottom: 48,
    },
    navCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: c.surface,
      borderRadius: 4,
      borderWidth: 1,
      borderColor: c.border,
      padding: 16,
      gap: 14,
    },
    iconBox: {
      width: 44,
      height: 44,
      backgroundColor: c.primary,
      borderRadius: 4,
      alignItems: 'center',
      justifyContent: 'center',
    },
    iconBoxLive: {
      width: 44,
      height: 44,
      borderRadius: 4,
      alignItems: 'center',
      justifyContent: 'center',
      // gold-to-red gradient fallback — use linear overlay via layered views
      backgroundColor: '#c23e3e',
    },
    iconSymbol: {
      fontFamily: font.serif,
      fontSize: 20,
      color: c.accent,
    },
    iconSymbolLive: {
      fontFamily: font.serif,
      fontSize: 20,
      color: '#f7f5f0',
    },
    cardTextWrap: {
      flex: 1,
    },
    cardTitle: {
      fontFamily: font.serif,
      fontSize: 17,
      color: c.primary,
      letterSpacing: -0.2,
      marginBottom: 3,
    },
    cardSubtitle: {
      ...typeP.labelSmall,
      color: c.textMuted,
    },
    cardSubtitleLive: {
      ...typeP.labelSmall,
      color: c.liveRed,
    },
    livePulseDot: {
      width: 5,
      height: 5,
      borderRadius: 3,
      backgroundColor: c.liveRed,
      marginRight: 4,
    },
    liveSubRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    chevron: {
      fontFamily: font.serif,
      fontSize: 22,
      color: c.textMuted,
      lineHeight: 24,
    },
  });

  return (
    <View style={styles.root}>
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Dark forest hero */}
        <View style={styles.hero}>
          <View style={styles.circleA} />
          <View style={styles.circleB} />
          <Text style={styles.kicker}>ADMIN ACCESS</Text>
          <Text style={styles.heroTitle}>
            Manage the{' '}
            <Text style={styles.heroTitleItalic}>khanqah</Text>
          </Text>
          <Text style={styles.heroArabic}>انتظامیہ</Text>
        </View>

        {/* Stats 2x2 grid */}
        <View style={styles.statsGrid}>
          {/* Total Content */}
          <View style={styles.statCard}>
            {statsLoading ? (
              <ActivityIndicator color={c.primary} />
            ) : (
              <Text style={styles.statNumber}>{stats.totalContent ?? '—'}</Text>
            )}
            <Text style={styles.statLabel}>TOTAL CONTENT</Text>
          </View>

          {/* Total Users */}
          <View style={styles.statCard}>
            {statsLoading ? (
              <ActivityIndicator color={c.primary} />
            ) : (
              <Text style={styles.statNumber}>{stats.totalUsers ?? '—'}</Text>
            )}
            <Text style={styles.statLabel}>TOTAL USERS</Text>
          </View>

          {/* Live Status */}
          <View style={styles.statCard}>
            {liveLoading ? (
              <ActivityIndicator color={c.primary} />
            ) : isLive ? (
              <View style={styles.liveIndicatorRow}>
                <View style={styles.liveDot} />
                <Text style={styles.statNumberLive}>LIVE</Text>
              </View>
            ) : (
              <Text style={styles.statNumber}>Off</Text>
            )}
            <Text style={styles.statLabel}>LIVE STATUS</Text>
          </View>

          {/* Scheduled Sessions */}
          <View style={styles.statCard}>
            {statsLoading ? (
              <ActivityIndicator color={c.primary} />
            ) : (
              <Text style={styles.statNumber}>{stats.scheduledSessions ?? '—'}</Text>
            )}
            <Text style={styles.statLabel}>SCHEDULED</Text>
          </View>
        </View>

        {/* Section label */}
        <View style={styles.sectionWrap}>
          <Text style={styles.sectionLabel}>05 · MANAGEMENT</Text>
          <Text style={styles.sectionSubtitle}>
            Tools &{' '}
            <Text style={styles.sectionSubtitleBold}>actions</Text>
          </Text>
        </View>

        {/* Navigation cards */}
        <View style={styles.cardsContainer}>
          {navCards.map((card) => (
            <TouchableOpacity
              key={card.route}
              style={styles.navCard}
              activeOpacity={0.7}
              onPress={() => router.push(card.route as any)}
            >
              <View style={card.isLive ? styles.iconBoxLive : styles.iconBox}>
                <Text style={card.isLive ? styles.iconSymbolLive : styles.iconSymbol}>
                  {card.symbol}
                </Text>
              </View>

              <View style={styles.cardTextWrap}>
                <Text style={styles.cardTitle}>{card.title}</Text>
                {card.isLive ? (
                  <View style={styles.liveSubRow}>
                    <View style={styles.livePulseDot} />
                    <Text style={styles.cardSubtitleLive}>{card.subtitle}</Text>
                  </View>
                ) : (
                  <Text style={styles.cardSubtitle}>{card.subtitle}</Text>
                )}
              </View>

              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
