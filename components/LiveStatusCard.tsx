import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../providers/ThemeProvider';
import { useLiveSession } from '../hooks/useLiveSession';
import { useNextScheduledSession } from '../hooks/useScheduledSessions';
import { useAuth } from '../providers/AuthProvider';

function relativeTime(iso: string): string {
  const now = Date.now();
  const t = new Date(iso).getTime();
  const delta = Math.max(0, t - now);
  const mins = Math.round(delta / 60000);
  if (mins < 5) return 'Starting soon';
  if (mins < 60) return `in ${mins} min`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `in ${hrs} hr`;
  const d = new Date(iso);
  return d.toLocaleString([], { weekday: 'short', hour: 'numeric', minute: '2-digit' });
}

export function LiveStatusCard() {
  const { theme } = useTheme();
  const c = theme.colors;
  const router = useRouter();
  const { isAdmin, isEditor } = useAuth();
  const { session: live } = useLiveSession();
  const { session: next } = useNextScheduledSession();

  let kicker = 'OFF AIR';
  let title = 'No sessions scheduled';
  let subtitle = '';
  let dotColor: string = c.textMuted;
  let onPress: (() => void) | undefined;

  if (live) {
    kicker = 'ON AIR';
    title = live.title_en || live.title_ur || 'Live session';
    subtitle = 'Tap to join';
    dotColor = c.liveRed;
    onPress = () => router.push('/player/live');
  } else if (next) {
    kicker = 'OFF AIR · NEXT MAJLIS';
    title = next.title_en || next.title_ur || 'Majlis';
    subtitle = relativeTime(next.scheduled_at);
    if (isAdmin || isEditor) onPress = () => router.push('/admin/schedule');
  }

  const Wrapper: any = onPress ? TouchableOpacity : View;

  return (
    <Wrapper
      onPress={onPress}
      activeOpacity={0.85}
      style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}
    >
      <View style={[styles.icon, { backgroundColor: c.surface2 }]}>
        <Ionicons name="calendar-outline" size={20} color={c.primary} />
      </View>
      <View style={styles.col}>
        <View style={styles.kickerRow}>
          <View style={[styles.dot, { backgroundColor: dotColor }]} />
          <Text style={[styles.kicker, { color: c.textMuted }]}>{kicker}</Text>
        </View>
        <Text style={[styles.title, { color: c.text }]} numberOfLines={1}>{title}</Text>
        {subtitle ? <Text style={[styles.sub, { color: c.textMuted }]}>{subtitle}</Text> : null}
      </View>
    </Wrapper>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  icon: {
    width: 42, height: 42, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  col: { flex: 1 },
  kickerRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  kicker: {
    fontFamily: 'DMSans-Medium',
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  title: {
    fontFamily: 'CrimsonPro-Medium',
    fontSize: 16,
    marginTop: 2,
  },
  sub: {
    fontFamily: 'DMSans',
    fontSize: 11,
    marginTop: 3,
  },
});
