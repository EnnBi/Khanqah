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
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../providers/ThemeProvider';
import { useI18n } from '../../providers/I18nProvider';
import { useAuth } from '../../providers/AuthProvider';
import { supabase } from '../../lib/supabase';
import { Content, ContentType } from '../../lib/types';
import { type as typeP, font } from '../../lib/typography';
import { MirrorStatusChip } from '../../components/MirrorStatusChip';

const PAGE_SIZE = 20;

type FilterType = 'All' | ContentType;

interface FilterPill {
  key: FilterType;
  label: string;
}

function getTypeSymbol(type: ContentType): string {
  switch (type) {
    case 'bayan': return '◉';
    case 'clip': return '▶';
    case 'nazam': return '♪';
    case 'quran': return '◈';
    case 'hamd_naat': return '◆';
    case 'book': return '▬';
    default: return '◯';
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
  if (mins < 60) return `${mins} MIN`;
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  return rem > 0 ? `${hrs}H ${rem}M` : `${hrs}H`;
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

  if (diffSecs < 60) return 'JUST NOW';
  if (diffMins < 60) return `${diffMins} MIN AGO`;
  if (diffHours < 24) return `${diffHours} HOUR${diffHours > 1 ? 'S' : ''} AGO`;
  if (diffDays < 7) return `${diffDays} DAY${diffDays > 1 ? 'S' : ''} AGO`;
  if (diffWeeks < 5) return `${diffWeeks} WEEK${diffWeeks > 1 ? 'S' : ''} AGO`;
  if (diffMonths < 12) return `${diffMonths} MONTH${diffMonths > 1 ? 'S' : ''} AGO`;
  return `${diffYears} YEAR${diffYears > 1 ? 'S' : ''} AGO`;
}

export default function ManageContentScreen() {
  const { theme } = useTheme();
  const { t } = useI18n();
  const { isAdmin, isEditor } = useAuth();
  const router = useRouter();
  const c = theme.colors;

  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState<FilterType>('All');
  const [items, setItems] = useState<Content[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [failedRow, setFailedRow] = useState<Content | null>(null);

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
        const sanitized = searchQuery.trim().replace(/[,%()\\]/g, '');
        query = query.or(
          `title_en.ilike.%${sanitized}%,title_ur.ilike.%${sanitized}%`
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
    container: { flex: 1, backgroundColor: c.background },

    // ── Header ───────────────────────────────────────────────
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingTop: 60,
      paddingBottom: 20,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
    },
    backBtn: { paddingRight: 16 },
    backBtnText: {
      fontFamily: font.serif,
      fontSize: 22,
      color: c.primary,
      lineHeight: 26,
    },
    headerSpacer: { flex: 1 },
    headerLabel: {
      ...typeP.label,
      color: c.textMuted,
    },

    // ── Hero ─────────────────────────────────────────────────
    hero: {
      paddingHorizontal: 28,
      paddingTop: 24,
      paddingBottom: 20,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
    },
    heroKicker: {
      ...typeP.label,
      color: c.textMuted,
      marginBottom: 6,
    },
    heroTitle: {
      fontFamily: font.serif,
      fontSize: 28,
      color: c.primary,
      letterSpacing: -0.3,
      lineHeight: 34,
    },
    heroTitleItalic: {
      fontFamily: font.serifItalic,
    },

    // ── Search ───────────────────────────────────────────────
    searchWrap: {
      marginHorizontal: 16,
      marginTop: 16,
      marginBottom: 4,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingBottom: 10,
    },
    searchIcon: {
      fontFamily: font.sans,
      fontSize: 14,
      color: c.textMuted,
    },
    searchInput: {
      flex: 1,
      fontFamily: font.serif,
      fontSize: 16,
      color: c.text,
      paddingVertical: 4,
    },

    // ── Filter pills ─────────────────────────────────────────
    // A horizontal ScrollView inside a flex column on React Native Web has
    // no intrinsic height and collapses to a single text line (~16 px),
    // clipping the pills. flexGrow/flexShrink: 0 + minHeight keeps the
    // row tall enough for the pills' own padding.
    filterRow: {
      flexGrow: 0,
      flexShrink: 0,
      minHeight: 52,
      borderBottomWidth: 1,
      borderBottomColor: c.hairline,
      marginBottom: 6,
    },
    filterRowContent: {
      paddingHorizontal: 16,
      paddingRight: 24,
      paddingVertical: 10,
      alignItems: 'center',
      gap: 8,
    },
    filterPill: {
      paddingHorizontal: 14,
      paddingVertical: 7,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surface,
    },
    filterPillActive: {
      backgroundColor: c.primary,
      borderColor: c.primary,
    },
    filterPillText: {
      fontFamily: font.sansMedium,
      fontSize: 12,
      letterSpacing: 0.3,
      color: c.textMuted,
    },
    filterPillTextActive: {
      color: c.onPrimary,
      fontFamily: font.sansSemiBold,
    },

    // ── List ─────────────────────────────────────────────────
    listContent: { paddingHorizontal: 16, paddingBottom: 40 },
    itemRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: c.surface,
      borderRadius: 4,
      borderWidth: 1,
      borderColor: c.border,
      padding: 14,
      marginBottom: 10,
      gap: 14,
    },
    thumbBox: {
      width: 48,
      height: 48,
      backgroundColor: c.primary,
      borderRadius: 4,
      alignItems: 'center',
      justifyContent: 'center',
    },
    thumbSymbol: {
      fontFamily: font.serif,
      fontSize: 20,
      color: c.accent,
    },
    itemInfo: { flex: 1 },
    itemTitle: {
      fontFamily: font.serif,
      fontSize: 15,
      color: c.text,
      letterSpacing: -0.1,
      marginBottom: 4,
    },
    itemMeta: {
      ...typeP.meta,
      color: c.textMuted,
    },
    actions: { flexDirection: 'row', gap: 8 },
    actionBtn: {
      width: 34,
      height: 34,
      borderRadius: 4,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surface2,
    },
    actionBtnDelete: {
      backgroundColor: '#fef2f2',
      borderColor: '#fecaca',
    },
    actionBtnText: {
      fontFamily: font.sansMedium,
      fontSize: 14,
      color: c.textMuted,
    },
    actionBtnTextDelete: {
      fontSize: 16,
      color: '#ef4444',
    },

    // ── Footer / empty ───────────────────────────────────────
    footer: { paddingVertical: 20, alignItems: 'center' },
    emptyContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingTop: 60,
    },
    emptyText: {
      fontFamily: font.serifItalic,
      fontSize: 16,
      color: c.textMuted,
      marginTop: 8,
    },

    // ── Mirror-failed modal ───────────────────────────────────
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'flex-end',
    },
    modalSheet: {
      borderTopLeftRadius: 18,
      borderTopRightRadius: 18,
      padding: 24,
      paddingBottom: 36,
      gap: 12,
    },
    modalTitle: {
      fontFamily: 'CrimsonPro-SemiBold',
      fontSize: 20,
    },
    modalMessage: {
      fontFamily: 'DMSans',
      fontSize: 13,
      lineHeight: 18,
    },
    modalButtons: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: 24,
      marginTop: 8,
    },
    modalBtn: {
      paddingVertical: 8,
      paddingHorizontal: 4,
    },
    modalBtnText: {
      fontFamily: 'DMSans-SemiBold',
      fontSize: 12,
      letterSpacing: 1.5,
    },
  });

  const renderItem = ({ item }: { item: Content }) => {
    const typeLabel = getTypeLabel(item.type).toUpperCase();
    const durationStr = formatDuration(item.duration);
    const timeStr = relativeTime(item.created_at);

    const metaParts = [durationStr, timeStr, typeLabel].filter(Boolean);
    const metaLine = metaParts.join(' · ');

    const isDeleting = deletingId === item.id;

    return (
      <View style={styles.itemRow}>
        <View style={styles.thumbBox}>
          <Text style={styles.thumbSymbol}>{getTypeSymbol(item.type)}</Text>
        </View>

        <View style={styles.itemInfo}>
          <Text style={styles.itemTitle} numberOfLines={2}>
            {item.title_en}
          </Text>
          <MirrorStatusChip
            status={item.mirror_status}
            onRetryPress={
              item.mirror_status === 'failed'
                ? () => setFailedRow(item)
                : undefined
            }
          />
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
            <Text style={styles.actionBtnText}>✎</Text>
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
              <Text style={styles.actionBtnTextDelete}>×</Text>
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
        <ActivityIndicator color={c.primary} />
      </View>
    );
  };

  const renderEmpty = () => {
    if (loading) return null;
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No content found</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Minimal header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Text style={styles.backBtnText}>‹ Back</Text>
        </TouchableOpacity>
        <View style={styles.headerSpacer} />
        <Text style={styles.headerLabel}>MANAGE</Text>
      </View>

      {/* Hero */}
      <View style={styles.hero}>
        <Text style={styles.heroKicker}>MANAGE</Text>
        <Text style={styles.heroTitle}>
          Browse{' '}
          <Text style={styles.heroTitleItalic}>library</Text>
        </Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchWrap}>
        <Text style={styles.searchIcon}>◎</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by title..."
          placeholderTextColor={c.textMuted}
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
        contentContainerStyle={styles.filterRowContent}
      >
        {filterPills.map((pill) => {
          const isActive = selectedType === pill.key;
          return (
            <TouchableOpacity
              key={pill.key}
              style={[styles.filterPill, isActive && styles.filterPillActive]}
              onPress={() => setSelectedType(pill.key)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityState={{ selected: isActive }}
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
            tintColor={c.primary}
            colors={[c.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
      />

      <Modal
        visible={!!failedRow}
        transparent
        animationType="slide"
        onRequestClose={() => setFailedRow(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: c.surface }]}>
            <Text style={[styles.modalTitle, { color: c.text }]}>Mirror failed</Text>
            <Text style={[styles.modalMessage, { color: c.textMuted }]}>
              {failedRow?.mirror_error ?? 'Unknown error'}
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalBtn}
                onPress={() => setFailedRow(null)}
              >
                <Text style={[styles.modalBtnText, { color: c.textMuted }]}>CANCEL</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalBtn}
                onPress={async () => {
                  if (!failedRow) return;
                  const { error } = await supabase
                    .from('content')
                    .update({
                      mirror_status: 'pending',
                      mirror_attempts: 0,
                      mirror_error: null,
                      mirror_updated_at: new Date().toISOString(),
                    })
                    .eq('id', failedRow.id);
                  if (!error) {
                    setItems((prev) =>
                      prev.map((i) =>
                        i.id === failedRow.id
                          ? { ...i, mirror_status: 'pending', mirror_attempts: 0, mirror_error: null }
                          : i,
                      ),
                    );
                  }
                  setFailedRow(null);
                }}
              >
                <Text style={[styles.modalBtnText, { color: c.primary }]}>RETRY</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
