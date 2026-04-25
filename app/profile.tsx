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
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Ionicons name="chevron-back" size={18} color={c.primary} />
          <Text style={[styles.backText, { color: c.primary }]}> Back</Text>
        </View>
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
        <Row icon="bookmark-outline" label="Saved" onPress={() => router.push('/saved' as any)} c={c} />
        <Row icon="download-outline" label="Downloads" onPress={() => router.push('/downloads' as any)} c={c} />
      </View>

      <View style={[styles.group, { backgroundColor: c.surface, borderColor: c.border }]}>
        <Kicker label="PREFERENCES" c={c} />
        <Row
          icon="globe-outline"
          label="Language"
          value={language === 'ur' ? 'اردو' : 'English'}
          onPress={() => router.push('/settings/language' as any)}
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
          onPress={() => router.push('/settings/theme' as any)}
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
  return <Text style={[styles.kicker, { color: c.textMuted }]}>{label}</Text>;
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
          { backgroundColor: danger ? `${c.liveRed}1f` : c.surface2 },
        ]}
      >
        <Ionicons name={icon} size={16} color={color} />
      </View>
      <Text style={[styles.rowLabel, { color: danger ? c.liveRed : c.text }]}>{label}</Text>
      {value ? <Text style={[styles.rowValue, { color: c.textMuted }]}>{value}</Text> : null}
      {onPress ? <Ionicons name="chevron-forward" size={18} color={c.textMuted} /> : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  back: { paddingHorizontal: 16, paddingVertical: 8 },
  backText: { fontFamily: 'CrimsonPro-Medium', fontSize: 18 },
  hero: { alignItems: 'center', paddingVertical: 16, gap: 8 },
  avatar: {
    width: 80, height: 80, borderRadius: 40, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center',
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
