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

const CATEGORY_SYMBOL: Record<ContentType, string> = {
  bayan:     '♪',
  clip:      '▸',
  nazam:     '✧',
  quran:     '☪',
  hamd_naat: '✦',
  book:      '❖',
  mamulat:   '❂',
};

export default function LibraryScreen() {
  const { theme } = useTheme();
  const { language, t } = useI18n();
  const router = useRouter();
  const c = theme.colors;
  const { categories, loading } = useCategories();

  const renderItem = ({ item }: { item: Category | null }) => {
    if (!item) return <View style={styles.tilePlaceholder} />;
    const icon = CATEGORY_SYMBOL[item.type] ?? '❖';
    return (
      <CategoryTile
        icon={icon}
        name={item.name_en}
        nameEn={item.name_en}
        nameUr={item.name_ur}
        count={0}
        type={item.type}
        onPress={() => router.push(`/library/${item.id}` as any)}
      />
    );
  };

  const data: (Category | null)[] =
    categories.length % 2 === 0 ? categories : [...categories, null];

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      {/* Hero header */}
      <View style={[styles.header, { backgroundColor: c.headerBg }]}>
        <Text style={[styles.kicker, { color: c.accent }]}>{t('libraryIndex.kicker')}</Text>
        <Text style={styles.title}>
          {t('libraryIndex.titleA')} <Text style={styles.titleItalic}>{t('libraryIndex.titleB')}</Text>
        </Text>
      </View>

      <SearchBar
        placeholder={t('library.search')}
        onPress={() => router.push('/library/search' as any)}
      />

      <Text style={[styles.sectionLabel, { color: c.textMuted }]}>
        {String(categories.length).padStart(2, '0')} · {t('libraryIndex.categories')}
      </Text>

      {loading ? (
        <View style={styles.loaderWrapper}>
          <ActivityIndicator size="large" color={c.primary} />
        </View>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item, index) => (item ? item.id : `filler-${index}`)}
          renderItem={renderItem}
          numColumns={2}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={styles.row}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingTop: 60,
    paddingBottom: 28,
    paddingHorizontal: 28,
  },
  kicker: {
    fontFamily: 'DMSans-Medium',
    fontSize: 11,
    letterSpacing: 3,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  title: {
    fontFamily: 'CrimsonPro',
    fontSize: 30,
    lineHeight: 34,
    letterSpacing: -0.5,
    color: '#f7f5f0',
  },
  titleItalic: {
    fontFamily: 'CrimsonPro-Italic',
    color: '#d4a853',
  },
  sectionLabel: {
    fontFamily: 'DMSans-Medium',
    fontSize: 11,
    letterSpacing: 3,
    textTransform: 'uppercase',
    paddingHorizontal: 28,
    marginTop: 24,
    marginBottom: 12,
  },
  loaderWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  grid: {
    paddingHorizontal: 22,
    paddingTop: 4,
    paddingBottom: 80,
  },
  row: {
    justifyContent: 'space-between',
  },
  tilePlaceholder: {
    flex: 1,
    margin: 6,
  },
});
