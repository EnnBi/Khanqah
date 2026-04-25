import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
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
      <TouchableOpacity onPress={goBack} style={styles.back}>
        <Ionicons name="chevron-back" size={18} color={c.primary} />
        <Text style={{ color: c.primary, fontFamily: 'CrimsonPro-Medium', fontSize: 14 }}> Back</Text>
      </TouchableOpacity>
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
  back: { paddingHorizontal: 16, paddingVertical: 8, flexDirection: 'row', alignItems: 'center' },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 24 },
  glyph: { width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: 'CrimsonPro-Medium', fontSize: 24, textAlign: 'center' },
  sub: { fontFamily: 'CrimsonPro-Italic', fontSize: 14, textAlign: 'center' },
});
