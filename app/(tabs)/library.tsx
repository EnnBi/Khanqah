import React from 'react';
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../providers/ThemeProvider';
import { useI18n } from '../../providers/I18nProvider';
import { useCategories } from '../../hooks/useCategories';
import { CategoryTile } from '../../components/CategoryTile';
import { SearchBar } from '../../components/SearchBar';
import { Category, ContentType } from '../../lib/types';

const CATEGORY_ICONS: Record<ContentType, string> = {
  bayan:     '🎙',
  clip:      '🎥',
  nazam:     '🎶',
  quran:     '📖',
  hamd_naat: '🙌',
  book:      '📕',
};

export default function LibraryScreen() {
  const { theme } = useTheme();
  const { language, t } = useI18n();
  const router = useRouter();
  const { categories, loading } = useCategories();

  const renderItem = ({ item, index }: { item: Category | null; index: number }) => {
    // Filler item for odd-length grids
    if (!item) {
      return <View style={styles.tilePlaceholder} />;
    }

    const name = language === 'ur' ? item.name_ur : item.name_en;
    const icon = CATEGORY_ICONS[item.type] ?? '📂';

    return (
      <CategoryTile
        icon={icon}
        name={name}
        count={0}
        type={item.type}
        onPress={() => router.push(`/library/${item.id}` as any)}
      />
    );
  };

  // Pad to even length so the last row fills correctly
  const data: (Category | null)[] =
    categories.length % 2 === 0
      ? categories
      : [...categories, null];

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.colors.headerBg }]}>
        <Text style={styles.headerTitle}>{t('library')}</Text>
      </View>

      {/* Search bar */}
      <SearchBar
        placeholder={t('search_placeholder') || 'Search bayans, clips, books…'}
        onPress={() => router.push('/library/search' as any)}
      />

      {/* Category grid */}
      {loading ? (
        <View style={styles.loaderWrapper}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item, index) => (item ? item.id : `filler-${index}`)}
          renderItem={renderItem}
          numColumns={2}
          contentContainerStyle={[styles.grid, { paddingBottom: 80 }]}
          columnWrapperStyle={styles.row}
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
    paddingTop: 56,
    paddingBottom: 16,
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
  },
  loaderWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  grid: {
    paddingHorizontal: 10,
    paddingTop: 4,
  },
  row: {
    justifyContent: 'space-between',
  },
  tilePlaceholder: {
    flex: 1,
    margin: 6,
  },
});
