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
import { useSearchContent } from '../../hooks/useContent';
import { Content } from '../../lib/types';
import { ContentCard } from '../../components/ContentCard';
import { useTheme } from '../../providers/ThemeProvider';
import { useI18n } from '../../providers/I18nProvider';

export default function SearchScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { language } = useI18n();

  const [query, setQuery] = useState('');
  const inputRef = useRef<TextInput>(null);

  const { content, loading } = useSearchContent(query);

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

  const renderItem = ({ item }: { item: Content }) => (
    <ContentCard
      content={item}
      onPress={() => handlePress(item)}
      language={language as 'en' | 'ur'}
    />
  );

  const renderEmpty = () => {
    if (loading || !query.trim()) return null;
    return (
      <View style={styles.emptyContainer}>
        <Text style={[styles.emptyText, { color: theme.colors.textMuted }]}>
          No results found
        </Text>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Search header */}
      <View style={[styles.header, { backgroundColor: theme.colors.headerBg }]}>
        <View
          style={[
            styles.inputWrapper,
            { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
          ]}
        >
          <Text style={[styles.searchIcon, { color: theme.colors.textMuted }]}>🔍</Text>
          <TextInput
            ref={inputRef}
            style={[styles.input, { color: theme.colors.text }]}
            placeholder="Search bayans, clips, books..."
            placeholderTextColor={theme.colors.textMuted}
            value={query}
            onChangeText={setQuery}
            autoFocus
            returnKeyType="search"
            clearButtonMode="while-editing"
            autoCorrect={false}
            autoCapitalize="none"
          />
        </View>
        <TouchableOpacity style={styles.cancelBtn} onPress={() => router.back()}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </View>

      {/* Loading indicator */}
      {loading && (
        <View style={styles.loaderRow}>
          <ActivityIndicator size="small" color={theme.colors.primary} />
        </View>
      )}

      {/* Results list */}
      <FlatList
        data={content}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 56,
    paddingBottom: 12,
    paddingHorizontal: 12,
    gap: 8,
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 22,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 8,
  },
  searchIcon: {
    fontSize: 15,
  },
  input: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 0,
  },
  cancelBtn: {
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  cancelText: {
    fontSize: 15,
    color: '#ffffff',
    fontWeight: '500',
  },
  loaderRow: {
    paddingVertical: 10,
    alignItems: 'center',
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
});
