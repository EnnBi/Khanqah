import React, { useState, useEffect, useRef, useCallback } from 'react';
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
import { getConfig } from '../../lib/remote-config';
import { Audio } from 'expo-av';
import { type as typeP, font } from '../../lib/typography';

// ---------------------------------------------------------------------------
// Audio streaming helpers
// ---------------------------------------------------------------------------

/** Derive the WebSocket relay URL from remote config. */
function getRelayUrl(): string {
  const config = getConfig();
  // Prefer explicit audioRelayWsUrl; fall back to deriving from streamRtmpUrl host.
  if (config.audioRelayWsUrl) return config.audioRelayWsUrl;
  try {
    const rtmpHost = new URL(config.streamRtmpUrl.replace('rtmp://', 'http://')).hostname;
    return `ws://${rtmpHost}:3001`;
  } catch {
    return 'ws://165.22.208.103:3001';
  }
}

// ---- Web implementation (MediaRecorder API) --------------------------------

async function startWebStream(): Promise<{
  stop: () => void;
  ws: WebSocket;
}> {
  const relayUrl = getRelayUrl();
  const ws = new WebSocket(relayUrl);

  // 15 s timeout around the mic permission + relay handshake. If the user
  // ignores the permission prompt, or the browser stalls, we surface an
  // error instead of leaving the UI on "STARTING..." forever.
  const timeoutMs = 15_000;
  const timeoutHandle = setTimeout(() => {
    try { ws.close(); } catch (_) {}
  }, timeoutMs);

  let stream: MediaStream;
  try {
    stream = await Promise.race<MediaStream>([
      (navigator as any).mediaDevices.getUserMedia({ audio: true }),
      new Promise<MediaStream>((_, reject) =>
        setTimeout(
          () => reject(new Error('Microphone permission timed out. Allow the mic prompt and try again.')),
          timeoutMs,
        ),
      ),
    ]);
  } catch (err) {
    clearTimeout(timeoutHandle);
    try { ws.close(); } catch (_) {}
    throw err;
  }

  // Prefer opus in webm; fall back to whatever the browser supports
  const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
    ? 'audio/webm;codecs=opus'
    : 'audio/webm';

  const mediaRecorder = new MediaRecorder(stream, { mimeType });

  return new Promise((resolve, reject) => {
    const bail = (msg: string) => {
      clearTimeout(timeoutHandle);
      stream.getTracks().forEach((t: MediaStreamTrack) => t.stop());
      reject(new Error(msg));
    };

    const handshake = () => {
      clearTimeout(timeoutHandle);
      try { ws.send(JSON.stringify({ format: 'webm' })); } catch (_) {}

      mediaRecorder.ondataavailable = (e: BlobEvent) => {
        if (ws.readyState === WebSocket.OPEN && e.data.size > 0) {
          ws.send(e.data);
        }
      };

      mediaRecorder.start(1000); // 1-second chunks

      resolve({
        stop: () => {
          try { mediaRecorder.stop(); } catch (_) {}
          stream.getTracks().forEach((t: MediaStreamTrack) => t.stop());
          try { ws.close(); } catch (_) {}
        },
        ws,
      });
    };

    // Mic permission may have taken long enough that the WebSocket
    // already connected (or already failed) before we got here.
    // Sample readyState first — otherwise we'd miss the onopen event.
    if (ws.readyState === WebSocket.OPEN) {
      handshake();
      return;
    }
    if (ws.readyState === WebSocket.CLOSING || ws.readyState === WebSocket.CLOSED) {
      bail('WebSocket closed before handshake. Relay may be unreachable.');
      return;
    }

    ws.onopen = handshake;
    ws.onerror = () => {
      bail('WebSocket connection to audio relay failed — check that the relay server is running and reachable.');
    };
    ws.onclose = (e) => {
      if (ws.readyState !== WebSocket.OPEN) {
        bail(`WebSocket closed before handshake (code ${e.code}). Relay may be unreachable.`);
      }
    };
  });
}

// ---- Native implementation (expo-av Recording) -----------------------------

async function startNativeStream(): Promise<{
  stop: () => void;
  ws: WebSocket;
}> {
  const relayUrl = getRelayUrl();

  // Request microphone permission
  const { status } = await Audio.requestPermissionsAsync();
  if (status !== 'granted') {
    throw new Error('Microphone permission not granted');
  }

  await Audio.setAudioModeAsync({
    allowsRecordingIOS: true,
    playsInSilentModeIOS: true,
  });

  const ws = new WebSocket(relayUrl);

  return new Promise((resolve, reject) => {
    ws.onopen = async () => {
      // Tell the relay we're sending PCM
      ws.send(JSON.stringify({ format: 'pcm' }));

      // We record in short segments and send each completed file.
      // expo-av doesn't support streaming, so we use a polling loop
      // that records ~1-second clips back-to-back.
      let running = true;

      async function recordLoop() {
        while (running) {
          try {
            const recording = new Audio.Recording();
            await recording.prepareToRecordAsync({
              ...Audio.RecordingOptionsPresets.LOW_QUALITY,
              android: {
                ...Audio.RecordingOptionsPresets.LOW_QUALITY.android,
                extension: '.wav',
                outputFormat: 3, // THREE_GPP fallback — we use WAV where possible
              },
              ios: {
                ...Audio.RecordingOptionsPresets.LOW_QUALITY.ios,
                extension: '.wav',
                outputFormat: 5, // kAudioFormatLinearPCM
                linearPCMBitDepth: 16,
                linearPCMIsBigEndian: false,
                linearPCMIsFloat: false,
              },
              web: {},
            });
            await recording.startAsync();

            // Record for ~1 second
            await new Promise((r) => setTimeout(r, 1000));

            if (!running) {
              await recording.stopAndUnloadAsync().catch(() => {});
              break;
            }

            await recording.stopAndUnloadAsync();
            const uri = recording.getURI();
            if (uri && ws.readyState === WebSocket.OPEN) {
              // Read file and send as binary
              const response = await fetch(uri);
              const blob = await response.blob();
              const arrayBuffer = await blob.arrayBuffer();
              ws.send(arrayBuffer);
            }
          } catch (err) {
            console.warn('[go-live] Recording chunk error:', err);
            // Small delay before retrying
            await new Promise((r) => setTimeout(r, 500));
          }
        }
      }

      recordLoop().catch(console.warn);

      resolve({
        stop: () => {
          running = false;
          Audio.setAudioModeAsync({ allowsRecordingIOS: false }).catch(() => {});
          try { ws.close(); } catch (_) {}
        },
        ws,
      });
    };

    ws.onerror = () => {
      reject(new Error('WebSocket connection to audio relay failed'));
    };
  });
}

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
  const c = theme.colors;

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
  const [streamError, setStreamError] = useState<string | null>(null);

  // Holds the stop() handle for the active audio stream
  const streamRef = useRef<{ stop: () => void; ws: WebSocket } | null>(null);

  // Pulse animation for the orb
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseOpacity = useRef(new Animated.Value(0.15)).current;

  // Listener count via Supabase Realtime presence. While a session is
  // live, listeners .track() on the `live:<sessionId>` channel; we
  // simply count presence members. Cleanup on session end / unmount.
  useEffect(() => {
    if (!isBroadcasting || !sessionId) {
      setListenerCount(0);
      return;
    }
    const channel = supabase.channel(`live:${sessionId}`, {
      config: { presence: { key: 'broadcaster' } },
    });
    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        // Only count listener entries, exclude the broadcaster itself.
        const listeners = Object.keys(state).filter((k) => k !== 'broadcaster');
        setListenerCount(listeners.length);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ role: 'broadcaster' });
        }
      });
    return () => {
      channel.unsubscribe();
    };
  }, [isBroadcasting, sessionId]);

  useEffect(() => {
    if (!isBroadcasting) {
      pulseAnim.setValue(1);
      pulseOpacity.setValue(0.15);
      return;
    }
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.14,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    const opacityPulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseOpacity, {
          toValue: 0.35,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseOpacity, {
          toValue: 0.12,
          duration: 900,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    );
    pulse.start();
    opacityPulse.start();
    return () => {
      pulse.stop();
      opacityPulse.stop();
    };
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
    setStreamError(null);

    // ── Start audio capture & WebSocket relay ─────────────────────────────
    try {
      const handle =
        Platform.OS === 'web' ? await startWebStream() : await startNativeStream();

      streamRef.current = handle;

      // Monitor for unexpected disconnects
      handle.ws.onclose = () => {
        if (streamRef.current === handle) {
          setStreamError('Audio relay connection lost');
        }
      };
    } catch (err: any) {
      setIsStarting(false);
      Alert.alert(
        'Streaming Error',
        err?.message || 'Could not start audio capture. Check microphone permissions and that the relay server is running.',
      );
      return;
    }

    const { data, error } = await supabase
      .from('live_sessions')
      .insert({
        title_en: titleEn.trim(),
        title_ur: titleUr.trim(),
        stream_url: getConfig().streamHlsUrl,
        started_by: user.id,
        status: 'live',
      })
      .select()
      .single();

    setIsStarting(false);

    if (error) {
      // Stop the audio stream since we can't create the session
      streamRef.current?.stop();
      streamRef.current = null;
      Alert.alert('Error', `Failed to start broadcast: ${error.message}`);
      return;
    }

    setSessionId(data.id);
    setStartTime(new Date());
    setElapsedSeconds(0);
    setIsBroadcasting(true);
  }

  async function handleStopBroadcast() {
    // Alert.alert's onPress callbacks don't fire reliably on React Native
    // Web, which was silently eating the "Stop" confirmation. Use the
    // browser's native confirm() on web; Alert.alert still works on native.
    const confirmed =
      Platform.OS === 'web'
        ? window.confirm('End this broadcast? Listeners will disconnect.')
        : await new Promise<boolean>((resolve) => {
            Alert.alert(
              'Stop Broadcasting',
              'Are you sure you want to end this broadcast?',
              [
                { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
                { text: 'Stop', style: 'destructive', onPress: () => resolve(true) },
              ],
            );
          });

    if (!confirmed) return;
    if (!sessionId) return;

    setIsStopping(true);

    // Stop audio capture & WebSocket relay
    streamRef.current?.stop();
    streamRef.current = null;
    setStreamError(null);

    const { error } = await supabase
      .from('live_sessions')
      .update({ status: 'processing', ended_at: new Date().toISOString() })
      .eq('id', sessionId);

    setIsStopping(false);

    if (error) {
      if (Platform.OS === 'web') {
        window.alert(`Failed to stop broadcast: ${error.message}`);
      } else {
        Alert.alert('Error', `Failed to stop broadcast: ${error.message}`);
      }
      return;
    }

    setIsBroadcasting(false);
    setSessionId(null);
    setStartTime(null);
    setElapsedSeconds(0);
    setListenerCount(0);
  }

  const styles = StyleSheet.create({
    flex: { flex: 1 },
    container: { flex: 1, backgroundColor: c.background },

    // ── Minimal header ───────────────────────────────────────
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

    // ── Live header variant ──────────────────────────────────
    liveHeaderDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: c.liveRed,
      marginRight: 8,
    },
    liveHeaderText: {
      fontFamily: font.sansBold,
      fontSize: 11,
      letterSpacing: 3,
      textTransform: 'uppercase',
      color: c.liveRed,
    },

    // ── Idle state ───────────────────────────────────────────
    idleHero: {
      alignItems: 'center',
      paddingTop: 40,
      paddingBottom: 20,
      paddingHorizontal: 28,
    },
    idleHeading: {
      fontFamily: font.serifItalic,
      fontSize: 28,
      color: c.primary,
      letterSpacing: -0.3,
      marginBottom: 10,
    },
    idleSubtext: {
      fontFamily: font.sans,
      fontSize: 14,
      color: c.textMuted,
      textAlign: 'center',
      lineHeight: 20,
    },

    // ── Big mic button ───────────────────────────────────────
    buttonSection: {
      alignItems: 'center',
      paddingVertical: 36,
    },
    bigButton: {
      width: 120,
      height: 120,
      borderRadius: 60,
      backgroundColor: c.liveRed,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: c.liveRed,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.45,
      shadowRadius: 20,
      elevation: 12,
    },
    bigButtonMic: {
      fontFamily: font.serif,
      fontSize: 40,
      color: '#ffffff',
      lineHeight: 48,
    },
    bigButtonLabel: {
      ...typeP.label,
      color: '#ffffff',
      marginTop: 14,
    },

    // ── Form (idle) ──────────────────────────────────────────
    formSection: { paddingHorizontal: 20, paddingBottom: 32 },
    fieldLabel: {
      ...typeP.labelSmall,
      color: c.textMuted,
      marginTop: 24,
      marginBottom: 8,
    },
    underlineInput: {
      fontFamily: font.serif,
      fontSize: 17,
      color: c.text,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
      paddingVertical: 8,
      paddingHorizontal: 0,
    },
    underlineInputRtl: {
      textAlign: 'right',
      writingDirection: 'rtl',
      fontFamily: font.urdu,
      fontSize: 18,
    },

    // ── Toggles ──────────────────────────────────────────────
    togglesWrap: {
      borderTopWidth: 1,
      borderTopColor: c.border,
      marginHorizontal: 20,
      marginBottom: 48,
    },
    toggleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: c.border,
    },
    toggleLabel: {
      fontFamily: font.serif,
      fontSize: 15,
      color: c.text,
    },

    // ── Stats row (idle preview) ─────────────────────────────
    statsRow: {
      flexDirection: 'row',
      gap: 10,
      marginHorizontal: 20,
      marginTop: 4,
      marginBottom: 24,
    },
    statCard: {
      flex: 1,
      backgroundColor: c.surface,
      borderRadius: 4,
      borderWidth: 1,
      borderColor: c.border,
      paddingVertical: 16,
      paddingHorizontal: 14,
    },
    statLabel: {
      ...typeP.labelSmall,
      color: c.textMuted,
      marginBottom: 6,
    },
    statValue: {
      fontFamily: font.serif,
      fontSize: 22,
      color: c.primary,
    },

    // ── Broadcasting state ───────────────────────────────────
    broadcastContainer: { flex: 1, backgroundColor: c.background },
    orbSection: {
      alignItems: 'center',
      paddingVertical: 44,
    },
    orbOuter: {
      width: 140,
      height: 140,
      borderRadius: 70,
      alignItems: 'center',
      justifyContent: 'center',
    },
    orbInner: {
      width: 110,
      height: 110,
      borderRadius: 55,
      backgroundColor: c.liveRed,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: c.liveRed,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.5,
      shadowRadius: 20,
      elevation: 12,
    },
    orbMicText: {
      fontFamily: font.serif,
      fontSize: 44,
      color: '#ffffff',
      lineHeight: 52,
    },
    timerSection: { alignItems: 'center', paddingBottom: 8 },
    timerText: {
      fontFamily: font.serif,
      fontSize: 40,
      color: c.text,
      letterSpacing: 4,
      fontVariant: ['tabular-nums'],
      lineHeight: 48,
    },
    broadcastStatsRow: {
      flexDirection: 'row',
      gap: 10,
      marginHorizontal: 20,
      marginTop: 20,
      marginBottom: 8,
    },
    broadcastStatCard: {
      flex: 1,
      backgroundColor: c.surface,
      borderRadius: 4,
      borderWidth: 1,
      borderColor: c.border,
      paddingVertical: 14,
      paddingHorizontal: 14,
    },
    broadcastStatLabel: {
      ...typeP.labelSmall,
      color: c.textMuted,
      marginBottom: 4,
    },
    broadcastStatValue: {
      fontFamily: font.serif,
      fontSize: 20,
      color: c.liveRed,
    },
    broadcastStatValueGreen: {
      fontFamily: font.serif,
      fontSize: 14,
      color: '#16a34a',
    },

    // ── Session title display ────────────────────────────────
    sessionTitleCard: {
      marginHorizontal: 20,
      marginTop: 8,
      backgroundColor: c.surface,
      borderRadius: 4,
      borderWidth: 1,
      borderColor: c.border,
      padding: 16,
    },
    sessionTitleLabel: {
      ...typeP.labelSmall,
      color: c.textMuted,
      marginBottom: 8,
    },
    sessionTitleEn: {
      fontFamily: font.serif,
      fontSize: 16,
      color: c.text,
      marginBottom: 4,
    },
    sessionTitleUr: {
      fontFamily: font.urdu,
      fontSize: 18,
      color: c.text,
      textAlign: 'right',
      writingDirection: 'rtl',
    },

    // ── Stop button ──────────────────────────────────────────
    stopButton: {
      marginHorizontal: 20,
      marginTop: 28,
      marginBottom: 60,
      borderRadius: 4,
      borderWidth: 1.5,
      borderColor: c.liveRed,
      paddingVertical: 16,
      alignItems: 'center',
    },
    stopButtonText: {
      ...typeP.button,
      color: c.liveRed,
    },

    // ── Error banner ─────────────────────────────────────────
    errorBanner: {
      marginHorizontal: 20,
      marginTop: 12,
      backgroundColor: '#fef2f2',
      borderRadius: 4,
      borderWidth: 1,
      borderColor: '#fca5a5',
      paddingHorizontal: 14,
      paddingVertical: 10,
    },
    errorBannerText: {
      fontFamily: font.sansSemiBold,
      fontSize: 13,
      color: '#dc2626',
      textAlign: 'center',
    },
  });

  // ── During broadcast ────────────────────────────────────────────────────
  if (isBroadcasting) {
    return (
      <ScrollView style={styles.broadcastContainer} showsVerticalScrollIndicator={false}>
        {/* Minimal live header */}
        <View style={styles.header}>
          <View style={styles.liveHeaderDot} />
          <Text style={styles.liveHeaderText}>Live Broadcast</Text>
          <View style={styles.headerSpacer} />
          <Text style={styles.headerLabel}>GO LIVE</Text>
        </View>

        {/* Pulsing red orb */}
        <View style={styles.orbSection}>
          <Animated.View
            style={[
              styles.orbOuter,
              {
                transform: [{ scale: pulseAnim }],
                backgroundColor: c.liveRed,
                opacity: pulseOpacity,
              },
            ]}
          />
          <View style={[styles.orbInner, { position: 'absolute' }]}>
            <Text style={styles.orbMicText}>◉</Text>
          </View>
        </View>

        {/* Duration timer */}
        <View style={styles.timerSection}>
          <Text style={styles.timerText}>{formatDuration(elapsedSeconds)}</Text>
        </View>

        {/* Stats row */}
        <View style={styles.broadcastStatsRow}>
          <View style={styles.broadcastStatCard}>
            <Text style={styles.broadcastStatLabel}>LISTENERS</Text>
            <Text style={styles.broadcastStatValue}>{listenerCount}</Text>
          </View>
          <View style={styles.broadcastStatCard}>
            <Text style={styles.broadcastStatLabel}>RECORDING</Text>
            <Text style={styles.broadcastStatValueGreen}>Active</Text>
          </View>
        </View>

        {/* Stream error banner */}
        {streamError && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>{streamError}</Text>
          </View>
        )}

        {/* Session title display */}
        <View style={styles.sessionTitleCard}>
          <Text style={styles.sessionTitleLabel}>SESSION</Text>
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
            {isStopping ? 'STOPPING...' : 'STOP BROADCAST'}
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
        {/* Minimal header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backBtnText}>‹ Back</Text>
          </TouchableOpacity>
          <View style={styles.headerSpacer} />
          <Text style={styles.headerLabel}>GO LIVE</Text>
        </View>

        {/* Idle hero text */}
        <View style={styles.idleHero}>
          <Text style={styles.idleHeading}>Ready to broadcast</Text>
          <Text style={styles.idleSubtext}>
            Fill in the session details below,{'\n'}then tap the button to go live.
          </Text>
        </View>

        {/* Big START button */}
        <View style={styles.buttonSection}>
          <TouchableOpacity
            style={styles.bigButton}
            onPress={handleStartBroadcast}
            activeOpacity={0.85}
            disabled={isStarting}
          >
            <Text style={styles.bigButtonMic}>◉</Text>
          </TouchableOpacity>
          <Text style={styles.bigButtonLabel}>
            {isStarting ? 'STARTING...' : 'START BROADCAST'}
          </Text>
        </View>

        {/* Form fields */}
        <View style={styles.formSection}>
          <Text style={styles.fieldLabel}>SESSION TITLE (ENGLISH)</Text>
          <TextInput
            style={styles.underlineInput}
            placeholder="Enter session title..."
            placeholderTextColor={c.textMuted}
            value={titleEn}
            onChangeText={setTitleEn}
            returnKeyType="next"
          />

          <Text style={styles.fieldLabel}>SESSION TITLE (URDU)</Text>
          <TextInput
            style={[styles.underlineInput, styles.underlineInputRtl]}
            placeholder="عنوان درج کریں..."
            placeholderTextColor={c.textMuted}
            value={titleUr}
            onChangeText={setTitleUr}
            textAlign="right"
            returnKeyType="done"
          />
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>LISTENERS</Text>
            <Text style={styles.statValue}>0</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>DURATION</Text>
            <Text style={styles.statValue}>00:00</Text>
          </View>
        </View>

        {/* Toggles */}
        <View style={styles.togglesWrap}>
          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>Auto-save to archive.org</Text>
            <ToggleSwitch value={autoSave} onValueChange={setAutoSave} colors={c} />
          </View>
          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>Send push notification</Text>
            <ToggleSwitch value={sendPush} onValueChange={setSendPush} colors={c} />
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
