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

interface Stats {
  totalContent: number | null;
  totalUsers: number | null;
  scheduledSessions: number | null;
}

interface NavCard {
  emoji: string;
  title: string;
  route: string;
}

export default function AdminDashboard() {
  const { theme } = useTheme();
  const { t } = useI18n();
  const router = useRouter();
  const { session: liveSession, loading: liveLoading } = useLiveSession();
  const colors = theme.colors;

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
    { emoji: '🎙', title: t('admin.goLive') || 'Go Live', route: '/admin/go-live' },
    { emoji: '⬆', title: t('admin.uploadContent') || 'Upload Content', route: '/admin/upload' },
    { emoji: '📋', title: t('admin.manageContent') || 'Manage Content', route: '/admin/manage-content' },
    { emoji: '📅', title: t('admin.scheduleSessions') || 'Schedule Sessions', route: '/admin/schedule' },
    { emoji: '👥', title: t('admin.manageTeam') || 'Manage Team', route: '/admin/team' },
    { emoji: '👤', title: t('admin.profile') || 'Profile', route: '/(tabs)/profile' },
  ];

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingTop: 60,
      paddingBottom: 20,
      gap: 12,
    },
    headerTitle: {
      fontSize: 28,
      fontWeight: '700',
      color: colors.text,
    },
    adminBadge: {
      backgroundColor: colors.gold,
      borderRadius: 6,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    adminBadgeText: {
      fontSize: 11,
      fontWeight: '700',
      color: '#ffffff',
      letterSpacing: 1,
    },
    sectionTitle: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      paddingHorizontal: 20,
      marginBottom: 12,
      marginTop: 4,
    },
    statsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      paddingHorizontal: 16,
      gap: 10,
      marginBottom: 28,
    },
    statCard: {
      flex: 1,
      minWidth: '45%',
      backgroundColor: colors.surface,
      borderRadius: 14,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
    },
    statNumber: {
      fontSize: 28,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 4,
    },
    statLabel: {
      fontSize: 12,
      color: colors.textMuted,
      textAlign: 'center',
    },
    liveIndicator: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    liveDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: colors.liveRed,
    },
    liveText: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.liveRed,
    },
    offlineText: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.textMuted,
    },
    cardsContainer: {
      paddingHorizontal: 16,
      gap: 10,
      paddingBottom: 40,
    },
    navCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: 14,
      padding: 16,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 14,
    },
    navCardEmoji: {
      fontSize: 24,
      width: 36,
      textAlign: 'center',
    },
    navCardTitle: {
      flex: 1,
      fontSize: 16,
      fontWeight: '500',
      color: colors.text,
    },
    chevron: {
      fontSize: 18,
      color: colors.textMuted,
    },
  });

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('admin.title') || 'Admin'}</Text>
        <View style={styles.adminBadge}>
          <Text style={styles.adminBadgeText}>ADMIN</Text>
        </View>
      </View>

      {/* Quick Stats */}
      <Text style={styles.sectionTitle}>{t('admin.quickStats') || 'Quick Stats'}</Text>
      <View style={styles.statsGrid}>
        {/* Total Content */}
        <View style={styles.statCard}>
          {statsLoading ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <Text style={styles.statNumber}>{stats.totalContent ?? '—'}</Text>
          )}
          <Text style={styles.statLabel}>{t('admin.totalContent') || 'Total Content'}</Text>
        </View>

        {/* Total Users */}
        <View style={styles.statCard}>
          {statsLoading ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <Text style={styles.statNumber}>{stats.totalUsers ?? '—'}</Text>
          )}
          <Text style={styles.statLabel}>{t('admin.totalUsers') || 'Total Users'}</Text>
        </View>

        {/* Live Status */}
        <View style={styles.statCard}>
          {liveLoading ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <View style={styles.liveIndicator}>
              {isLive && <View style={styles.liveDot} />}
              <Text style={isLive ? styles.liveText : styles.offlineText}>
                {isLive ? 'LIVE' : 'Off'}
              </Text>
            </View>
          )}
          <Text style={styles.statLabel}>{t('admin.liveStatus') || 'Live Status'}</Text>
        </View>

        {/* Scheduled Sessions */}
        <View style={styles.statCard}>
          {statsLoading ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <Text style={styles.statNumber}>{stats.scheduledSessions ?? '—'}</Text>
          )}
          <Text style={styles.statLabel}>{t('admin.scheduledSessions') || 'Scheduled'}</Text>
        </View>
      </View>

      {/* Navigation Cards */}
      <Text style={styles.sectionTitle}>{t('admin.manage') || 'Manage'}</Text>
      <View style={styles.cardsContainer}>
        {navCards.map((card) => (
          <TouchableOpacity
            key={card.route}
            style={styles.navCard}
            activeOpacity={0.7}
            onPress={() => router.push(card.route as any)}
          >
            <Text style={styles.navCardEmoji}>{card.emoji}</Text>
            <Text style={styles.navCardTitle}>{card.title}</Text>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}
