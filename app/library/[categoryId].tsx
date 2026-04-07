import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { Content, Category } from '../../lib/types';
import { ContentCard } from '../../components/ContentCard';
import { useTheme } from '../../providers/ThemeProvider';
import { useI18n } from '../../providers/I18nProvider';

const PAGE_SIZE = 20;

export default function CategoryListingScreen() {
  const { categoryId } = useLocalSearchParams<{ categoryId: string }>();
  const router = useRouter();
  const { theme } = useTheme();
  const { language } = useI18n();

  const [category, setCategory] = useState<Category | null>(null);
  const [content, setContent] = useState<Content[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  // Fetch category name
  useEffect(() => {
    if (!categoryId) return;
    supabase
      .from('categories')
      .select('*')
      .eq('id', categoryId)
      .single()
      .then(({ data }) => {
        if (data) setCategory(data as Category);
      });
  }, [categoryId]);

  // Initial fetch
  const fetchContent = useCallback(
    async (fromStart = true) => {
      if (!categoryId) return;

      if (fromStart) {
        setLoading(true);
      } else {
        setLoadingMore(true);
      }

      const offset = fromStart ? 0 : content.length;

      const { data, error } = await supabase
        .from('content')
        .select('*')
        .eq('category_id', categoryId)
        .order('created_at', { ascending: false })
        .range(offset, offset + PAGE_SIZE - 1);

      if (!error && data) {
        if (fromStart) {
          setContent(data);
        } else {
          setContent((prev) => [...prev, ...data]);
        }
        setHasMore(data.length === PAGE_SIZE);
      }

      if (fromStart) setLoading(false);
      else setLoadingMore(false);
    },
    [categoryId, content.length],
  );

  useEffect(() => {
    fetchContent(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categoryId]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    if (!categoryId) { setRefreshing(false); return; }

    const { data, error } = await supabase
      .from('content')
      .select('*')
      .eq('category_id', categoryId)
      .order('created_at', { ascending: false })
      .range(0, PAGE_SIZE - 1);

    if (!error && data) {
      setContent(data);
      setHasMore(data.length === PAGE_SIZE);
    }
    setRefreshing(false);
  }, [categoryId]);

  const handleEndReached = useCallback(() => {
    if (!loadingMore && hasMore && !loading) {
      fetchContent(false);
    }
  }, [loadingMore, hasMore, loading, fetchContent]);

  const handlePress = useCallback(
    (item: Content) => {
      if (item.type === 'book') {
        router.push(`/book/${item.id}` as any);
      } else {
        router.push(`/player/${item.id}` as any);
      }
    },
    [router],
  );

  const categoryName = category
    ? language === 'ur'
      ? category.name_ur
      : category.name_en
    : '';

  const renderItem = ({ item }: { item: Content }) => (
    <ContentCard
      content={item}
      onPress={() => handlePress(item)}
      language={language as 'en' | 'ur'}
    />
  );

  const renderEmpty = () => {
    if (loading) return null;
    return (
      <View style={styles.emptyContainer}>
        <Text style={[styles.emptyText, { color: theme.colors.textMuted }]}>
          No content available
        </Text>
      </View>
    );
  };

  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={theme.colors.primary} />
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.headerBg }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {categoryName}
        </Text>
        <View style={styles.backBtn} />
      </View>

      {loading ? (
        <View style={styles.loaderWrapper}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
        <FlatList
          data={content}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          ListEmptyComponent={renderEmpty}
          ListFooterComponent={renderFooter}
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.3}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={theme.colors.primary}
            />
          }
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 56,
    paddingBottom: 16,
    paddingHorizontal: 12,
  },
  backBtn: {
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    fontSize: 32,
    color: '#ffffff',
    lineHeight: 36,
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
  },
  loaderWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    paddingTop: 8,
    paddingBottom: 80,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
  },
  emptyText: {
    fontSize: 16,
  },
  footerLoader: {
    paddingVertical: 16,
    alignItems: 'center',
  },
});
