import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Easing,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../providers/ThemeProvider';
import { useAuth } from '../../providers/AuthProvider';
import { supabase } from '../../lib/supabase';

// TODO: Replace with actual server IP once configured on DigitalOcean.
// For actual audio capture + RTMP streaming from the phone, a native RTMP
// library is required (e.g. react-native-rtmp-publisher). This initial
// implementation only creates/closes the live_sessions record and shows
// the broadcasting UI. Wire up the native module when it is available.
const STREAM_HLS_URL = 'http://YOUR_SERVER_IP:8080/hls/stream.m3u8';

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) {
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// Simple toggle switch component
function ToggleSwitch({
  value,
  onValueChange,
  colors,
}: {
  value: boolean;
  onValueChange: (v: boolean) => void;
  colors: ReturnType<typeof useTheme>['theme']['colors'];
}) {
  const translateX = useRef(new Animated.Value(value ? 20 : 0)).current;

  useEffect(() => {
    Animated.timing(translateX, {
      toValue: value ? 20 : 0,
      duration: 160,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    }).start();
  }, [value]);

  return (
    <TouchableOpacity
      onPress={() => onValueChange(!value)}
      activeOpacity={0.8}
      style={[
        toggleStyles.track,
        {
          backgroundColor: value ? '#dc2626' : colors.surface3,
          borderColor: value ? '#dc2626' : colors.border,
        },
      ]}
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
    >
      <Animated.View
        style={[
          toggleStyles.thumb,
          { backgroundColor: '#ffffff', transform: [{ translateX }] },
        ]}
      />
    </TouchableOpacity>
  );
}

const toggleStyles = StyleSheet.create({
  track: {
    width: 44,
    height: 26,
    borderRadius: 13,
    borderWidth: 1,
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  thumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
});

export default function GoLiveScreen() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const router = useRouter();
  const colors = theme.colors;

  // Form state (idle)
  const [titleEn, setTitleEn] = useState('');
  const [titleUr, setTitleUr] = useState('');
  const [autoSave, setAutoSave] = useState(true);
  const [sendPush, setSendPush] = useState(true);

  // Broadcast state
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isStarting, setIsStarting] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const [listenerCount, setListenerCount] = useState(0);

  // Pulse animation for the record button
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!isBroadcasting) {
      pulseAnim.setValue(1);
      return;
    }
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.12,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, [isBroadcasting]);

  // Duration timer
  useEffect(() => {
    if (!isBroadcasting || !startTime) return;
    const interval = setInterval(() => {
      const diff = Math.floor((Date.now() - startTime.getTime()) / 1000);
      setElapsedSeconds(diff);
    }, 1000);
    return () => clearInterval(interval);
  }, [isBroadcasting, startTime]);

  async function handleStartBroadcast() {
    if (!titleEn.trim()) {
      Alert.alert('Required', 'Please enter a session title in English.');
      return;
    }
    if (!titleUr.trim()) {
      Alert.alert('Required', 'Please enter a session title in Urdu.');
      return;
    }
    if (!user) {
      Alert.alert('Error', 'You must be logged in to start a broadcast.');
      return;
    }

    setIsStarting(true);

    // TODO: Start RTMP stream capture here using react-native-rtmp-publisher
    // or a similar native module before inserting the session record.

    const { data, error } = await supabase
      .from('live_sessions')
      .insert({
        title_en: titleEn.trim(),
        title_ur: titleUr.trim(),
        stream_url: STREAM_HLS_URL,
        started_by: user.id,
        status: 'live',
      })
      .select()
      .single();

    setIsStarting(false);

    if (error) {
      Alert.alert('Error', `Failed to start broadcast: ${error.message}`);
      return;
    }

    setSessionId(data.id);
    setStartTime(new Date());
    setElapsedSeconds(0);
    setIsBroadcasting(true);
  }

  async function handleStopBroadcast() {
    Alert.alert(
      'Stop Broadcasting',
      'Are you sure you want to end this broadcast?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Stop',
          style: 'destructive',
          onPress: async () => {
            if (!sessionId) return;
            setIsStopping(true);

            // TODO: Stop RTMP capture here.

            const { error } = await supabase
              .from('live_sessions')
              .update({ status: 'processing', ended_at: new Date().toISOString() })
              .eq('id', sessionId);

            setIsStopping(false);

            if (error) {
              Alert.alert('Error', `Failed to stop broadcast: ${error.message}`);
              return;
            }

            setIsBroadcasting(false);
            setSessionId(null);
            setStartTime(null);
            setElapsedSeconds(0);
            setListenerCount(0);

            Alert.alert(
              'Broadcast Ended',
              'The session has been saved. The server will process and upload the recording shortly.',
              [{ text: 'OK' }],
            );
          },
        },
      ],
    );
  }

  const styles = StyleSheet.create({
    flex: { flex: 1 },
    container: { flex: 1, backgroundColor: colors.background },

    // ── Header ──────────────────────────────────────────────
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingTop: 60,
      paddingBottom: 20,
      gap: 12,
    },
    backButton: { padding: 4, marginRight: 4 },
    backButtonText: { fontSize: 22, color: colors.primary },
    headerTitle: {
      fontSize: 28,
      fontWeight: '700',
      color: colors.text,
      flex: 1,
    },
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

    // ── Live header (during broadcast) ──────────────────────
    liveHeaderCenter: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    liveDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: '#ef4444',
    },
    liveText: {
      fontSize: 22,
      fontWeight: '700',
      color: '#ef4444',
    },

    // ── Main action button ───────────────────────────────────
    buttonSection: {
      alignItems: 'center',
      paddingVertical: 32,
    },
    bigButton: {
      width: 120,
      height: 120,
      borderRadius: 60,
      backgroundColor: '#dc2626',
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#dc2626',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.5,
      shadowRadius: 16,
      elevation: 12,
      gap: 4,
    },
    bigButtonEmoji: { fontSize: 36 },
    bigButtonLabel: {
      fontSize: 11,
      fontWeight: '800',
      color: '#ffffff',
      letterSpacing: 2,
    },

    // ── Form section (idle) ──────────────────────────────────
    formSection: { paddingHorizontal: 20, paddingBottom: 60 },
    sectionLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      marginBottom: 10,
      marginTop: 24,
    },
    input: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 15,
      color: colors.text,
    },
    inputRtl: { textAlign: 'right' },

    // ── Stats row ────────────────────────────────────────────
    statsRow: {
      flexDirection: 'row',
      gap: 12,
      marginHorizontal: 20,
      marginTop: 16,
    },
    statCard: {
      flex: 1,
      backgroundColor: colors.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      paddingVertical: 14,
      alignItems: 'center',
      gap: 4,
    },
    statLabel: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
    },
    statValue: {
      fontSize: 22,
      fontWeight: '700',
      color: colors.text,
    },
    statValueRed: { color: '#ef4444' },

    // ── Toggle row ───────────────────────────────────────────
    toggleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    toggleLabel: {
      fontSize: 15,
      color: colors.text,
      flex: 1,
    },

    // ── Duration timer (active) ──────────────────────────────
    timerSection: { alignItems: 'center', paddingVertical: 16 },
    timerText: {
      fontSize: 32,
      fontWeight: '200',
      color: colors.text,
      letterSpacing: 4,
      fontVariant: ['tabular-nums'],
    },

    // ── Session title display (active) ───────────────────────
    sessionTitleSection: {
      marginHorizontal: 20,
      marginTop: 16,
      backgroundColor: colors.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 14,
      gap: 4,
    },
    sessionTitleLabel: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
    },
    sessionTitleEn: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
    },
    sessionTitleUr: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
      textAlign: 'right',
    },

    // ── Recording status card ────────────────────────────────
    recordingStatus: {
      flex: 1,
      backgroundColor: colors.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      paddingVertical: 14,
      alignItems: 'center',
      gap: 6,
    },
    recordingStatusLabel: {
      fontSize: 11,
      fontWeight: '600',
      color: colors.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
    },
    recordingStatusIcon: { fontSize: 20 },
    recordingStatusText: {
      fontSize: 13,
      fontWeight: '600',
      color: '#22c55e',
    },

    // ── Stop button ──────────────────────────────────────────
    stopButton: {
      marginHorizontal: 20,
      marginTop: 32,
      marginBottom: 60,
      backgroundColor: '#dc2626',
      borderRadius: 14,
      paddingVertical: 16,
      alignItems: 'center',
    },
    stopButtonText: {
      fontSize: 16,
      fontWeight: '700',
      color: '#ffffff',
    },
  });

  // ── During broadcast ────────────────────────────────────────────────────
  if (isBroadcasting) {
    return (
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.liveHeaderCenter}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>Live</Text>
          </View>
          <View style={styles.adminBadge}>
            <Text style={styles.adminBadgeText}>ADMIN</Text>
          </View>
        </View>

        {/* Big pulsing record button */}
        <View style={styles.buttonSection}>
          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <View style={styles.bigButton}>
              <Text style={styles.bigButtonEmoji}>🎤</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <View style={[styles.liveDot, { width: 6, height: 6, borderRadius: 3 }]} />
                <Text style={styles.bigButtonLabel}>RECORDING</Text>
              </View>
            </View>
          </Animated.View>
        </View>

        {/* Duration timer */}
        <View style={styles.timerSection}>
          <Text style={styles.timerText}>{formatDuration(elapsedSeconds)}</Text>
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Listeners</Text>
            <Text style={[styles.statValue, styles.statValueRed]}>{listenerCount}</Text>
          </View>
          <View style={styles.recordingStatus}>
            <Text style={styles.recordingStatusLabel}>Recording</Text>
            <Text style={styles.recordingStatusIcon}>✅</Text>
            <Text style={styles.recordingStatusText}>Active</Text>
          </View>
        </View>

        {/* Session title display */}
        <View style={styles.sessionTitleSection}>
          <Text style={styles.sessionTitleLabel}>Session</Text>
          <Text style={styles.sessionTitleEn}>{titleEn}</Text>
          <Text style={styles.sessionTitleUr}>{titleUr}</Text>
        </View>

        {/* Stop button */}
        <TouchableOpacity
          style={styles.stopButton}
          onPress={handleStopBroadcast}
          activeOpacity={0.8}
          disabled={isStopping}
        >
          <Text style={styles.stopButtonText}>
            {isStopping ? 'Stopping...' : 'Stop Broadcasting'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  // ── Idle (before broadcast) ─────────────────────────────────────────────
  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Go Live</Text>
          <View style={styles.adminBadge}>
            <Text style={styles.adminBadgeText}>ADMIN</Text>
          </View>
        </View>

        {/* Big START button */}
        <View style={styles.buttonSection}>
          <TouchableOpacity
            style={styles.bigButton}
            onPress={handleStartBroadcast}
            activeOpacity={0.85}
            disabled={isStarting}
          >
            <Text style={styles.bigButtonEmoji}>🎤</Text>
            <Text style={styles.bigButtonLabel}>{isStarting ? '...' : 'START'}</Text>
          </TouchableOpacity>
        </View>

        {/* Form fields */}
        <View style={styles.formSection}>
          <Text style={styles.sectionLabel}>Session Title (English)</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter session title..."
            placeholderTextColor={colors.textMuted}
            value={titleEn}
            onChangeText={setTitleEn}
            returnKeyType="next"
          />

          <Text style={styles.sectionLabel}>Session Title (Urdu)</Text>
          <TextInput
            style={[styles.input, styles.inputRtl]}
            placeholder="عنوان درج کریں..."
            placeholderTextColor={colors.textMuted}
            value={titleUr}
            onChangeText={setTitleUr}
            textAlign="right"
            returnKeyType="done"
          />
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Listeners</Text>
            <Text style={styles.statValue}>0</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Duration</Text>
            <Text style={styles.statValue}>00:00</Text>
          </View>
        </View>

        {/* Toggles */}
        <View style={{ marginTop: 24, borderTopWidth: 1, borderTopColor: colors.border }}>
          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>Auto-save to archive.org</Text>
            <ToggleSwitch value={autoSave} onValueChange={setAutoSave} colors={colors} />
          </View>
          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>Send push notification</Text>
            <ToggleSwitch value={sendPush} onValueChange={setSendPush} colors={colors} />
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
