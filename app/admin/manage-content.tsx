import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../providers/ThemeProvider';
import { useI18n } from '../../providers/I18nProvider';
import { useAuth } from '../../providers/AuthProvider';
import { supabase } from '../../lib/supabase';
import { Content, ContentType } from '../../lib/types';

const PAGE_SIZE = 20;

type FilterType = 'All' | ContentType;

interface FilterPill {
  key: FilterType;
  label: string;
}

function getTypeEmoji(type: ContentType): string {
  switch (type) {
    case 'bayan': return '🎙';
    case 'clip': return '✂️';
    case 'nazam': return '🎵';
    case 'quran': return '📖';
    case 'hamd_naat': return '🎶';
    case 'book': return '📚';
    default: return '📄';
  }
}

function getTypeColor(type: ContentType): string {
  switch (type) {
    case 'bayan': return '#047857';
    case 'clip': return '#7c3aed';
    case 'nazam': return '#0369a1';
    case 'quran': return '#b45309';
    case 'hamd_naat': return '#be185d';
    case 'book': return '#065f46';
    default: return '#52525b';
  }
}

function getTypeLabel(type: ContentType): string {
  switch (type) {
    case 'bayan': return 'Bayan';
    case 'clip': return 'Clip';
    case 'nazam': return 'Nazam';
    case 'quran': return 'Quran';
    case 'hamd_naat': return 'Hamd & Naat';
    case 'book': return 'Book';
    default: return type;
  }
}

function formatDuration(seconds: number | null): string {
  if (seconds == null) return '';
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `${mins} min`;
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  return rem > 0 ? `${hrs}h ${rem}m` : `${hrs}h`;
}

function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);

  if (diffSecs < 60) return 'just now';
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  if (diffWeeks < 5) return `${diffWeeks} week${diffWeeks > 1 ? 's' : ''} ago`;
  if (diffMonths < 12) return `${diffMonths} month${diffMonths > 1 ? 's' : ''} ago`;
  return `${diffYears} year${diffYears > 1 ? 's' : ''} ago`;
}

export default function ManageContentScreen() {
  const { theme } = useTheme();
  const { t } = useI18n();
  const { isAdmin, isEditor } = useAuth();
  const router = useRouter();
  const colors = theme.colors;

  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState<FilterType>('All');
  const [items, setItems] = useState<Content[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchValueRef = useRef(search);

  const filterPills: FilterPill[] = [
    { key: 'All', label: 'All' },
    { key: 'bayan', label: t('library.bayans') || 'Bayans' },
    { key: 'clip', label: t('library.clips') || 'Clips' },
    { key: 'nazam', label: t('library.nazams') || 'Nazams' },
    { key: 'quran', label: t('library.quran') || 'Quran' },
    { key: 'hamd_naat', label: t('library.hamdNaat') || 'Hamd & Naat' },
    { key: 'book', label: t('library.books') || 'Books' },
  ];

  const fetchContent = useCallback(
    async (opts: { reset?: boolean; searchQuery?: string; typeFilter?: FilterType } = {}) => {
      const { reset = false, searchQuery = searchValueRef.current, typeFilter = selectedType } = opts;

      if (loading && !reset) return;

      const currentPage = reset ? 0 : page;
      setLoading(true);

      let query = supabase
        .from('content')
        .select('*')
        .order('created_at', { ascending: false })
        .range(currentPage * PAGE_SIZE, currentPage * PAGE_SIZE + PAGE_SIZE - 1);

      if (typeFilter !== 'All') {
        query = query.eq('type', typeFilter);
      }

      if (searchQuery.trim().length > 0) {
        query = query.or(
          `title_en.ilike.%${searchQuery.trim()}%,title_ur.ilike.%${searchQuery.trim()}%`
        );
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching content:', error);
        setLoading(false);
        return;
      }

      const fetched = (data as Content[]) ?? [];

      if (reset) {
        setItems(fetched);
        setPage(1);
      } else {
        setItems((prev) => [...prev, ...fetched]);
        setPage((prev) => prev + 1);
      }

      setHasMore(fetched.length === PAGE_SIZE);
      setLoading(false);
    },
    [page, selectedType, loading]
  );

  // Initial load and when type filter changes
  useEffect(() => {
    setPage(0);
    setHasMore(true);
    fetchContent({ reset: true, typeFilter: selectedType, searchQuery: searchValueRef.current });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedType]);

  const handleSearchChange = (text: string) => {
    setSearch(text);
    searchValueRef.current = text;

    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }
    searchDebounceRef.current = setTimeout(() => {
      setPage(0);
      setHasMore(true);
      fetchContent({ reset: true, searchQuery: text, typeFilter: selectedType });
    }, 400);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    setPage(0);
    setHasMore(true);
    await fetchContent({ reset: true, searchQuery: search, typeFilter: selectedType });
    setRefreshing(false);
  };

  const handleLoadMore = () => {
    if (!loading && hasMore) {
      fetchContent({ reset: false });
    }
  };

  const handleEdit = (content: Content) => {
    router.push({ pathname: '/admin/upload', params: { editId: content.id } } as any);
  };

  const handleDelete = (content: Content) => {
    Alert.alert(
      'Delete Content',
      `Are you sure you want to delete "${content.title_en}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeletingId(content.id);
            const { error } = await supabase.from('content').delete().eq('id', content.id);
            setDeletingId(null);

            if (error) {
              Alert.alert('Error', 'Failed to delete content. Please try again.');
              console.error('Delete error:', error);
            } else {
              setItems((prev) => prev.filter((item) => item.id !== content.id));
            }
          },
        },
      ]
    );
  };

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingTop: 60,
      paddingBottom: 16,
      gap: 12,
    },
    headerTitle: { fontSize: 28, fontWeight: '700', color: colors.text },
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
    searchContainer: {
      marginHorizontal: 16,
      marginBottom: 12,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 14,
      gap: 8,
    },
    searchIcon: { fontSize: 16, color: colors.textMuted },
    searchInput: {
      flex: 1,
      fontSize: 15,
      color: colors.text,
      paddingVertical: 12,
    },
    filterRow: {
      paddingHorizontal: 16,
      paddingBottom: 12,
    },
    filterPill: {
      paddingHorizontal: 14,
      paddingVertical: 7,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      marginRight: 8,
    },
    filterPillActive: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    filterPillText: {
      fontSize: 13,
      fontWeight: '500',
      color: colors.textSecondary,
    },
    filterPillTextActive: {
      color: '#ffffff',
    },
    listContent: { paddingHorizontal: 16, paddingBottom: 40 },
    itemRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 12,
      marginBottom: 10,
      gap: 12,
    },
    thumbnail: {
      width: 52,
      height: 52,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    thumbnailEmoji: { fontSize: 24 },
    itemInfo: { flex: 1 },
    itemTitle: {
      fontSize: 14,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 4,
    },
    itemMeta: { fontSize: 12, color: colors.textMuted },
    actions: { flexDirection: 'row', gap: 8 },
    actionBtn: {
      width: 36,
      height: 36,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surface2,
      borderWidth: 1,
      borderColor: colors.border,
    },
    actionBtnDelete: {
      backgroundColor: '#fef2f2',
      borderColor: '#fecaca',
    },
    actionBtnText: { fontSize: 16 },
    footer: { paddingVertical: 20, alignItems: 'center' },
    emptyContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingTop: 60,
    },
    emptyText: { fontSize: 16, color: colors.textMuted, marginTop: 8 },
    emptyEmoji: { fontSize: 40 },
  });

  const renderItem = ({ item }: { item: Content }) => {
    const typeLabel = getTypeLabel(item.type);
    const durationStr = formatDuration(item.duration);
    const timeStr = relativeTime(item.created_at);

    const metaParts = [typeLabel, durationStr, timeStr].filter(Boolean);
    const metaLine = metaParts.join(' • ');

    const isDeleting = deletingId === item.id;

    return (
      <View style={styles.itemRow}>
        <View style={[styles.thumbnail, { backgroundColor: getTypeColor(item.type) + '22' }]}>
          <Text style={styles.thumbnailEmoji}>{getTypeEmoji(item.type)}</Text>
        </View>

        <View style={styles.itemInfo}>
          <Text style={styles.itemTitle} numberOfLines={2}>
            {item.title_en}
          </Text>
          <Text style={styles.itemMeta} numberOfLines={1}>
            {metaLine}
          </Text>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => handleEdit(item)}
            activeOpacity={0.7}
            accessibilityLabel="Edit"
          >
            <Text style={styles.actionBtnText}>✏️</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, styles.actionBtnDelete]}
            onPress={() => handleDelete(item)}
            activeOpacity={0.7}
            disabled={isDeleting}
            accessibilityLabel="Delete"
          >
            {isDeleting ? (
              <ActivityIndicator size="small" color="#ef4444" />
            ) : (
              <Text style={styles.actionBtnText}>🗑️</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderFooter = () => {
    if (!loading) return null;
    return (
      <View style={styles.footer}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  };

  const renderEmpty = () => {
    if (loading) return null;
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyEmoji}>📭</Text>
        <Text style={styles.emptyText}>No content found</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
          <Text style={{ fontSize: 28, color: colors.text }}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('admin.content') || 'Content'}</Text>
        <View style={styles.adminBadge}>
          <Text style={styles.adminBadgeText}>ADMIN</Text>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by title…"
          placeholderTextColor={colors.textMuted}
          value={search}
          onChangeText={handleSearchChange}
          returnKeyType="search"
          autoCapitalize="none"
          autoCorrect={false}
          clearButtonMode="while-editing"
        />
      </View>

      {/* Type Filter Pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterRow}
        contentContainerStyle={{ paddingRight: 8 }}
      >
        {filterPills.map((pill) => {
          const isActive = selectedType === pill.key;
          return (
            <TouchableOpacity
              key={pill.key}
              style={[styles.filterPill, isActive && styles.filterPillActive]}
              onPress={() => setSelectedType(pill.key)}
              activeOpacity={0.7}
            >
              <Text style={[styles.filterPillText, isActive && styles.filterPillTextActive]}>
                {pill.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Content List */}
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={[
          styles.listContent,
          items.length === 0 && { flex: 1 },
        ]}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}
