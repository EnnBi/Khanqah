import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../providers/ThemeProvider';
import { Content, ContentType } from '../lib/types';
import { BilingualText } from './BilingualText';

const TYPE_CONFIG: Record<ContentType, { emoji: string; gradientStart: string; gradientEnd: string }> = {
  bayan:     { emoji: '🎙', gradientStart: '#047857', gradientEnd: '#059669' },
  clip:      { emoji: '🎥', gradientStart: '#1d4ed8', gradientEnd: '#3b82f6' },
  nazam:     { emoji: '🎶', gradientStart: '#7c3aed', gradientEnd: '#a78bfa' },
  quran:     { emoji: '📖', gradientStart: '#b45309', gradientEnd: '#d97706' },
  hamd_naat: { emoji: '🙌', gradientStart: '#be185d', gradientEnd: '#ec4899' },
  book:      { emoji: '📕', gradientStart: '#dc2626', gradientEnd: '#f87171' },
};

interface ContentCardProps {
  content: Content;
  onPress: () => void;
  language: 'en' | 'ur';
}

export function ContentCard({ content, onPress, language }: ContentCardProps) {
  const { theme } = useTheme();
  const config = TYPE_CONFIG[content.type] ?? TYPE_CONFIG.bayan;
  const durationMin = content.duration ? Math.round(content.duration / 60) : null;

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {/* Thumbnail */}
      <View style={[styles.thumbnail, { backgroundColor: config.gradientStart }]}>
        <Text style={styles.emoji}>{config.emoji}</Text>
      </View>

      {/* Info */}
      <View style={styles.info}>
        <BilingualText
          en={content.title_en}
          ur={content.title_ur}
          style={[styles.title, { color: theme.colors.text }]}
          numberOfLines={2}
        />
        <View style={styles.meta}>
          {durationMin !== null && (
            <Text style={[styles.metaText, { color: theme.colors.textMuted }]}>
              {durationMin} min
            </Text>
          )}
          {content.is_video && (
            <View style={[styles.videoBadge, { backgroundColor: theme.colors.surface2 }]}>
              <Text style={[styles.videoBadgeText, { color: theme.colors.textSecondary }]}>
                VIDEO
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Play icon */}
      <View style={[styles.playBtn, { backgroundColor: theme.colors.primary }]}>
        <Text style={styles.playIcon}>▶</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    marginHorizontal: 16,
    marginVertical: 6,
    overflow: 'hidden',
  },
  thumbnail: {
    width: 72,
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 28,
  },
  info: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
    lineHeight: 20,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metaText: {
    fontSize: 12,
  },
  videoBadge: {
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  videoBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  playBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  playIcon: {
    color: '#fff',
    fontSize: 14,
    marginLeft: 2,
  },
});
