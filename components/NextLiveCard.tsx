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

  const scheduledDate = new Date(session.scheduled_at);
  const dateStr = scheduledDate.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
  const timeStr = scheduledDate.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
      <Text style={styles.calendarEmoji}>📅</Text>
      <View style={styles.info}>
        <Text style={[styles.label, { color: theme.colors.textMuted }]}>NEXT LIVE</Text>
        <BilingualText
          en={session.title_en}
          ur={session.title_ur}
          style={[styles.title, { color: theme.colors.text }]}
          numberOfLines={2}
        />
        <Text style={[styles.dateTime, { color: theme.colors.gold }]}>
          {dateStr} · {timeStr}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
  },
  calendarEmoji: {
    fontSize: 32,
    marginRight: 14,
  },
  info: {
    flex: 1,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 4,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 21,
    marginBottom: 4,
  },
  dateTime: {
    fontSize: 13,
    fontWeight: '600',
  },
});
