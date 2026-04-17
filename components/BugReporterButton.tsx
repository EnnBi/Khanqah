import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  TextInput,
  StyleSheet,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { reportBug } from '../services/bug-reporter';
import { useTheme } from '../providers/ThemeProvider';
import type { BugType } from '../services/bug-reporter-types';

type ModalType = Exclude<BugType, 'auto-error' | 'auto-warn' | 'auto-network'>;

const TYPE_OPTIONS: { value: ModalType; label: string }[] = [
  { value: 'ui', label: 'UI Bug' },
  { value: 'backend', label: 'Backend Bug' },
  { value: 'other', label: 'Other' },
];

export function BugReporterButton() {
  if (!__DEV__) return null;

  const { theme } = useTheme();
  const c = theme.colors;
  const insets = useSafeAreaInsets();

  const [open, setOpen] = useState(false);
  const [type, setType] = useState<ModalType>('ui');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [justSubmitted, setJustSubmitted] = useState(false);

  async function handleSubmit() {
    setSubmitting(true);
    try {
      await reportBug({ type, note: note.trim() || null });
      setOpen(false);
      setNote('');
      setType('ui');
      setJustSubmitted(true);
      setTimeout(() => setJustSubmitted(false), 1500);
    } catch (err: any) {
      Alert.alert('Bug report failed', err?.message ?? String(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <TouchableOpacity
        style={[
          styles.fab,
          {
            backgroundColor: justSubmitted ? '#16a34a' : c.accent,
            bottom: Math.max(insets.bottom, 10) + 80,
          },
        ]}
        onPress={() => setOpen(true)}
        accessibilityLabel="Report a bug"
        activeOpacity={0.8}
      >
        <Text style={styles.fabEmoji}>{justSubmitted ? '✓' : '🐛'}</Text>
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View style={[styles.overlay, { backgroundColor: 'rgba(0,0,0,0.4)' }]}>
          <View style={[styles.card, { backgroundColor: c.surface, borderColor: c.border }]}>
            <Text style={[styles.kicker, { color: c.textMuted }]}>REPORT A BUG</Text>
            <Text style={[styles.title, { color: c.primary }]}>What went wrong?</Text>

            <Text style={[styles.label, { color: c.textMuted }]}>TYPE</Text>
            <View style={styles.typeRow}>
              {TYPE_OPTIONS.map((opt) => {
                const active = opt.value === type;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    onPress={() => setType(opt.value)}
                    style={[
                      styles.typeChip,
                      {
                        backgroundColor: active ? c.primary : c.surface,
                        borderColor: active ? c.primary : c.border,
                      },
                    ]}
                  >
                    <Text style={[styles.typeText, { color: active ? '#fff' : c.textMuted }]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={[styles.label, { color: c.textMuted }]}>NOTE</Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: c.surface2,
                  color: c.text,
                  borderColor: c.border,
                },
              ]}
              placeholder="Describe the issue (optional)"
              placeholderTextColor={c.textMuted}
              multiline
              value={note}
              onChangeText={setNote}
            />

            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.btnSecondary, { borderColor: c.border }]}
                onPress={() => setOpen(false)}
                disabled={submitting}
              >
                <Text style={[styles.btnText, { color: c.textMuted }]}>CANCEL</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.btnPrimary, { backgroundColor: c.primary }]}
                onPress={handleSubmit}
                disabled={submitting}
              >
                <Text style={[styles.btnText, { color: '#fff' }]}>
                  {submitting ? 'SAVING…' : 'SUBMIT'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: 16,
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
    zIndex: 9999,
  },
  fabEmoji: {
    fontSize: 22,
  },
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 440,
    padding: 24,
    borderRadius: 12,
    borderWidth: 1,
  },
  kicker: {
    fontFamily: 'DMSans-Medium',
    fontSize: 11,
    letterSpacing: 3,
    marginBottom: 6,
  },
  title: {
    fontFamily: 'CrimsonPro-Italic',
    fontSize: 24,
    marginBottom: 18,
    letterSpacing: -0.3,
  },
  label: {
    fontFamily: 'DMSans-Medium',
    fontSize: 10,
    letterSpacing: 2,
    marginTop: 8,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  typeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  typeChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
  },
  typeText: {
    fontFamily: 'DMSans-Medium',
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  input: {
    minHeight: 80,
    borderRadius: 8,
    borderWidth: 1,
    padding: 12,
    fontFamily: 'CrimsonPro',
    fontSize: 15,
    textAlignVertical: 'top',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 18,
  },
  btnSecondary: {
    borderWidth: 1,
    borderRadius: 6,
    paddingVertical: 10,
    paddingHorizontal: 18,
  },
  btnPrimary: {
    borderRadius: 6,
    paddingVertical: 10,
    paddingHorizontal: 22,
  },
  btnText: {
    fontFamily: 'DMSans-SemiBold',
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
});
