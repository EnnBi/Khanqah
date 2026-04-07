import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Modal,
  ScrollView,
  Switch,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../providers/ThemeProvider';
import { useAuth } from '../../providers/AuthProvider';
import { supabase } from '../../lib/supabase';
import { ScheduledSession } from '../../lib/types';

const DAYS_SHORT = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function formatSessionDate(isoString: string): string {
  const date = new Date(isoString);
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const day = dayNames[date.getDay()];
  const month = monthNames[date.getMonth()];
  const dateNum = date.getDate();
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const displayHour = hours % 12 === 0 ? 12 : hours % 12;
  const displayMin = minutes.toString().padStart(2, '0');
  return `${day}, ${month} ${dateNum} • ${displayHour}:${displayMin} ${ampm}`;
}

function buildRRule(dateStr: string): string {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '';
  const dayCode = DAYS_SHORT[date.getDay()];
  return `FREQ=WEEKLY;BYDAY=${dayCode}`;
}

function getDayNameFromDate(dateStr: string): string {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '';
  return DAY_NAMES[date.getDay()];
}

interface FormState {
  title_en: string;
  title_ur: string;
  description_en: string;
  description_ur: string;
  scheduled_at: string;
  is_recurring: boolean;
}

const EMPTY_FORM: FormState = {
  title_en: '',
  title_ur: '',
  description_en: '',
  description_ur: '',
  scheduled_at: '',
  is_recurring: false,
};

export default function ScheduleScreen() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const router = useRouter();
  const colors = theme.colors;

  const [sessions, setSessions] = useState<ScheduledSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [modalVisible, setModalVisible] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fetchSessions = useCallback(async () => {
    const now = new Date().toISOString();

    // Fetch upcoming one-time sessions and all recurring sessions
    const [upcomingRes, recurringRes] = await Promise.all([
      supabase
        .from('scheduled_sessions')
        .select('*')
        .eq('is_recurring', false)
        .gte('scheduled_at', now)
        .order('scheduled_at', { ascending: true }),
      supabase
        .from('scheduled_sessions')
        .select('*')
        .eq('is_recurring', true)
        .order('scheduled_at', { ascending: true }),
    ]);

    const upcoming: ScheduledSession[] = upcomingRes.data ?? [];
    const recurring: ScheduledSession[] = recurringRes.data ?? [];

    // Merge, deduplicate by id, keep sorted by scheduled_at
    const map = new Map<string, ScheduledSession>();
    [...upcoming, ...recurring].forEach((s) => map.set(s.id, s));
    const merged = Array.from(map.values()).sort(
      (a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()
    );

    setSessions(merged);
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await fetchSessions();
      setLoading(false);
    })();
  }, [fetchSessions]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchSessions();
    setRefreshing(false);
  };

  const handleDelete = (session: ScheduledSession) => {
    Alert.alert(
      'Delete Session',
      `Delete "${session.title_en}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeletingId(session.id);
            const { error } = await supabase
              .from('scheduled_sessions')
              .delete()
              .eq('id', session.id);
            setDeletingId(null);
            if (error) {
              Alert.alert('Error', 'Failed to delete session. Please try again.');
            } else {
              setSessions((prev) => prev.filter((s) => s.id !== session.id));
            }
          },
        },
      ]
    );
  };

  const openModal = () => {
    setForm(EMPTY_FORM);
    setFormError(null);
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setFormError(null);
  };

  const handleSave = async () => {
    setFormError(null);

    if (!form.title_en.trim()) {
      setFormError('Title (English) is required.');
      return;
    }
    if (!form.scheduled_at.trim()) {
      setFormError('Date & Time is required.');
      return;
    }

    const parsedDate = new Date(form.scheduled_at.trim());
    if (isNaN(parsedDate.getTime())) {
      setFormError('Invalid date format. Use e.g. "2026-04-10 20:00"');
      return;
    }

    setSaving(true);

    const recurrenceRule = form.is_recurring ? buildRRule(form.scheduled_at.trim()) : null;

    const { data, error } = await supabase
      .from('scheduled_sessions')
      .insert({
        title_en: form.title_en.trim(),
        title_ur: form.title_ur.trim() || null,
        description_en: form.description_en.trim() || null,
        description_ur: form.description_ur.trim() || null,
        scheduled_at: parsedDate.toISOString(),
        is_recurring: form.is_recurring,
        recurrence_rule: recurrenceRule,
        created_by: user?.id ?? null,
      })
      .select()
      .single();

    setSaving(false);

    if (error) {
      setFormError('Failed to save session. Please try again.');
      console.error('Insert error:', error);
      return;
    }

    if (data) {
      setSessions((prev) => {
        const updated = [...prev, data as ScheduledSession].sort(
          (a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()
        );
        return updated;
      });
    }

    closeModal();
  };

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingTop: 60,
      paddingBottom: 16,
      gap: 12,
    },
    backBtn: { marginRight: 4 },
    backBtnText: { fontSize: 28, color: colors.text },
    headerTitle: { fontSize: 28, fontWeight: '700', color: colors.text, flex: 1 },
    adminBadge: {
      backgroundColor: colors.gold,
      borderRadius: 6,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    adminBadgeText: {
      fontSize: 11,
      fontWeight: '700',
      color: '#ffffff',
      letterSpacing: 1,
    },
    listContent: { paddingHorizontal: 16, paddingBottom: 100 },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 16,
      marginBottom: 12,
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      marginBottom: 6,
    },
    cardTitle: {
      flex: 1,
      fontSize: 15,
      fontWeight: '700',
      color: colors.text,
      marginRight: 10,
    },
    badge: {
      borderRadius: 8,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    badgeTextWeekly: {
      fontSize: 11,
      fontWeight: '700',
      color: '#ffffff',
      letterSpacing: 0.5,
    },
    dateRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginBottom: 6,
    },
    dateIcon: { fontSize: 13 },
    dateText: { fontSize: 13, color: colors.textSecondary },
    descriptionText: {
      fontSize: 13,
      color: colors.textMuted,
      lineHeight: 18,
    },
    cardFooter: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      marginTop: 10,
    },
    deleteBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 8,
      backgroundColor: '#fef2f2',
      borderWidth: 1,
      borderColor: '#fecaca',
    },
    deleteBtnText: { fontSize: 13, color: '#ef4444', fontWeight: '500' },
    fab: {
      position: 'absolute',
      bottom: 32,
      left: 20,
      right: 20,
      backgroundColor: colors.primary,
      borderRadius: 14,
      paddingVertical: 16,
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
      elevation: 6,
    },
    fabText: { fontSize: 16, fontWeight: '700', color: '#ffffff' },
    emptyContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingTop: 80,
    },
    emptyEmoji: { fontSize: 44, marginBottom: 12 },
    emptyText: { fontSize: 16, color: colors.textMuted },
    // Modal styles
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'flex-end',
    },
    modalSheet: {
      backgroundColor: colors.background,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      paddingHorizontal: 20,
      paddingTop: 16,
      paddingBottom: Platform.OS === 'ios' ? 40 : 24,
      maxHeight: '92%',
    },
    modalHandle: {
      width: 36,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.border,
      alignSelf: 'center',
      marginBottom: 16,
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 20,
    },
    fieldLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textSecondary,
      marginBottom: 6,
      marginTop: 14,
    },
    input: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 11,
      fontSize: 15,
      color: colors.text,
    },
    inputMultiline: {
      height: 80,
      textAlignVertical: 'top',
      paddingTop: 11,
    },
    inputRtl: { textAlign: 'right' },
    toggleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 14,
      paddingVertical: 8,
    },
    toggleLabel: {
      fontSize: 15,
      color: colors.text,
      fontWeight: '500',
    },
    rruleInfo: {
      marginTop: 8,
      backgroundColor: colors.surface2,
      borderRadius: 10,
      padding: 12,
    },
    rruleText: {
      fontSize: 13,
      color: colors.textSecondary,
    },
    rruleCode: {
      fontSize: 12,
      color: colors.textMuted,
      fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
      marginTop: 2,
    },
    errorText: {
      fontSize: 13,
      color: '#ef4444',
      marginTop: 12,
    },
    saveBtn: {
      marginTop: 20,
      backgroundColor: colors.primary,
      borderRadius: 12,
      paddingVertical: 15,
      alignItems: 'center',
    },
    saveBtnDisabled: { opacity: 0.6 },
    saveBtnText: { fontSize: 16, fontWeight: '700', color: '#ffffff' },
    cancelBtn: {
      marginTop: 10,
      paddingVertical: 12,
      alignItems: 'center',
    },
    cancelBtnText: { fontSize: 15, color: colors.textMuted },
  });

  const renderSession = ({ item }: { item: ScheduledSession }) => {
    const isDeleting = deletingId === item.id;
    const badgeBg = item.is_recurring ? colors.gold : '#16a34a';
    const badgeLabel = item.is_recurring ? 'Weekly' : 'Upcoming';

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle} numberOfLines={2}>
            {item.title_en}
          </Text>
          <View style={[styles.badge, { backgroundColor: badgeBg }]}>
            <Text style={styles.badgeTextWeekly}>{badgeLabel}</Text>
          </View>
        </View>

        <View style={styles.dateRow}>
          <Text style={styles.dateIcon}>📅</Text>
          <Text style={styles.dateText}>{formatSessionDate(item.scheduled_at)}</Text>
        </View>

        {!!item.description_en && (
          <Text style={styles.descriptionText} numberOfLines={2}>
            {item.description_en}
          </Text>
        )}

        <View style={styles.cardFooter}>
          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={() => handleDelete(item)}
            disabled={isDeleting}
            activeOpacity={0.7}
          >
            {isDeleting ? (
              <ActivityIndicator size="small" color="#ef4444" />
            ) : (
              <>
                <Text style={{ fontSize: 14 }}>🗑️</Text>
                <Text style={styles.deleteBtnText}>Delete</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderEmpty = () => {
    if (loading) return null;
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyEmoji}>📅</Text>
        <Text style={styles.emptyText}>No upcoming sessions</Text>
      </View>
    );
  };

  const dayName = form.scheduled_at.trim() ? getDayNameFromDate(form.scheduled_at.trim()) : '';
  const rrule = form.is_recurring && form.scheduled_at.trim() ? buildRRule(form.scheduled_at.trim()) : '';

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Text style={styles.backBtnText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Schedule</Text>
        <View style={styles.adminBadge}>
          <Text style={styles.adminBadgeText}>ADMIN</Text>
        </View>
      </View>

      {/* Session List */}
      {loading ? (
        <View style={styles.emptyContainer}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : (
        <FlatList
          data={sessions}
          keyExtractor={(item) => item.id}
          renderItem={renderSession}
          contentContainerStyle={[
            styles.listContent,
            sessions.length === 0 && { flex: 1 },
          ]}
          ListEmptyComponent={renderEmpty}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary}
              colors={[colors.primary]}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={openModal} activeOpacity={0.85}>
        <Text style={styles.fabText}>+ Schedule New Session</Text>
      </TouchableOpacity>

      {/* New Session Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={closeModal}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>New Session</Text>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {/* Title EN */}
              <Text style={styles.fieldLabel}>Title (English) *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Weekly Zikr Mehfil"
                placeholderTextColor={colors.textMuted}
                value={form.title_en}
                onChangeText={(v) => setForm((f) => ({ ...f, title_en: v }))}
                autoCapitalize="words"
              />

              {/* Title UR */}
              <Text style={styles.fieldLabel}>Title (Urdu)</Text>
              <TextInput
                style={[styles.input, styles.inputRtl]}
                placeholder="عنوان"
                placeholderTextColor={colors.textMuted}
                value={form.title_ur}
                onChangeText={(v) => setForm((f) => ({ ...f, title_ur: v }))}
                textAlign="right"
              />

              {/* Description EN */}
              <Text style={styles.fieldLabel}>Description (English)</Text>
              <TextInput
                style={[styles.input, styles.inputMultiline]}
                placeholder="Brief description…"
                placeholderTextColor={colors.textMuted}
                value={form.description_en}
                onChangeText={(v) => setForm((f) => ({ ...f, description_en: v }))}
                multiline
                numberOfLines={3}
              />

              {/* Description UR */}
              <Text style={styles.fieldLabel}>Description (Urdu)</Text>
              <TextInput
                style={[styles.input, styles.inputMultiline, styles.inputRtl]}
                placeholder="تفصیل"
                placeholderTextColor={colors.textMuted}
                value={form.description_ur}
                onChangeText={(v) => setForm((f) => ({ ...f, description_ur: v }))}
                multiline
                numberOfLines={3}
                textAlign="right"
              />

              {/* Date & Time */}
              <Text style={styles.fieldLabel}>Date & Time *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 2026-04-10 20:00"
                placeholderTextColor={colors.textMuted}
                value={form.scheduled_at}
                onChangeText={(v) => setForm((f) => ({ ...f, scheduled_at: v }))}
                keyboardType="numbers-and-punctuation"
                autoCapitalize="none"
              />

              {/* Is Recurring */}
              <View style={styles.toggleRow}>
                <Text style={styles.toggleLabel}>Is Recurring</Text>
                <Switch
                  value={form.is_recurring}
                  onValueChange={(v) => setForm((f) => ({ ...f, is_recurring: v }))}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor={form.is_recurring ? '#ffffff' : colors.textMuted}
                />
              </View>

              {/* Recurrence Rule info */}
              {form.is_recurring && (
                <View style={styles.rruleInfo}>
                  {dayName ? (
                    <>
                      <Text style={styles.rruleText}>Weekly on {dayName}</Text>
                      <Text style={styles.rruleCode}>{rrule}</Text>
                    </>
                  ) : (
                    <Text style={styles.rruleText}>Enter a date above to see the recurrence rule.</Text>
                  )}
                </View>
              )}

              {/* Error */}
              {!!formError && <Text style={styles.errorText}>{formError}</Text>}

              {/* Save */}
              <TouchableOpacity
                style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
                onPress={handleSave}
                disabled={saving}
                activeOpacity={0.8}
              >
                {saving ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.saveBtnText}>Save Session</Text>
                )}
              </TouchableOpacity>

              {/* Cancel */}
              <TouchableOpacity style={styles.cancelBtn} onPress={closeModal} activeOpacity={0.7}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}
