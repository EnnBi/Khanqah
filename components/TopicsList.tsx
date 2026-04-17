import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { supabase } from '../lib/supabase';
import { Topic } from '../lib/types';
import { useTheme } from '../providers/ThemeProvider';
import { usePlayer } from '../hooks/usePlayer';
import { useI18n } from '../providers/I18nProvider';

interface TopicsListProps {
  contentId: string;
  currentPosition: number;
}

function formatTimestamp(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function TopicsList({ contentId, currentPosition }: TopicsListProps) {
  const { theme } = useTheme();
  const { seekTo } = usePlayer();
  const { language } = useI18n();
  const c = theme.colors;

  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!contentId) return;
    setLoading(true);
    supabase
      .from('topics')
      .select('*')
      .eq('content_id', contentId)
      .order('sort_order', { ascending: true })
      .then(({ data, error }) => {
        if (!error && data) {
          setTopics(data as Topic[]);
        }
        setLoading(false);
      });
  }, [contentId]);

  // Determine active topic: last topic whose timestamp is <= currentPosition
  const activeIndex = topics.reduce((best, topic, idx) => {
    if (topic.timestamp_seconds <= currentPosition) return idx;
    return best;
  }, -1);

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: c.surface }]}>
        <ActivityIndicator color={c.primary} style={{ padding: 16 }} />
      </View>
    );
  }

  if (topics.length === 0) return null;

  return (
    <View style={[styles.container, { backgroundColor: c.surface }]}>
      {topics.map((topic, idx) => {
        const isActive = idx === activeIndex;
        const isUrdu = language === 'ur';
        const title = isUrdu ? topic.title_ur : topic.title_en;
        return (
          <TouchableOpacity
            key={topic.id}
            style={[
              styles.item,
              idx < topics.length - 1 && { borderBottomWidth: 1, borderBottomColor: c.border },
              isActive && { backgroundColor: c.surface2 },
            ]}
            onPress={() => seekTo(topic.timestamp_seconds)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.topicTitle,
                { color: isActive ? c.gold : c.text },
                isUrdu && { fontFamily: 'NastaleeqUrdu', writingDirection: 'rtl', textAlign: 'right', lineHeight: 32 },
              ]}
              numberOfLines={2}
            >
              {title}
            </Text>
            <Text style={[styles.timestamp, { color: isActive ? c.gold : c.primary }]}>
              {formatTimestamp(topic.timestamp_seconds)}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  topicTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    marginRight: 12,
    lineHeight: 20,
  },
  timestamp: {
    fontSize: 13,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
});
