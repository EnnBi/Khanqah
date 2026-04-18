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
import { type as typeP, font } from '../../lib/typography';

const DAYS_SHORT = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function formatSessionDate(isoString: string): { dayTime: string; recurrenceHint: string } {
  const date = new Date(isoString);
  const dayNames = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
  const monthNames = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  const day = dayNames[date.getDay()];
  const month = monthNames[date.getMonth()];
  const dateNum = date.getDate();
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const displayHour = hours % 12 === 0 ? 12 : hours % 12;
  const displayMin = minutes.toString().padStart(2, '0');
  return {
    dayTime: `${day}, ${month} ${dateNum} · ${displayHour}:${displayMin} ${ampm}`,
    recurrenceHint: `EVERY ${day}`,
  };
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
  const c = theme.colors;

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
    container: { flex: 1, backgroundColor: c.background },

    // ── Header ───────────────────────────────────────────────
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingTop: 60,
      paddingBottom: 20,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
    },
    backBtn: { paddingRight: 16 },
    backBtnText: {
      fontFamily: font.serif,
      fontSize: 22,
      color: c.primary,
      lineHeight: 26,
    },
    headerSpacer: { flex: 1 },
    headerLabel: {
      ...typeP.label,
      color: c.textMuted,
    },

    // ── Hero ─────────────────────────────────────────────────
    hero: {
      paddingHorizontal: 28,
      paddingTop: 24,
      paddingBottom: 20,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
    },
    heroKicker: {
      ...typeP.label,
      color: c.textMuted,
      marginBottom: 6,
    },
    heroTitle: {
      fontFamily: font.serif,
      fontSize: 28,
      color: c.primary,
      letterSpacing: -0.3,
      lineHeight: 34,
    },
    heroTitleItalic: {
      fontFamily: font.serifItalic,
    },

    // ── Session cards ────────────────────────────────────────
    listContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 110 },
    card: {
      backgroundColor: c.surface,
      borderRadius: 4,
      borderWidth: 1,
      borderColor: c.border,
      marginBottom: 12,
      flexDirection: 'row',
      overflow: 'hidden',
    },
    cardGoldStripe: {
      width: 4,
      backgroundColor: c.accent,
    },
    cardBody: {
      flex: 1,
      padding: 16,
    },
    cardDayTime: {
      ...typeP.labelSmall,
      color: c.accent,
      marginBottom: 8,
    },
    cardTitle: {
      fontFamily: font.serif,
      fontSize: 17,
      color: c.primary,
      letterSpacing: -0.2,
      lineHeight: 22,
      marginBottom: 6,
    },
    cardDescription: {
      fontFamily: font.serif,
      fontSize: 14,
      color: c.textMuted,
      lineHeight: 20,
      marginBottom: 8,
    },
    cardRecurrence: {
      ...typeP.labelSmall,
      color: c.textMuted,
    },
    cardFooter: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      marginTop: 10,
      gap: 8,
    },
    deleteBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 4,
      borderWidth: 1,
      borderColor: '#fecaca',
      backgroundColor: '#fef2f2',
    },
    deleteBtnText: {
      fontFamily: font.sansMedium,
      fontSize: 12,
      letterSpacing: 0.5,
      color: '#ef4444',
    },

    // ── FAB ──────────────────────────────────────────────────
    fab: {
      position: 'absolute',
      bottom: 32,
      left: 20,
      right: 20,
      backgroundColor: c.accent,
      borderRadius: 4,
      paddingVertical: 16,
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.12,
      shadowRadius: 8,
      elevation: 6,
    },
    fabText: {
      ...typeP.button,
      // FAB bg is c.accent (always gold), so dark-forest text contrasts in
      // both themes. c.primary goes gold in dark mode, making it invisible.
      color: '#0f2e24',
    },

    // ── Empty ────────────────────────────────────────────────
    emptyContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingTop: 80,
    },
    emptyText: {
      fontFamily: font.serifItalic,
      fontSize: 16,
      color: c.textMuted,
    },

    // ── Modal ────────────────────────────────────────────────
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'flex-end',
    },
    modalSheet: {
      backgroundColor: c.background,
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
      backgroundColor: c.border,
      alignSelf: 'center',
      marginBottom: 16,
    },
    modalTitle: {
      fontFamily: font.serifItalic,
      fontSize: 22,
      color: c.primary,
      marginBottom: 20,
    },
    fieldLabel: {
      ...typeP.labelSmall,
      color: c.textMuted,
      marginBottom: 6,
      marginTop: 16,
    },
    input: {
      backgroundColor: c.surface,
      borderWidth: 1,
      borderColor: c.border,
      borderRadius: 8,
      paddingHorizontal: 14,
      paddingVertical: 11,
      fontFamily: font.serif,
      fontSize: 15,
      color: c.text,
    },
    inputMultiline: {
      height: 80,
      textAlignVertical: 'top',
      paddingTop: 11,
    },
    inputRtl: {
      textAlign: 'right',
      writingDirection: 'rtl',
      fontFamily: font.urdu,
      fontSize: 18,
    },
    toggleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: 16,
      paddingVertical: 8,
      borderTopWidth: 1,
      borderTopColor: c.border,
    },
    toggleLabel: {
      fontFamily: font.serif,
      fontSize: 15,
      color: c.text,
    },
    rruleInfo: {
      marginTop: 10,
      backgroundColor: c.surface2,
      borderRadius: 8,
      padding: 12,
    },
    rruleText: {
      fontFamily: font.sansMedium,
      fontSize: 13,
      color: c.textMuted,
    },
    rruleCode: {
      fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
      fontSize: 11,
      color: c.textMuted,
      marginTop: 2,
    },
    errorText: {
      fontFamily: font.sans,
      fontSize: 13,
      color: '#ef4444',
      marginTop: 12,
    },
    saveBtn: {
      marginTop: 20,
      backgroundColor: c.primary,
      borderRadius: 4,
      paddingVertical: 15,
      alignItems: 'center',
    },
    saveBtnDisabled: { opacity: 0.6 },
    saveBtnText: {
      ...typeP.button,
      color: c.onPrimary,
    },
    cancelBtn: {
      marginTop: 10,
      paddingVertical: 12,
      alignItems: 'center',
    },
    cancelBtnText: {
      fontFamily: font.sansMedium,
      fontSize: 14,
      color: c.textMuted,
    },
  });

  const renderSession = ({ item }: { item: ScheduledSession }) => {
    const isDeleting = deletingId === item.id;
    const { dayTime, recurrenceHint } = formatSessionDate(item.scheduled_at);

    return (
      <View style={styles.card}>
        <View style={styles.cardGoldStripe} />
        <View style={styles.cardBody}>
          <Text style={styles.cardDayTime}>{dayTime}</Text>
          <Text style={styles.cardTitle} numberOfLines={2}>
            {item.title_en}
          </Text>
          {!!item.description_en && (
            <Text style={styles.cardDescription} numberOfLines={2}>
              {item.description_en}
            </Text>
          )}
          {item.is_recurring && (
            <Text style={styles.cardRecurrence}>{recurrenceHint} · RECURRING</Text>
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
                <Text style={styles.deleteBtnText}>DELETE</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  const renderEmpty = () => {
    if (loading) return null;
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No upcoming sessions</Text>
      </View>
    );
  };

  const dayName = form.scheduled_at.trim() ? getDayNameFromDate(form.scheduled_at.trim()) : '';
  const rrule = form.is_recurring && form.scheduled_at.trim() ? buildRRule(form.scheduled_at.trim()) : '';

  return (
    <View style={styles.container}>
      {/* Minimal header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Text style={styles.backBtnText}>‹ Back</Text>
        </TouchableOpacity>
        <View style={styles.headerSpacer} />
        <Text style={styles.headerLabel}>SCHEDULE</Text>
      </View>

      {/* Hero */}
      <View style={styles.hero}>
        <Text style={styles.heroKicker}>SCHEDULE</Text>
        <Text style={styles.heroTitle}>
          Upcoming{' '}
          <Text style={styles.heroTitleItalic}>sessions</Text>
        </Text>
      </View>

      {/* Session List */}
      {loading ? (
        <View style={styles.emptyContainer}>
          <ActivityIndicator color={c.primary} size="large" />
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
              tintColor={c.primary}
              colors={[c.primary]}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={openModal} activeOpacity={0.85}>
        <Text style={styles.fabText}>+ NEW SESSION</Text>
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
              <Text style={styles.fieldLabel}>TITLE (ENGLISH) *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Weekly Zikr Mehfil"
                placeholderTextColor={c.textMuted}
                value={form.title_en}
                onChangeText={(v) => setForm((f) => ({ ...f, title_en: v }))}
                autoCapitalize="words"
              />

              {/* Title UR */}
              <Text style={styles.fieldLabel}>TITLE (URDU)</Text>
              <TextInput
                style={[styles.input, styles.inputRtl]}
                placeholder="عنوان"
                placeholderTextColor={c.textMuted}
                value={form.title_ur}
                onChangeText={(v) => setForm((f) => ({ ...f, title_ur: v }))}
                textAlign="right"
              />

              {/* Description EN */}
              <Text style={styles.fieldLabel}>DESCRIPTION (ENGLISH)</Text>
              <TextInput
                style={[styles.input, styles.inputMultiline]}
                placeholder="Brief description..."
                placeholderTextColor={c.textMuted}
                value={form.description_en}
                onChangeText={(v) => setForm((f) => ({ ...f, description_en: v }))}
                multiline
                numberOfLines={3}
              />

              {/* Description UR */}
              <Text style={styles.fieldLabel}>DESCRIPTION (URDU)</Text>
              <TextInput
                style={[styles.input, styles.inputMultiline, styles.inputRtl]}
                placeholder="تفصیل"
                placeholderTextColor={c.textMuted}
                value={form.description_ur}
                onChangeText={(v) => setForm((f) => ({ ...f, description_ur: v }))}
                multiline
                numberOfLines={3}
                textAlign="right"
              />

              {/* Date & Time */}
              <Text style={styles.fieldLabel}>DATE & TIME *</Text>
              {Platform.OS === 'web' ? (
                <View style={styles.input}>
                  {React.createElement('input', {
                    type: 'datetime-local',
                    value: form.scheduled_at,
                    onChange: (e: any) =>
                      setForm((f) => ({ ...f, scheduled_at: e.target.value })),
                    style: {
                      width: '100%',
                      border: 'none',
                      outline: 'none',
                      background: 'transparent',
                      color: c.text,
                      fontFamily: font.serif,
                      fontSize: 15,
                      // Keep the browser's native picker icon but re-tint it
                      // for dark mode so it's visible against the surface.
                      colorScheme: theme.dark ? 'dark' : 'light',
                    },
                  })}
                </View>
              ) : (
                <TextInput
                  style={styles.input}
                  placeholder="e.g. 2026-04-10 20:00"
                  placeholderTextColor={c.textMuted}
                  value={form.scheduled_at}
                  onChangeText={(v) => setForm((f) => ({ ...f, scheduled_at: v }))}
                  keyboardType="numbers-and-punctuation"
                  autoCapitalize="none"
                />
              )}

              {/* Is Recurring */}
              <View style={styles.toggleRow}>
                <Text style={styles.toggleLabel}>Is Recurring</Text>
                <Switch
                  value={form.is_recurring}
                  onValueChange={(v) => setForm((f) => ({ ...f, is_recurring: v }))}
                  trackColor={{ false: c.border, true: c.primary }}
                  thumbColor={form.is_recurring ? '#ffffff' : c.textMuted}
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
                  <ActivityIndicator color={c.onPrimary} />
                ) : (
                  <Text style={styles.saveBtnText}>SAVE SESSION</Text>
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
