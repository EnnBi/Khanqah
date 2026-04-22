# Khanqah Home Redesign + Navigation Rework — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebrand the app to Khanqah, swap in the new calligraphy logo, and rebuild the home page around a banner + live card + 6-tile grid + latest-bayanaat rail, sitting on a floating 5-tab pill bar with Profile moved to a top-right icon.

**Architecture:** Keep `app/(tabs)/` routing group; swap which screens live inside it (Home + 4 content-type tab screens). Extract the home blocks into small focused components so each file stays small. Profile, library, schedule, coming-soon move to flat routes. Theme tokens stay unchanged.

**Tech Stack:** Expo SDK 54 + React Native Web + expo-router + Supabase. Font assets already bundled. Calm Architecture theme tokens in `lib/theme.ts` (unchanged).

---

## File Structure

**Create:**
- `components/HomeTopBar.tsx`
- `components/BrandBanner.tsx`
- `components/LiveStatusCard.tsx`
- `components/QuickActionTile.tsx`
- `components/FilteredContentList.tsx`
- `app/(tabs)/bayanaat.tsx`
- `app/(tabs)/clips.tsx`
- `app/(tabs)/ashaar.tsx`
- `app/(tabs)/books.tsx`
- `app/library.tsx` (flat copy of old `app/(tabs)/library.tsx` contents)
- `app/profile.tsx` (rewrite of old tab profile)
- `app/schedule.tsx` (read-only for non-admins)
- `app/coming-soon.tsx`

**Modify:**
- `app.json` — name "Ar-Rashid" → "Khanqah"
- `assets/images/icon.png`, `adaptive-icon.png`, `splash-icon.png`, `favicon.png` — replace with Khanqah logo
- `app/(auth)/login.tsx` — ensure it references the new icon
- `app/(tabs)/_layout.tsx` — new tab set
- `app/(tabs)/index.tsx` — full rewrite
- `components/CustomTabBar.tsx` — floating pill style

**Delete from tab set (but don't rm the files yet):**
- `app/(tabs)/library.tsx` becomes unused (mirror content lives at `app/library.tsx`)
- `app/(tabs)/collection.tsx` becomes unused (can be deleted after wiring)
- `app/(tabs)/profile.tsx` becomes unused (same)

---

## Task 1: Brand rename + icon swap

**Files:**
- Modify: `app.json`
- Modify: `assets/images/icon.png`, `adaptive-icon.png`, `splash-icon.png`, `favicon.png`

- [ ] **Step 1: Update app name**

```bash
# In app.json change expo.name from "Ar-Rashid" to "Khanqah"
```

File diff: `"name": "Ar-Rashid"` → `"name": "Khanqah"`.

- [ ] **Step 2: Swap icon assets**

```bash
cp assets/images/khanqah-logo.png assets/images/icon.png
cp assets/images/khanqah-logo.png assets/images/adaptive-icon.png
cp assets/images/khanqah-logo.png assets/images/splash-icon.png
sips -z 48 48 assets/images/khanqah-logo.png --out assets/images/favicon.png
```

- [ ] **Step 3: Commit**

```bash
git add app.json assets/images/
git commit -m "feat(brand): rename app to Khanqah, swap in new calligraphy icons"
```

---

## Task 2: HomeTopBar component

**Files:**
- Create: `components/HomeTopBar.tsx`

- [ ] **Step 1: Write the component**

```tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../providers/ThemeProvider';
import { useI18n } from '../providers/I18nProvider';
import { useAuth } from '../providers/AuthProvider';

export function HomeTopBar() {
  const { theme } = useTheme();
  const c = theme.colors;
  const router = useRouter();
  const { language, setLanguage } = useI18n();
  const { user, isAdmin, isEditor } = useAuth();
  const showAdmin = !!user && (isAdmin || isEditor);

  const toggleLanguage = () => setLanguage(language === 'ur' ? 'en' : 'ur');

  return (
    <View style={styles.bar}>
      <TouchableOpacity style={styles.side} onPress={toggleLanguage} activeOpacity={0.7}>
        <Ionicons name="globe-outline" size={16} color={c.text} />
        <Text style={[styles.langText, { color: c.text }]}>
          {language === 'ur' ? 'English' : 'اردو'}
        </Text>
      </TouchableOpacity>
      <View style={styles.center} />
      <View style={styles.side}>
        {showAdmin && (
          <TouchableOpacity
            style={[styles.iconBtn, { backgroundColor: c.surface, borderColor: c.border }]}
            onPress={() => router.push('/admin')}
            activeOpacity={0.7}
            accessibilityLabel="Admin"
          >
            <Ionicons name="shield-checkmark-outline" size={20} color={c.primary} />
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.iconBtn, { backgroundColor: c.surface, borderColor: c.border }]}
          onPress={() => router.push('/profile')}
          activeOpacity={0.7}
          accessibilityLabel="Profile"
        >
          <Ionicons name="person-outline" size={20} color={c.primary} />
          {user && <View style={[styles.dot, { backgroundColor: c.accent, borderColor: c.surface }]} />}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  side: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  center: { flex: 1 },
  langText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  iconBtn: {
    marginLeft: 'auto',
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    position: 'relative',
  },
  dot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 2,
  },
});
```

Note: the right-side `side` view is flex-row and both icons right-align via the shared `iconBtn.marginLeft: auto`. When only the profile shows, it still right-aligns. Adjust if the order is wrong during smoke.

- [ ] **Step 2: Commit**

```bash
git add components/HomeTopBar.tsx
git commit -m "feat(home): HomeTopBar component"
```

---

## Task 3: BrandBanner component

**Files:**
- Create: `components/BrandBanner.tsx`

- [ ] **Step 1: Write the component**

```tsx
import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';

export function BrandBanner() {
  return (
    <View style={styles.banner}>
      <View style={[styles.circle, styles.circleA]} pointerEvents="none" />
      <View style={[styles.circle, styles.circleB]} pointerEvents="none" />
      <Image
        source={require('../assets/images/khanqah-logo.png')}
        style={styles.logo}
        resizeMode="contain"
        accessibilityLabel="Khanqah Maseeh-ul-Ummah"
      />
      <View style={styles.subtitleRow}>
        <View style={styles.rule} />
        <Text style={styles.ornament}>◆</Text>
        <Text style={styles.subtitle} numberOfLines={1}>Khanqah Maseeh-ul-Ummah</Text>
        <Text style={styles.ornament}>◆</Text>
        <View style={styles.rule} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 14,
    paddingVertical: 24,
    paddingHorizontal: 18,
    backgroundColor: '#0f2e24',
    borderRadius: 16,
    alignItems: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  circle: {
    position: 'absolute',
    borderRadius: 999,
    borderWidth: 1,
  },
  circleA: {
    width: 180, height: 180, top: -60, right: -50,
    borderColor: 'rgba(212, 168, 83, 0.18)',
  },
  circleB: {
    width: 130, height: 130, top: -40, right: -30,
    borderColor: 'rgba(212, 168, 83, 0.28)',
  },
  logo: {
    width: 120,
    height: 170,
  },
  subtitleRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: '100%',
  },
  rule: {
    width: 18,
    height: 1,
    backgroundColor: '#d4a853',
    opacity: 0.6,
    marginHorizontal: 6,
  },
  ornament: {
    fontSize: 9,
    color: '#d4a853',
    opacity: 0.8,
    marginHorizontal: 2,
  },
  subtitle: {
    fontFamily: 'CrimsonPro-Italic',
    fontSize: 15,
    color: '#e8c672',
    letterSpacing: 0.2,
    marginHorizontal: 4,
  },
});
```

- [ ] **Step 2: Commit**

```bash
git add components/BrandBanner.tsx
git commit -m "feat(home): BrandBanner component"
```

---

## Task 4: LiveStatusCard component

**Files:**
- Create: `components/LiveStatusCard.tsx`

- [ ] **Step 1: Write the component**

```tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../providers/ThemeProvider';
import { useLiveSession } from '../hooks/useLiveSession';
import { useNextScheduledSession } from '../hooks/useScheduledSessions';
import { useAuth } from '../providers/AuthProvider';

function relativeTime(iso: string): string {
  const now = Date.now();
  const t = new Date(iso).getTime();
  const delta = Math.max(0, t - now);
  const mins = Math.round(delta / 60000);
  if (mins < 5) return 'Starting soon';
  if (mins < 60) return `in ${mins} min`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `in ${hrs} hr`;
  const d = new Date(iso);
  return d.toLocaleString([], { weekday: 'short', hour: 'numeric', minute: '2-digit' });
}

export function LiveStatusCard() {
  const { theme } = useTheme();
  const c = theme.colors;
  const router = useRouter();
  const { isAdmin, isEditor } = useAuth();
  const { session: live } = useLiveSession();
  const { session: next } = useNextScheduledSession();

  let kicker = 'OFF AIR';
  let title = 'No sessions scheduled';
  let subtitle = '';
  let dotColor = c.textMuted;
  let onPress: (() => void) | undefined;

  if (live) {
    kicker = 'ON AIR';
    title = live.title_en || live.title_ur || 'Live session';
    subtitle = 'Tap to join';
    dotColor = c.liveRed;
    onPress = () => router.push('/player/live');
  } else if (next) {
    kicker = 'OFF AIR · NEXT MAJLIS';
    title = next.title_en || next.title_ur || 'Majlis';
    subtitle = relativeTime(next.scheduled_at);
    if (isAdmin || isEditor) onPress = () => router.push('/admin/schedule');
  }

  const Wrapper: any = onPress ? TouchableOpacity : View;

  return (
    <Wrapper
      onPress={onPress}
      activeOpacity={0.85}
      style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}
    >
      <View style={[styles.icon, { backgroundColor: c.surface2 }]}>
        <Ionicons name="calendar-outline" size={20} color={c.primary} />
      </View>
      <View style={styles.col}>
        <View style={styles.kickerRow}>
          <View style={[styles.dot, { backgroundColor: dotColor }]} />
          <Text style={[styles.kicker, { color: c.textMuted }]}>{kicker}</Text>
        </View>
        <Text style={[styles.title, { color: c.text }]} numberOfLines={1}>{title}</Text>
        {subtitle ? <Text style={[styles.sub, { color: c.textMuted }]}>{subtitle}</Text> : null}
      </View>
    </Wrapper>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  icon: {
    width: 42, height: 42, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  col: { flex: 1 },
  kickerRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  kicker: {
    fontFamily: 'DMSans-Medium',
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  title: {
    fontFamily: 'CrimsonPro-Medium',
    fontSize: 16,
    marginTop: 2,
  },
  sub: {
    fontFamily: 'DMSans',
    fontSize: 11,
    marginTop: 3,
  },
});
```

- [ ] **Step 2: Commit**

```bash
git add components/LiveStatusCard.tsx
git commit -m "feat(home): LiveStatusCard component"
```

---

## Task 5: QuickActionTile component

**Files:**
- Create: `components/QuickActionTile.tsx`

- [ ] **Step 1: Write the component**

```tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../providers/ThemeProvider';

interface QuickActionTileProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  accent?: boolean;
}

export function QuickActionTile({ icon, label, onPress, accent = false }: QuickActionTileProps) {
  const { theme } = useTheme();
  const c = theme.colors;
  const holderBg = accent ? `${c.accent}33` : c.surface2;
  const holderColor = accent ? c.accent : c.primary;

  return (
    <TouchableOpacity
      style={[styles.tile, { backgroundColor: c.surface, borderColor: c.border }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={[styles.icon, { backgroundColor: holderBg }]}>
        <Ionicons name={icon} size={22} color={holderColor} />
      </View>
      <Text style={[styles.label, { color: c.text }]} numberOfLines={1}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    gap: 6,
  },
  icon: {
    width: 42, height: 42, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  label: {
    fontFamily: 'DMSans-Medium',
    fontSize: 11,
    textAlign: 'center',
  },
});
```

- [ ] **Step 2: Commit**

```bash
git add components/QuickActionTile.tsx
git commit -m "feat(home): QuickActionTile component"
```

---

## Task 6: FilteredContentList component

**Files:**
- Create: `components/FilteredContentList.tsx`

- [ ] **Step 1: Write the component**

```tsx
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
```

- [ ] **Step 2: Commit**

```bash
git add components/FilteredContentList.tsx
git commit -m "feat(home): FilteredContentList shared screen body"
```

---

## Task 7: New tab content screens

**Files:**
- Create: `app/(tabs)/bayanaat.tsx`, `clips.tsx`, `ashaar.tsx`, `books.tsx`

- [ ] **Step 1: Write all four files**

Each is a 5-line wrapper. Write them identically except for props.

`app/(tabs)/bayanaat.tsx`:
```tsx
import React from 'react';
import { FilteredContentList } from '../../components/FilteredContentList';
export default function BayanaatScreen() {
  return <FilteredContentList kicker="BAYANAAT" types={['bayan']} />;
}
```

`app/(tabs)/clips.tsx`:
```tsx
import React from 'react';
import { FilteredContentList } from '../../components/FilteredContentList';
export default function ClipsScreen() {
  return <FilteredContentList kicker="CLIPS" types={['clip']} />;
}
```

`app/(tabs)/ashaar.tsx`:
```tsx
import React from 'react';
import { FilteredContentList } from '../../components/FilteredContentList';
export default function AshaarScreen() {
  return <FilteredContentList kicker="ASHAAR" types={['nazam', 'hamd_naat']} />;
}
```

`app/(tabs)/books.tsx`:
```tsx
import React from 'react';
import { FilteredContentList } from '../../components/FilteredContentList';
export default function BooksScreen() {
  return <FilteredContentList kicker="BOOKS" types={['book']} />;
}
```

- [ ] **Step 2: Commit**

```bash
git add 'app/(tabs)/bayanaat.tsx' 'app/(tabs)/clips.tsx' 'app/(tabs)/ashaar.tsx' 'app/(tabs)/books.tsx'
git commit -m "feat(tabs): Bayanaat/Clips/Ashaar/Books screens"
```

---

## Task 8: Flat route — profile page

**Files:**
- Create: `app/profile.tsx` (new flat route; keep old `app/(tabs)/profile.tsx` untouched for now)

- [ ] **Step 1: Scaffold with menu sections**

```tsx
import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../providers/ThemeProvider';
import { useAuth } from '../providers/AuthProvider';
import { useI18n } from '../providers/I18nProvider';
import { useSafeBack } from '../hooks/useSafeBack';

export default function ProfileScreen() {
  const { theme, themePref } = useTheme();
  const { user, isAdmin, isEditor, signOut } = useAuth();
  const { language } = useI18n();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const goBack = useSafeBack('/');
  const c = theme.colors;

  const initial = (user?.email?.[0] || '?').toUpperCase();

  return (
    <ScrollView
      style={[styles.root, { backgroundColor: c.background }]}
      contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: 120 }}
    >
      <TouchableOpacity style={styles.back} onPress={goBack} activeOpacity={0.7}>
        <Text style={[styles.backText, { color: c.primary }]}>‹ Back</Text>
      </TouchableOpacity>

      <View style={styles.hero}>
        <View style={[styles.avatar, { backgroundColor: c.surface, borderColor: c.accent }]}>
          <Text style={[styles.avatarInitial, { color: c.primary }]}>{initial}</Text>
        </View>
        <Text style={[styles.name, { color: c.text }]}>{user?.email?.split('@')[0] || 'Guest'}</Text>
        <Text style={[styles.email, { color: c.textMuted }]}>{user?.email || 'Not signed in'}</Text>
      </View>

      {(isAdmin || isEditor) && (
        <View style={[styles.group, { backgroundColor: c.surface, borderColor: c.border }]}>
          <Row
            icon="shield-checkmark-outline"
            label="Admin console"
            onPress={() => router.push('/admin')}
            c={c}
          />
        </View>
      )}

      <View style={[styles.group, { backgroundColor: c.surface, borderColor: c.border }]}>
        <Kicker label="MY CONTENT" c={c} />
        <Row icon="bookmark-outline" label="Saved" onPress={() => router.push('/saved')} c={c} />
        <Row icon="download-outline" label="Downloads" onPress={() => router.push('/downloads')} c={c} />
      </View>

      <View style={[styles.group, { backgroundColor: c.surface, borderColor: c.border }]}>
        <Kicker label="PREFERENCES" c={c} />
        <Row
          icon="globe-outline"
          label="Language"
          value={language === 'ur' ? 'اردو' : 'English'}
          onPress={() => router.push('/settings/language')}
          c={c}
        />
        <Row
          icon="contrast-outline"
          label="Theme"
          value={
            themePref === 'system'
              ? 'System'
              : themePref === 'dark'
              ? 'Dark'
              : 'Light'
          }
          onPress={() => router.push('/settings/theme')}
          c={c}
        />
      </View>

      {user && (
        <View style={[styles.group, { backgroundColor: c.surface, borderColor: c.border }]}>
          <Row
            icon="log-out-outline"
            label="Sign out"
            onPress={signOut}
            c={c}
            danger
          />
        </View>
      )}
    </ScrollView>
  );
}

function Kicker({ label, c }: { label: string; c: any }) {
  return (
    <Text style={[styles.kicker, { color: c.textMuted }]}>{label}</Text>
  );
}

function Row({
  icon,
  label,
  value,
  onPress,
  c,
  danger = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string;
  onPress?: () => void;
  c: any;
  danger?: boolean;
}) {
  const color = danger ? c.liveRed : c.primary;
  return (
    <TouchableOpacity
      style={[styles.row, { borderTopColor: c.hairline }]}
      onPress={onPress}
      activeOpacity={0.7}
      disabled={!onPress}
    >
      <View
        style={[
          styles.rowIcon,
          {
            backgroundColor: danger ? `${c.liveRed}1f` : c.surface2,
          },
        ]}
      >
        <Ionicons name={icon} size={16} color={color} />
      </View>
      <Text style={[styles.rowLabel, { color: danger ? c.liveRed : c.text }]}>{label}</Text>
      {value ? <Text style={[styles.rowValue, { color: c.textMuted }]}>{value}</Text> : null}
      {onPress ? <Text style={[styles.chev, { color: c.textMuted }]}>›</Text> : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  back: { paddingHorizontal: 16, paddingVertical: 8 },
  backText: { fontFamily: 'CrimsonPro-Medium', fontSize: 18 },
  hero: { alignItems: 'center', paddingVertical: 16, gap: 8 },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: { fontFamily: 'CrimsonPro-SemiBold', fontSize: 32 },
  name: { fontFamily: 'CrimsonPro-Medium', fontSize: 20 },
  email: { fontFamily: 'DMSans', fontSize: 12 },
  group: {
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  kicker: {
    fontFamily: 'DMSans-Medium',
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  rowIcon: {
    width: 28, height: 28, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
  },
  rowLabel: { flex: 1, fontFamily: 'CrimsonPro', fontSize: 14 },
  rowValue: { fontFamily: 'DMSans', fontSize: 11 },
  chev: { fontSize: 18, lineHeight: 18 },
});
```

Note: `/saved`, `/downloads`, `/settings/language`, `/settings/theme` links are best-effort; if those routes don't exist yet, the taps error out gracefully. The out-of-scope note in the spec covers this.

- [ ] **Step 2: Commit**

```bash
git add app/profile.tsx
git commit -m "feat(profile): flat profile route with menu sections"
```

---

## Task 9: Flat routes for library, schedule, coming-soon

**Files:**
- Create: `app/library.tsx`, `app/schedule.tsx`, `app/coming-soon.tsx`

- [ ] **Step 1: Library (copy current tab contents)**

Create `app/library.tsx` as a simple re-export of the existing tab library:

```tsx
// app/library.tsx — flat version of the library route, same contents as
// the old (tabs)/library.tsx. Re-exporting keeps one source of truth
// while allowing the home tile + floating bar to link here directly.
export { default } from './(tabs)/library';
```

- [ ] **Step 2: Schedule (read-only for non-admins)**

```tsx
// app/schedule.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, ActivityIndicator, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { ScheduledSession } from '../lib/types';
import { useTheme } from '../providers/ThemeProvider';
import { useSafeBack } from '../hooks/useSafeBack';

export default function ScheduleScreen() {
  const { theme } = useTheme();
  const c = theme.colors;
  const insets = useSafeAreaInsets();
  const goBack = useSafeBack('/');
  const [rows, setRows] = useState<ScheduledSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const nowIso = new Date().toISOString();
      const { data } = await supabase
        .from('scheduled_sessions')
        .select('*')
        .gte('scheduled_at', nowIso)
        .order('scheduled_at', { ascending: true });
      setRows((data ?? []) as ScheduledSession[]);
      setLoading(false);
    })();
  }, []);

  return (
    <View style={[styles.root, { backgroundColor: c.background, paddingTop: insets.top + 12 }]}>
      <Text style={[styles.back, { color: c.primary }]} onPress={goBack}>‹ Back</Text>
      <Text style={[styles.title, { color: c.text }]}>Upcoming majlis</Text>
      {loading ? (
        <ActivityIndicator color={c.primary} style={{ marginTop: 24 }} />
      ) : rows.length === 0 ? (
        <Text style={[styles.empty, { color: c.textMuted }]}>No upcoming sessions.</Text>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(r) => r.id}
          contentContainerStyle={{ padding: 16 }}
          renderItem={({ item }) => (
            <View style={[styles.row, { backgroundColor: c.surface, borderColor: c.border }]}>
              <Text style={[styles.when, { color: c.textMuted }]}>
                {new Date(item.scheduled_at).toLocaleString([], {
                  weekday: 'short', day: 'numeric', month: 'short',
                  hour: 'numeric', minute: '2-digit',
                })}
              </Text>
              <Text style={[styles.rowTitle, { color: c.text }]}>
                {item.title_en || item.title_ur}
              </Text>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  back: { paddingHorizontal: 16, paddingVertical: 8, fontFamily: 'CrimsonPro-Medium', fontSize: 18 },
  title: { fontFamily: 'CrimsonPro-SemiBold', fontSize: 28, marginHorizontal: 16, marginBottom: 8 },
  empty: { fontFamily: 'CrimsonPro-Italic', fontSize: 16, textAlign: 'center', marginTop: 48 },
  row: { padding: 14, borderRadius: 12, borderWidth: 1, marginBottom: 10 },
  when: { fontFamily: 'DMSans-Medium', fontSize: 10, letterSpacing: 1, textTransform: 'uppercase' },
  rowTitle: { fontFamily: 'CrimsonPro-Medium', fontSize: 16, marginTop: 4 },
});
```

- [ ] **Step 3: Coming-soon placeholder**

```tsx
// app/coming-soon.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../providers/ThemeProvider';
import { useSafeBack } from '../hooks/useSafeBack';

const FEATURES: Record<string, string> = {
  salah: 'Salah Timings',
  ask: 'Ask Hazrat',
};

export default function ComingSoonScreen() {
  const { theme } = useTheme();
  const c = theme.colors;
  const insets = useSafeAreaInsets();
  const goBack = useSafeBack('/');
  const { feature } = useLocalSearchParams<{ feature?: string }>();
  const name = (feature && FEATURES[feature]) || 'This feature';

  return (
    <View style={[styles.root, { backgroundColor: c.background, paddingTop: insets.top + 12 }]}>
      <Text style={[styles.back, { color: c.primary }]} onPress={goBack}>‹ Back</Text>
      <View style={styles.body}>
        <View style={[styles.glyph, { backgroundColor: c.surface2 }]}>
          <Ionicons name="sparkles-outline" size={40} color={c.accent} />
        </View>
        <Text style={[styles.title, { color: c.text }]}>{name} — coming soon</Text>
        <Text style={[styles.sub, { color: c.textMuted }]}>We're working on this.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  back: { paddingHorizontal: 16, paddingVertical: 8, fontFamily: 'CrimsonPro-Medium', fontSize: 18 },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 24 },
  glyph: { width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: 'CrimsonPro-Medium', fontSize: 24, textAlign: 'center' },
  sub: { fontFamily: 'CrimsonPro-Italic', fontSize: 14, textAlign: 'center' },
});
```

- [ ] **Step 4: Commit**

```bash
git add app/library.tsx app/schedule.tsx app/coming-soon.tsx
git commit -m "feat(routes): flat library/schedule/coming-soon routes"
```

---

## Task 10: Rewrite `app/(tabs)/_layout.tsx`

**Files:**
- Modify: `app/(tabs)/_layout.tsx`

- [ ] **Step 1: New tab set**

Replace the file contents with:

```tsx
import React from 'react';
import { View } from 'react-native';
import { Tabs } from 'expo-router';
import { useI18n } from '../../providers/I18nProvider';
import { MiniPlayer } from '../../components/MiniPlayer';
import { CustomTabBar } from '../../components/CustomTabBar';

export default function TabLayout() {
  const { t } = useI18n();
  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{ headerShown: false }}
        tabBar={(props) => <CustomTabBar {...props} />}
      >
        <Tabs.Screen name="index" options={{ title: t('tabs.home') || 'Home' }} />
        <Tabs.Screen name="bayanaat" options={{ title: 'Bayanaat' }} />
        <Tabs.Screen name="clips" options={{ title: 'Clips' }} />
        <Tabs.Screen name="ashaar" options={{ title: 'Ashaar' }} />
        <Tabs.Screen name="books" options={{ title: 'Books' }} />
        {/* Keep old screens mounted but hidden — prevents 404 if the user lands
            on a legacy deep link while the redirect is still caching. */}
        <Tabs.Screen name="library" options={{ href: null }} />
        <Tabs.Screen name="collection" options={{ href: null }} />
        <Tabs.Screen name="profile" options={{ href: null }} />
      </Tabs>
      <MiniPlayer />
    </View>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add 'app/(tabs)/_layout.tsx'
git commit -m "feat(tabs): new tab set — Home, Bayanaat, Clips, Ashaar, Books"
```

---

## Task 11: Rewrite `components/CustomTabBar.tsx` as floating pill

**Files:**
- Modify: `components/CustomTabBar.tsx`

- [ ] **Step 1: Replace contents**

```tsx
import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../providers/ThemeProvider';

const ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  index: 'home-outline',
  bayanaat: 'mic-outline',
  clips: 'play-circle-outline',
  ashaar: 'musical-notes-outline',
  books: 'book-outline',
};

const LABELS: Record<string, string> = {
  index: 'Home',
  bayanaat: 'Bayanaat',
  clips: 'Clips',
  ashaar: 'Ashaar',
  books: 'Books',
};

export function CustomTabBar({ state, navigation }: BottomTabBarProps) {
  const { theme } = useTheme();
  const c = theme.colors;
  const insets = useSafeAreaInsets();

  // Only render the ordered visible tabs in this exact order.
  const order = ['index', 'bayanaat', 'clips', 'ashaar', 'books'];
  const visible = state.routes
    .map((r) => ({ route: r, index: state.routes.indexOf(r) }))
    .filter(({ route }) => order.includes(route.name))
    .sort((a, b) => order.indexOf(a.route.name) - order.indexOf(b.route.name));

  return (
    <View style={[styles.wrap, { bottom: 12 + insets.bottom / 2 }]} pointerEvents="box-none">
      <View style={[styles.pill, { backgroundColor: c.primary }]}>
        {visible.map(({ route, index }) => {
          const focused = state.index === index;
          const color = focused ? c.accent : 'rgba(247,245,240,0.55)';
          const icon = ICONS[route.name] || 'ellipse-outline';
          const label = LABELS[route.name] || route.name;
          return (
            <TouchableOpacity
              key={route.key}
              accessibilityRole="button"
              accessibilityState={focused ? { selected: true } : {}}
              onPress={() => {
                const event = navigation.emit({
                  type: 'tabPress',
                  target: route.key,
                  canPreventDefault: true,
                });
                if (!focused && !event.defaultPrevented) {
                  navigation.navigate(route.name as never);
                }
              }}
              style={styles.tab}
              activeOpacity={0.8}
            >
              <Ionicons name={icon} size={20} color={color} />
              <Text style={[styles.label, { color }]}>{label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  pill: {
    flexDirection: 'row',
    paddingHorizontal: 6,
    paddingVertical: 8,
    borderRadius: 28,
    gap: 2,
    shadowColor: '#0f2e24',
    shadowOpacity: 0.3,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
    minWidth: 320,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderRadius: 22,
  },
  label: {
    fontFamily: 'DMSans-Medium',
    fontSize: 10,
    marginTop: 2,
  },
});
```

- [ ] **Step 2: Commit**

```bash
git add components/CustomTabBar.tsx
git commit -m "feat(tabs): floating pill tab bar styling"
```

---

## Task 12: Rewrite `app/(tabs)/index.tsx` (home)

**Files:**
- Modify: `app/(tabs)/index.tsx`

- [ ] **Step 1: Replace with the new composition**

```tsx
import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { Category, Content } from '../../lib/types';
import { useTheme } from '../../providers/ThemeProvider';
import { useI18n } from '../../providers/I18nProvider';
import { useAuth } from '../../providers/AuthProvider';
import { useLatestContent, useLiveSession } from '../../hooks/useContent';
import { HomeTopBar } from '../../components/HomeTopBar';
import { BrandBanner } from '../../components/BrandBanner';
import { LiveStatusCard } from '../../components/LiveStatusCard';
import { QuickActionTile } from '../../components/QuickActionTile';
import { ContentCard } from '../../components/ContentCard';

export default function HomeScreen() {
  const { theme } = useTheme();
  const { language } = useI18n();
  const { isAdmin, isEditor } = useAuth();
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
    () => categories.find((c) => c.type === 'mamulat'),
    [categories],
  );
  const liveCategory = useMemo(
    () =>
      categories.find(
        (c) => c.type === 'bayan' && (c.name_en === 'Live Sessions' || c.name_en === 'Live'),
      ),
    [categories],
  );

  const onMamulat = () => {
    if (mamulatCategory) router.push(`/library/${mamulatCategory.id}`);
    else router.push('/library');
  };
  const onLiveSessions = () => {
    if (live) router.push('/player/live');
    else if (liveCategory) router.push(`/library/${liveCategory.id}`);
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
                  item.type === 'book'
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
```

- [ ] **Step 2: Commit**

```bash
git add 'app/(tabs)/index.tsx'
git commit -m "feat(home): rewrite home with banner + live card + tiles + rail"
```

---

## Task 13: Login page — swap logo source

**Files:**
- Modify: `app/(auth)/login.tsx`

- [ ] **Step 1: Change the Image source to the Khanqah logo**

Find:
```tsx
source={require('../../assets/images/icon.png')}
```
(Already resolves to the new Khanqah calligraphy after Task 1, since `icon.png` is overwritten — but make the intent explicit by pointing to the named asset:)

Replace with:
```tsx
source={require('../../assets/images/khanqah-logo.png')}
```

- [ ] **Step 2: Commit**

```bash
git add 'app/(auth)/login.tsx'
git commit -m "feat(login): reference khanqah-logo.png explicitly"
```

---

## Task 14: Push + watch CI deploy

**Files:** none.

- [ ] **Step 1: Push**

```bash
git push origin main
```

- [ ] **Step 2: Watch the workflow**

```bash
gh auth switch --user EnnBi
gh run watch --repo EnnBi/Khanqah $(gh run list --repo EnnBi/Khanqah --limit 1 --json databaseId --jq '.[0].databaseId')
gh auth switch --user nadeem-baba
```

- [ ] **Step 3: Smoke test the live site**

Open `https://arrashid.ennbi.com/` (hard reload) and verify:
- Splash shows the Khanqah calligraphy.
- Login shows the Khanqah calligraphy.
- Home renders banner + live card + tiles + rail + floating pill.
- Each tile routes correctly (Mamulat to category, Salah/Ask to coming-soon, etc.).
- Profile page opens via top-right icon, shows admin row for your admin account, hides for a non-admin.
- All four content tabs (Bayanaat, Clips, Ashaar, Books) load with their filter.
- Dark mode: toggle via profile → Theme → Dark; everything respects tokens.

---

## Self-Review Notes

**Spec coverage:**
- Brand (spec §Brand) → Task 1, Task 13 ✓
- Navigation (spec §Navigation) → Tasks 10, 11 ✓
- Home page (spec §Home page) → Tasks 2-6, 12 ✓
- Profile page (spec §Profile page) → Task 8 ✓
- Tab content screens (spec §Tab content screens) → Tasks 6, 7 ✓
- Placeholder screens (spec §New placeholder screens) → Task 9 ✓
- Components (spec §Components) → Tasks 2-6 ✓

**Placeholder scan:** No TBDs; every step shows the code it expects.

**Type consistency:** `FilteredContentList` props shape, tile icon names, and route strings are consistent across tasks.
