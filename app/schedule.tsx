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
