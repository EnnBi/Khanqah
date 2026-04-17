import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../providers/ThemeProvider';
import { Content, ContentType } from '../lib/types';
import { BilingualText } from './BilingualText';

// Calm Architecture: unified forest thumb with gold symbol per type.
const TYPE_SYMBOL: Record<ContentType, string> = {
  bayan:     '♪',
  clip:      '▸',
  nazam:     '✧',
  quran:     '☪',
  hamd_naat: '✦',
  book:      '❖',
};

const TYPE_LABEL: Record<ContentType, string> = {
  bayan:     'BAYAN',
  clip:      'CLIP',
  nazam:     'NAZAM',
  quran:     'QURAN',
  hamd_naat: 'HAMD & NAAT',
  book:      'BOOK',
};

interface ContentCardProps {
  content: Content;
  onPress: () => void;
  language: 'en' | 'ur';
}

export function ContentCard({ content, onPress, language }: ContentCardProps) {
  const { theme } = useTheme();
  const c = theme.colors;

  const symbol = TYPE_SYMBOL[content.type] ?? TYPE_SYMBOL.bayan;
  const typeLabel = TYPE_LABEL[content.type] ?? 'BAYAN';

  const durationMin = content.duration ? Math.round(content.duration / 60) : null;
  const metaParts: string[] = [];
  if (durationMin !== null) metaParts.push(`${durationMin} MIN`);
  metaParts.push(typeLabel);
  if (content.is_video) metaParts.push('VIDEO');

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View style={[styles.thumb, { backgroundColor: c.primary }]}>
        <Text style={[styles.symbol, { color: c.onPrimary }]}>{symbol}</Text>
      </View>

      <View style={styles.body}>
        <BilingualText
          en={content.title_en}
          ur={content.title_ur}
          style={[styles.title, { color: c.primary }]}
          numberOfLines={2}
        />
        <Text style={[styles.meta, { color: c.textMuted }]}>
          {metaParts.join(' · ')}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 10,
  },
  thumb: {
    width: 48,
    height: 48,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  symbol: {
    fontSize: 18,
  },
  body: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontFamily: 'CrimsonPro',
    fontSize: 17,
    lineHeight: 22,
    letterSpacing: -0.2,
  },
  meta: {
    fontFamily: 'DMSans-Medium',
    fontSize: 10,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: 4,
  },
});
