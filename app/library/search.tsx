import React, { useCallback, useRef, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeBack } from '../../hooks/useSafeBack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSearchContent } from '../../hooks/useContent';
import { Content, isBookContent } from '../../lib/types';
import { ContentCard } from '../../components/ContentCard';
import { useTheme } from '../../providers/ThemeProvider';
import { useI18n } from '../../providers/I18nProvider';
import { Ionicons } from '@expo/vector-icons';

export default function SearchScreen() {
  const router = useRouter();
  const goBack = useSafeBack("/(tabs)/library");
  const { theme } = useTheme();
  const { language } = useI18n();
  const insets = useSafeAreaInsets();

  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const { content, loading } = useSearchContent(query);

  const c = theme.colors;

  const handlePress = useCallback(
    (item: Content) => {
      if (isBookContent(item)) {
        router.push(`/book/${item.id}` as any);
      } else {
        router.push(`/player/${item.id}` as any);
      }
    },
    [router],
  );

  const renderItem = ({ item }: { item: Content }) => (
    <ContentCard
      content={item}
      onPress={() => handlePress(item)}
      language={language as 'en' | 'ur'}
    />
  );

  const hasResults = content.length > 0;
  const hasQuery = query.trim().length > 0;

  const renderListHeader = () => {
    if (!hasQuery && !loading) return null;
    return (
      <View style={styles.resultsHeader}>
        {loading ? (
          <ActivityIndicator size="small" color={c.primary} style={styles.inlineLoader} />
        ) : (
          <>
            <Text style={[styles.resultsCount, { color: c.text }]}>
              {content.length}
              <Text style={[styles.resultsDot, { color: c.gold }]}> · </Text>
              {'RESULTS'}
            </Text>
            <Text style={[styles.resultsSubtitle, { color: c.textMuted }]}>
              Matching content
            </Text>
          </>
        )}
      </View>
    );
  };

  const renderEmpty = () => {
    if (loading) return null;
    if (hasQuery && !hasResults) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyTitle, { color: c.textMuted }]}>
            No results found
          </Text>
          <Text style={[styles.emptyHint, { color: c.textMuted }]}>
            TRY DIFFERENT KEYWORDS
          </Text>
        </View>
      );
    }
    if (!hasQuery) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyPlaceholder, { color: c.textMuted }]}>
            Search to begin...
          </Text>
          <View style={styles.tipsBlock}>
            <Text style={[styles.tipText, { color: c.textMuted }]}>TRY: BAYAN · QURAN · NAZAM</Text>
          </View>
        </View>
      );
    }
    return null;
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: c.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Top bar */}
      <View style={[styles.topBar, { paddingTop: insets.top + 12, backgroundColor: c.background }]}>
        <TouchableOpacity style={styles.backBtn} onPress={goBack} activeOpacity={0.7}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Ionicons name="chevron-back" size={18} color={c.gold} />
            <Text style={[styles.backText, { color: c.gold }]}> BACK</Text>
          </View>
        </TouchableOpacity>
        <Text style={[styles.screenLabel, { color: c.gold }]}>SEARCH</Text>
        <View style={styles.backBtn} />
      </View>

      {/* Heading */}
      <View style={styles.headingBlock}>
        <Text style={[styles.heading, { color: c.text }]}>
          {'Find your '}
          <Text style={[styles.headingItalic, { color: c.primary }]}>bayan</Text>
        </Text>
      </View>

      {/* Search input */}
      <View style={[
        styles.inputWrapper,
        {
          backgroundColor: c.surface2,
          borderBottomColor: focused ? c.gold : 'transparent',
        },
      ]}>
        <Text style={[styles.searchIcon, { color: focused ? c.gold : c.textMuted }]}>
          {'⌕'}
        </Text>
        <TextInput
          ref={inputRef}
          style={[styles.input, { color: c.text }]}
          placeholder="Search bayans, clips, books..."
          placeholderTextColor={c.textMuted}
          value={query}
          onChangeText={setQuery}
          autoFocus
          returnKeyType="search"
          clearButtonMode="while-editing"
          autoCorrect={false}
          autoCapitalize="none"
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
      </View>

      {/* Results list */}
      <FlatList
        data={content}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListHeaderComponent={renderListHeader}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // Top bar
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 4,
  },
  backBtn: {
    width: 60,
  },
  backText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  screenLabel: {
    fontFamily: 'DMSans-SemiBold',
    fontSize: 11,
    letterSpacing: 2.5,
    textTransform: 'uppercase',
    textAlign: 'center',
  },

  // Heading
  headingBlock: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 20,
  },
  heading: {
    fontFamily: 'CrimsonPro',
    fontSize: 34,
  },
  headingItalic: {
    fontFamily: 'CrimsonPro-Italic',
    fontSize: 34,
  },

  // Search input
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 24,
    borderRadius: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 2,
    marginBottom: 8,
    gap: 10,
  },
  searchIcon: {
    fontSize: 20,
    marginTop: -1,
  },
  input: {
    flex: 1,
    fontFamily: 'CrimsonPro',
    fontSize: 18,
    paddingVertical: 0,
  },

  // Results header
  resultsHeader: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
  },
  inlineLoader: {
    alignSelf: 'flex-start',
  },
  resultsCount: {
    fontFamily: 'DMSans-SemiBold',
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  resultsDot: {
    letterSpacing: 0,
  },
  resultsSubtitle: {
    fontFamily: 'CrimsonPro-Italic',
    fontSize: 14,
    marginTop: 2,
  },

  // List
  list: {
    paddingBottom: 80,
  },

  // Empty / placeholder states
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontFamily: 'CrimsonPro-Italic',
    fontSize: 20,
    marginBottom: 8,
  },
  emptyHint: {
    fontFamily: 'DMSans',
    fontSize: 10,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
  },
  emptyPlaceholder: {
    fontFamily: 'CrimsonPro-Italic',
    fontSize: 22,
    marginBottom: 20,
  },
  tipsBlock: {
    alignItems: 'center',
  },
  tipText: {
    fontFamily: 'DMSans',
    fontSize: 10,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
  },
});
