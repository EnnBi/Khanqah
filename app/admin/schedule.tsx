import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Modal,
  ScrollView,
  RefreshControl,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import { useTheme } from '../../providers/ThemeProvider';
import { useAuth } from '../../providers/AuthProvider';
import { supabase } from '../../lib/supabase';
import { ScheduledSession } from '../../lib/types';
import { type as typeP, font } from '../../lib/typography';
import { useSafeBack } from '../../hooks/useSafeBack';
import { showMessage, confirmDestructive } from '../../lib/alert';
import { nextOccurrence, isUpcoming } from '../../lib/schedule';

const DAYS_SHORT = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function formatSessionDate(date: Date): { dayTime: string; recurrenceHint: string } {
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

type Recurrence = 'once' | 'weekly' | 'daily';

function buildRRule(dateStr: string, recurrence: Recurrence): string | null {
  if (recurrence === 'once') return null;
  if (recurrence === 'daily') return 'FREQ=DAILY';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return null;
  const dayCode = DAYS_SHORT[date.getDay()];
  return `FREQ=WEEKLY;BYDAY=${dayCode}`;
}

function recurrenceFromSession(isRecurring: boolean, rule: string | null | undefined): Recurrence {
  if (!isRecurring) return 'once';
  if (rule && rule.toUpperCase().includes('DAILY')) return 'daily';
  return 'weekly';
}

function getDayNameFromDate(dateStr: string): string {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '';
  return DAY_NAMES[date.getDay()];
}

// Convert an ISO timestamp from the DB into the YYYY-MM-DDTHH:MM string
// that <input type="datetime-local"> (and our text fallback) expect.
function toDatetimeLocalValue(isoString: string): string {
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return '';
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

interface FormState {
  title_en: string;
  title_ur: string;
  description_en: string;
  description_ur: string;
  scheduled_at: string;
  recurrence: Recurrence;
}

const EMPTY_FORM: FormState = {
  title_en: '',
  title_ur: '',
  description_en: '',
  description_ur: '',
  scheduled_at: '',
  // Default is one-off: create-a-session is a single click away from saving.
  recurrence: 'once',
};

// Converts a YYYY-MM-DDTHH:MM string (or empty) to a Date, defaulting to now.
function parsedDate(scheduled_at: string): Date {
  if (!scheduled_at.trim()) return new Date();
  const d = new Date(scheduled_at.trim());
  return isNaN(d.getTime()) ? new Date() : d;
}

// Formats a Date to the YYYY-MM-DDTHH:MM value used by the form state.
function toFormValue(d: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function DateTimeField({
  form,
  setForm,
  c,
  theme,
}: {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  c: any;
  theme: any;
}) {
  const [pickerMode, setPickerMode] = useState<'date' | 'time' | null>(null);

  if (Platform.OS === 'web') {
    return (
      <View style={{ backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 11 }}>
        {React.createElement('input', {
          type: 'datetime-local',
          value: form.scheduled_at,
          onChange: (e: any) => setForm((f) => ({ ...f, scheduled_at: e.target.value })),
          onClick: (e: any) => { try { e.currentTarget.showPicker?.(); } catch { /* noop */ } },
          onFocus: (e: any) => { try { e.currentTarget.showPicker?.(); } catch { /* noop */ } },
          style: {
            width: '100%', border: 'none', outline: 'none', background: 'transparent',
            color: c.text, fontFamily: 'CrimsonPro', fontSize: 15, cursor: 'pointer',
            colorScheme: theme.dark ? 'dark' : 'light',
          },
        })}
      </View>
    );
  }

  // Android / iOS — two tappable buttons, one for date, one for time.
  const displayDate = form.scheduled_at
    ? parsedDate(form.scheduled_at).toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
    : 'Tap to pick date';
  const displayTime = form.scheduled_at
    ? parsedDate(form.scheduled_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    : 'Tap to pick time';

  const handleChange = (_event: DateTimePickerEvent, selected?: Date) => {
    // On Android the picker auto-dismisses after the user picks.
    if (Platform.OS === 'android') setPickerMode(null);
    if (!selected) return;
    const base = parsedDate(form.scheduled_at);
    if (pickerMode === 'date') {
      base.setFullYear(selected.getFullYear(), selected.getMonth(), selected.getDate());
      setForm((f) => ({ ...f, scheduled_at: toFormValue(base) }));
      // After picking a date on Android, immediately open time picker.
      if (Platform.OS === 'android') setTimeout(() => setPickerMode('time'), 50);
    } else {
      base.setHours(selected.getHours(), selected.getMinutes());
      setForm((f) => ({ ...f, scheduled_at: toFormValue(base) }));
    }
  };

  return (
    <>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 11 }}
          onPress={() => setPickerMode('date')}
          activeOpacity={0.7}
        >
          <Text style={{ fontFamily: 'CrimsonPro', fontSize: 15, color: form.scheduled_at ? c.text : c.textMuted }}>{displayDate}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 11 }}
          onPress={() => setPickerMode('time')}
          activeOpacity={0.7}
        >
          <Text style={{ fontFamily: 'CrimsonPro', fontSize: 15, color: form.scheduled_at ? c.text : c.textMuted }}>{displayTime}</Text>
        </TouchableOpacity>
      </View>

      {pickerMode !== null && (
        <DateTimePicker
          value={parsedDate(form.scheduled_at)}
          mode={pickerMode}
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleChange}
          themeVariant={theme.dark ? 'dark' : 'light'}
          {...(Platform.OS === 'ios' ? {
            onTouchCancel: () => setPickerMode(null),
          } : {})}
        />
      )}

      {/* iOS needs an explicit Done button since the spinner stays inline */}
      {Platform.OS === 'ios' && pickerMode !== null && (
        <TouchableOpacity
          onPress={() => setPickerMode(null)}
          style={{ alignSelf: 'flex-end', paddingVertical: 6, paddingHorizontal: 14 }}
        >
          <Text style={{ fontFamily: 'CrimsonPro-Medium', fontSize: 16, color: c.primary }}>Done</Text>
        </TouchableOpacity>
      )}
    </>
  );
}

export default function ScheduleScreen() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const router = useRouter();
  const goBack = useSafeBack('/admin');
  const c = theme.colors;

  const [sessions, setSessions] = useState<ScheduledSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [modalVisible, setModalVisible] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const fetchSessions = useCallback(async () => {
    const now = new Date().toISOString();

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

    const all: ScheduledSession[] = [
      ...(upcomingRes.data ?? []),
      ...(recurringRes.data ?? []),
    ];

    // Deduplicate, drop recurring sessions with no future occurrence, sort by next occurrence.
    const map = new Map<string, ScheduledSession>();
    all.forEach((s) => map.set(s.id, s));
    const merged = Array.from(map.values())
      .filter((s) => isUpcoming(s))
      .sort((a, b) => nextOccurrence(a).getTime() - nextOccurrence(b).getTime());

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

  const handleDelete = async (session: ScheduledSession) => {
    const ok = await confirmDestructive(
      'Delete Session',
      `Delete "${session.title_en}"? This cannot be undone.`,
    );
    if (!ok) return;
    setDeletingId(session.id);
    const { error } = await supabase
      .from('scheduled_sessions')
      .delete()
      .eq('id', session.id);
    setDeletingId(null);
    if (error) {
      showMessage('Error', 'Failed to delete session. Please try again.');
    } else {
      setSessions((prev) => prev.filter((s) => s.id !== session.id));
    }
  };

  const openModal = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setModalVisible(true);
  };

  const openEdit = (session: ScheduledSession) => {
    setEditingId(session.id);
    setForm({
      title_en: session.title_en ?? '',
      title_ur: session.title_ur ?? '',
      description_en: session.description_en ?? '',
      description_ur: session.description_ur ?? '',
      scheduled_at: toDatetimeLocalValue(session.scheduled_at),
      recurrence: recurrenceFromSession(!!session.is_recurring, session.recurrence_rule),
    });
    setFormError(null);
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setEditingId(null);
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

    const recurrenceRule = buildRRule(form.scheduled_at.trim(), form.recurrence);

    const payload = {
      title_en: form.title_en.trim(),
      title_ur: form.title_ur.trim() || null,
      description_en: form.description_en.trim() || null,
      description_ur: form.description_ur.trim() || null,
      scheduled_at: parsedDate.toISOString(),
      is_recurring: form.recurrence !== 'once',
      recurrence_rule: recurrenceRule,
    };

    const { data, error } = editingId
      ? await supabase
          .from('scheduled_sessions')
          .update(payload)
          .eq('id', editingId)
          .select()
          .single()
      : await supabase
          .from('scheduled_sessions')
          .insert({ ...payload, created_by: user?.id ?? null })
          .select()
          .single();

    setSaving(false);

    if (error) {
      setFormError(
        editingId
          ? 'Failed to update session. Please try again.'
          : 'Failed to save session. Please try again.',
      );
      console.error('Save error:', error);
      return;
    }

    if (data) {
      setSessions((prev) => {
        const without = editingId ? prev.filter((s) => s.id !== editingId) : prev;
        const updated = [...without, data as ScheduledSession].sort(
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
    editBtn: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 4,
      borderWidth: 1,
      borderColor: c.border,
    },
    editBtnText: {
      fontFamily: font.sansMedium,
      fontSize: 12,
      letterSpacing: 0.5,
      color: c.accent,
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
    recurrenceRow: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 8,
    },
    recurrencePill: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: c.border,
      backgroundColor: c.surface,
      alignItems: 'center',
    },
    recurrencePillActive: {
      backgroundColor: c.primary,
      borderColor: c.primary,
    },
    recurrencePillText: {
      fontFamily: font.sansMedium,
      fontSize: 12,
      letterSpacing: 1,
      color: c.textMuted,
    },
    recurrencePillTextActive: {
      color: c.onPrimary,
      fontFamily: font.sansSemiBold,
    },
    recurrenceHint: {
      fontFamily: font.serifItalic,
      fontSize: 13,
      color: c.textMuted,
      marginBottom: 4,
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
    const { dayTime, recurrenceHint } = formatSessionDate(nextOccurrence(item));

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
              style={styles.editBtn}
              onPress={() => openEdit(item)}
              activeOpacity={0.7}
            >
              <Text style={styles.editBtnText}>EDIT</Text>
            </TouchableOpacity>
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
  const timeLabel = (() => {
    const d = new Date(form.scheduled_at.trim());
    if (isNaN(d.getTime())) return '';
    const h = d.getHours();
    const m = d.getMinutes().toString().padStart(2, '0');
    const ampm = h >= 12 ? 'PM' : 'AM';
    const display = h % 12 === 0 ? 12 : h % 12;
    return `${display}:${m} ${ampm}`;
  })();
  const recurrenceHint = (() => {
    if (!form.scheduled_at.trim()) return 'Pick a date & time first.';
    if (form.recurrence === 'once') return `Happens once on ${dayName} at ${timeLabel}.`;
    if (form.recurrence === 'daily') return `Repeats every day at ${timeLabel}.`;
    return `Repeats every ${dayName} at ${timeLabel}.`;
  })();

  return (
    <View style={styles.container}>
      {/* Minimal header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={goBack} activeOpacity={0.7}>
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
            <Text style={styles.modalTitle}>{editingId ? 'Edit Session' : 'New Session'}</Text>

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
              <DateTimeField form={form} setForm={setForm} c={c} theme={theme} />

              {/* Recurrence */}
              <Text style={styles.fieldLabel}>REPEATS</Text>
              <View style={styles.recurrenceRow}>
                {(['once', 'weekly', 'daily'] as Recurrence[]).map((r) => {
                  const active = form.recurrence === r;
                  const label = r === 'once' ? 'ONCE' : r === 'weekly' ? 'WEEKLY' : 'DAILY';
                  return (
                    <TouchableOpacity
                      key={r}
                      style={[styles.recurrencePill, active && styles.recurrencePillActive]}
                      onPress={() => setForm((f) => ({ ...f, recurrence: r }))}
                      activeOpacity={0.7}
                      accessibilityRole="button"
                      accessibilityState={{ selected: active }}
                    >
                      <Text
                        style={[
                          styles.recurrencePillText,
                          active && styles.recurrencePillTextActive,
                        ]}
                      >
                        {label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <Text style={styles.recurrenceHint}>{recurrenceHint}</Text>

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
                  <Text style={styles.saveBtnText}>{editingId ? 'UPDATE SESSION' : 'SAVE SESSION'}</Text>
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
