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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { Content, Category } from '../../lib/types';
import { ContentCard } from '../../components/ContentCard';
import { useTheme } from '../../providers/ThemeProvider';
import { useI18n } from '../../providers/I18nProvider';

const PAGE_SIZE = 20;

// Map content type to a display kicker label
const TYPE_KICKER: Record<string, string> = {
  bayan: 'BAYANS · DISCOURSES',
  clip: 'CLIPS · HIGHLIGHTS',
  nazam: 'NAZAMS · POETRY',
  quran: 'QURAN · RECITATION',
  hamd_naat: 'HAMD & NAAT',
  book: 'BOOKS · TEXTS',
};

export default function CategoryListingScreen() {
  const { categoryId } = useLocalSearchParams<{ categoryId: string }>();
  const router = useRouter();
  const { theme } = useTheme();
  const { language } = useI18n();
  const insets = useSafeAreaInsets();

  const [category, setCategory] = useState<Category | null>(null);
  const [content, setContent] = useState<Content[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const c = theme.colors;

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

  const categoryNameArabic = category ? category.name_ur : '';
  const kicker = category ? (TYPE_KICKER[category.type] ?? 'CONTENT') : '';
  const contentCount = content.length;

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
        <Text style={[styles.emptyText, { color: c.textMuted }]}>
          No content available
        </Text>
      </View>
    );
  };

  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={c.primary} />
      </View>
    );
  };

  // Hero header rendered as FlatList ListHeaderComponent
  const renderHeader = () => (
    <View style={[styles.hero, { backgroundColor: c.primary, paddingTop: insets.top + 12 }]}>
      {/* Concentric circles decoration (top-right) */}
      <View style={styles.circlesWrap} pointerEvents="none">
        <View style={[styles.circle, styles.circle1, { borderColor: 'rgba(212,168,83,0.12)' }]} />
        <View style={[styles.circle, styles.circle2, { borderColor: 'rgba(212,168,83,0.08)' }]} />
        <View style={[styles.circle, styles.circle3, { borderColor: 'rgba(212,168,83,0.05)' }]} />
      </View>

      {/* Back button */}
      <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
        <Text style={[styles.backText, { color: c.gold }]}>{'‹ BACK'}</Text>
      </TouchableOpacity>

      {/* Kicker */}
      {kicker ? (
        <Text style={[styles.kicker, { color: c.gold }]}>{kicker}</Text>
      ) : null}

      {/* Category title */}
      <Text
        style={[
          styles.heroTitle,
          { color: '#f7f5f0' },
          language === 'ur' && { fontFamily: 'NastaleeqUrdu', writingDirection: 'rtl', textAlign: 'right', lineHeight: 52 },
        ]}
        numberOfLines={2}
      >
        {categoryName}
      </Text>

      {/* Arabic / Urdu name */}
      {categoryNameArabic ? (
        <Text style={[styles.heroArabic, { color: c.gold }]}>
          {categoryNameArabic}
        </Text>
      ) : null}

      {/* Count */}
      {!loading && (
        <Text style={[styles.heroCount, { color: 'rgba(247,245,240,0.55)' }]}>
          {contentCount} {contentCount === 1 ? 'ITEM' : 'ITEMS'}
        </Text>
      )}
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      {loading ? (
        <>
          {renderHeader()}
          <View style={styles.loaderWrapper}>
            <ActivityIndicator size="large" color={c.primary} />
          </View>
        </>
      ) : (
        <FlatList
          data={content}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={renderEmpty}
          ListFooterComponent={renderFooter}
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.3}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={c.primary}
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

  // Hero
  hero: {
    paddingHorizontal: 24,
    paddingBottom: 28,
    overflow: 'hidden',
    position: 'relative',
  },
  circlesWrap: {
    position: 'absolute',
    top: -60,
    right: -60,
  },
  circle: {
    position: 'absolute',
    borderWidth: 1,
    borderRadius: 999,
  },
  circle1: {
    width: 160,
    height: 160,
    top: 0,
    right: 0,
  },
  circle2: {
    width: 240,
    height: 240,
    top: -40,
    right: -40,
  },
  circle3: {
    width: 320,
    height: 320,
    top: -80,
    right: -80,
  },
  backBtn: {
    alignSelf: 'flex-start',
    marginBottom: 20,
    paddingVertical: 4,
  },
  backText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  kicker: {
    fontFamily: 'DMSans',
    fontSize: 10,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  heroTitle: {
    fontFamily: 'CrimsonPro-SemiBold',
    fontSize: 38,
    lineHeight: 44,
    marginBottom: 8,
  },
  heroArabic: {
    fontFamily: 'NastaleeqUrdu',
    fontSize: 24,
    lineHeight: 40,
    writingDirection: 'rtl',
    textAlign: 'left',
    marginBottom: 10,
  },
  heroCount: {
    fontFamily: 'DMSans',
    fontSize: 10,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginTop: 4,
  },

  // List
  loaderWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    paddingBottom: 80,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 80,
  },
  emptyText: {
    fontFamily: 'CrimsonPro-Italic',
    fontSize: 18,
  },
  footerLoader: {
    paddingVertical: 16,
    alignItems: 'center',
  },
});
