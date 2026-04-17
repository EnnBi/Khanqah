import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../providers/ThemeProvider';
import { ScheduledSession } from '../lib/types';
import { BilingualText } from './BilingualText';

interface NextLiveCardProps {
  session: ScheduledSession;
}

export function NextLiveCard({ session }: NextLiveCardProps) {
  const { theme } = useTheme();
  const c = theme.colors;

  const scheduledDate = new Date(session.scheduled_at);
  const dateStr = scheduledDate.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
  const timeStr = scheduledDate.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });

  return (
    <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.primary }]}>
      <View style={[styles.markerStripe, { backgroundColor: c.accent }]} />
      <View style={styles.inner}>
        <Text style={[styles.label, { color: c.accent }]}>NEXT LIVE · SCHEDULED</Text>
        <BilingualText
          en={session.title_en}
          ur={session.title_ur}
          style={[styles.title, { color: c.primary }]}
          numberOfLines={2}
        />
        <Text style={[styles.dateTime, { color: c.textMuted }]}>
          {dateStr} · {timeStr}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    borderRadius: 10,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 16,
  },
  markerStripe: {
    width: 4,
  },
  inner: {
    flex: 1,
    padding: 18,
  },
  label: {
    fontFamily: 'DMSans-SemiBold',
    fontSize: 10,
    letterSpacing: 2.5,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  title: {
    fontFamily: 'CrimsonPro',
    fontSize: 20,
    lineHeight: 24,
    letterSpacing: -0.3,
    marginBottom: 6,
  },
  dateTime: {
    fontFamily: 'DMSans',
    fontSize: 11,
    letterSpacing: 0.5,
  },
});
