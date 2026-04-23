import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { Category, isBookContent } from '../../lib/types';
import { useTheme } from '../../providers/ThemeProvider';
import { useI18n } from '../../providers/I18nProvider';
import { useAuth } from '../../providers/AuthProvider';
import { useLatestContent } from '../../hooks/useContent';
import { useLiveSession } from '../../hooks/useLiveSession';
import { HomeTopBar } from '../../components/HomeTopBar';
import { BrandBanner } from '../../components/BrandBanner';
import { LiveStatusCard } from '../../components/LiveStatusCard';
import { QuickActionTile } from '../../components/QuickActionTile';
import { ContentCard } from '../../components/ContentCard';

export default function HomeScreen() {
  const { theme } = useTheme();
  const { language } = useI18n();
  const { user, isAdmin, isEditor } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const c = theme.colors;

  const { content: latest } = useLatestContent('bayan', 10);
  const { session: live } = useLiveSession();
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('categories')
        .select('*')
        .in('type', ['mamulat', 'bayan']);
      setCategories((data ?? []) as Category[]);
    })();
  }, []);

  const mamulatCategory = useMemo(
    () => categories.find((cat) => cat.type === 'mamulat'),
    [categories],
  );
  const liveCategory = useMemo(
    () =>
      categories.find(
        (cat) => cat.type === 'bayan' && (cat.name_en === 'Live Sessions' || cat.name_en === 'Live'),
      ),
    [categories],
  );

  const onMamulat = () => {
    if (mamulatCategory) router.push(`/library/${mamulatCategory.id}`);
    else router.push('/library');
  };
  const onLiveSessions = () => {
    if (live) {
      if (user?.id === live.started_by) router.push('/admin/go-live');
      else router.push('/player/live');
      return;
    }
    if (liveCategory) router.push(`/library/${liveCategory.id}`);
    else router.push('/library');
  };
  const onMajlisTimings = () => {
    if (isAdmin || isEditor) router.push('/admin/schedule');
    else router.push('/schedule');
  };

  return (
    <View style={[styles.root, { backgroundColor: c.background, paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        <HomeTopBar />
        <BrandBanner />
        <LiveStatusCard />

        <View style={styles.grid}>
          <View style={styles.gridRow}>
            <QuickActionTile icon="star-outline" label="Mamulat" onPress={onMamulat} accent />
            <QuickActionTile icon="radio-outline" label="Live Sessions" onPress={onLiveSessions} />
            <QuickActionTile
              icon="time-outline"
              label="Salah Timings"
              onPress={() => router.push('/coming-soon?feature=salah')}
            />
          </View>
          <View style={styles.gridRow}>
            <QuickActionTile icon="people-outline" label="Majlis Timings" onPress={onMajlisTimings} />
            <QuickActionTile
              icon="grid-outline"
              label="Explore Categories"
              onPress={() => router.push('/library')}
            />
            <QuickActionTile
              icon="chatbubble-ellipses-outline"
              label="Ask Hazrat"
              onPress={() => router.push('/coming-soon?feature=ask')}
            />
          </View>
        </View>

        <View style={styles.railHead}>
          <Text style={[styles.railTitle, { color: c.text }]}>Latest Bayanaat</Text>
          <TouchableOpacity onPress={() => router.push('/bayanaat')}>
            <Text style={[styles.more, { color: c.primary }]}>›</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={latest}
          horizontal
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}
          showsHorizontalScrollIndicator={false}
          renderItem={({ item }) => (
            <View style={{ width: 260 }}>
              <ContentCard
                content={item}
                onPress={() =>
                  isBookContent(item)
                    ? router.push(`/book/${item.id}`)
                    : router.push(`/player/${item.id}`)
                }
                language={language as 'en' | 'ur'}
              />
            </View>
          )}
          ListEmptyComponent={
            <View style={[styles.emptyCard, { borderColor: c.border }]}>
              <Text style={{ color: c.textMuted, fontFamily: 'CrimsonPro-Italic' }}>
                No bayanaat yet.
              </Text>
            </View>
          }
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  grid: {
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: 12,
  },
  gridRow: {
    flexDirection: 'row',
    gap: 10,
  },
  railHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  railTitle: { fontFamily: 'CrimsonPro-Medium', fontSize: 20 },
  more: { fontSize: 24 },
  emptyCard: {
    marginHorizontal: 16,
    padding: 24,
    borderWidth: 1,
    borderRadius: 12,
    alignItems: 'center',
  },
});
