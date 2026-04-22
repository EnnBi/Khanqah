import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, TextInput, FlatList, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { Content, ContentType } from '../lib/types';
import { ContentCard } from './ContentCard';
import { useTheme } from '../providers/ThemeProvider';
import { useI18n } from '../providers/I18nProvider';

const PAGE_SIZE = 20;
const SANITIZE_RE = /[,%()\\]/g;

interface FilteredContentListProps {
  kicker: string;
  types: ContentType[];
}

export function FilteredContentList({ kicker, types }: FilteredContentListProps) {
  const { theme } = useTheme();
  const { language } = useI18n();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const c = theme.colors;

  const [content, setContent] = useState<Content[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    const t = setTimeout(
      () => setDebouncedQuery(query.trim().replace(SANITIZE_RE, '')),
      300,
    );
    return () => clearTimeout(t);
  }, [query]);

  const fetchContent = useCallback(
    async (fromStart = true) => {
      if (fromStart) setLoading(true);
      else setLoadingMore(true);
      const offset = fromStart ? 0 : content.length;

      let builder = supabase
        .from('content')
        .select('*')
        .in('type', types)
        .in('mirror_status', ['ready', 'not_applicable']);

      if (debouncedQuery) {
        const q = debouncedQuery;
        builder = builder.or(
          `title_en.ilike.%${q}%,title_ur.ilike.%${q}%,credit_en.ilike.%${q}%,credit_ur.ilike.%${q}%`,
        );
      }

      const { data } = await builder
        .order('created_at', { ascending: false })
        .range(offset, offset + PAGE_SIZE - 1);

      const rows = data ?? [];
      if (fromStart) setContent(rows);
      else setContent((prev) => [...prev, ...rows]);
      setHasMore(rows.length === PAGE_SIZE);

      if (fromStart) setLoading(false);
      else setLoadingMore(false);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [debouncedQuery, types.join(',')],
  );

  useEffect(() => {
    fetchContent(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQuery, types.join(',')]);

  const renderItem = ({ item }: { item: Content }) => (
    <ContentCard
      content={item}
      onPress={() =>
        item.type === 'book'
          ? router.push(`/book/${item.id}`)
          : router.push(`/player/${item.id}`)
      }
      language={language as 'en' | 'ur'}
    />
  );

  return (
    <View style={[styles.root, { backgroundColor: c.background, paddingTop: insets.top + 8 }]}>
      <View style={styles.hero}>
        <Text style={[styles.kicker, { color: c.textMuted }]}>{kicker}</Text>
        <Text style={[styles.count, { color: c.text }]}>
          {content.length} {content.length === 1 ? 'ITEM' : 'ITEMS'}
          {debouncedQuery ? ' MATCHING' : ''}
        </Text>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search title or credit…"
          placeholderTextColor={c.textMuted}
          style={[styles.search, { backgroundColor: c.surface2, color: c.text, borderColor: c.border }]}
          autoCapitalize="none"
          returnKeyType="search"
        />
      </View>
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={c.primary} />
        </View>
      ) : (
        <FlatList
          data={content}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          onEndReached={() => {
            if (!loadingMore && hasMore && !loading) fetchContent(false);
          }}
          onEndReachedThreshold={0.3}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120 }}
          ListFooterComponent={
            loadingMore ? <ActivityIndicator color={c.primary} style={{ marginVertical: 16 }} /> : null
          }
          ListEmptyComponent={
            <Text style={[styles.empty, { color: c.textMuted }]}>
              No content {debouncedQuery ? 'matches your search.' : 'yet.'}
            </Text>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  hero: { paddingHorizontal: 20, paddingBottom: 16 },
  kicker: {
    fontFamily: 'DMSans-Medium',
    fontSize: 10,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  count: {
    fontFamily: 'CrimsonPro-SemiBold',
    fontSize: 28,
    marginTop: 6,
    marginBottom: 12,
  },
  search: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    fontFamily: 'DMSans',
    fontSize: 14,
    borderWidth: 1,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: {
    textAlign: 'center',
    fontFamily: 'CrimsonPro-Italic',
    fontSize: 16,
    marginTop: 60,
  },
});
