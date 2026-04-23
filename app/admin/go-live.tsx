import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../providers/ThemeProvider';
import { useAuth } from '../../providers/AuthProvider';
import { supabase } from '../../lib/supabase';
import { useSafeBack } from '../../hooks/useSafeBack';
import { broadcast, BroadcastLockedError } from '../../lib/broadcast';
import { useBroadcastState } from '../../hooks/useBroadcastState';

export default function GoLiveScreen() {
  const { theme } = useTheme();
  const c = theme.colors;
  const router = useRouter();
  const goBack = useSafeBack('/');
  const { user } = useAuth();
  const { active, error: broadcastError, setError: setBroadcastError } = useBroadcastState();

  const [titleEn, setTitleEn] = useState('');
  const [titleUr, setTitleUr] = useState('');
  const [starting, setStarting] = useState(false);
  const [stopping, setStopping] = useState(false);

  const [foreignRow, setForeignRow] = useState<
    { id: string; started_by: string; title_en: string | null; title_ur: string | null } | null
  >(null);
  const [ownStaleRow, setOwnStaleRow] = useState<
    { id: string; title_en: string | null; title_ur: string | null } | null
  >(null);

  const refresh = useCallback(async () => {
    const cutoff = new Date(Date.now() - 90_000).toISOString();
    await supabase
      .from('live_sessions')
      .update({ status: 'ended', ended_at: new Date().toISOString() })
      .eq('status', 'live')
      .lt('last_heartbeat_at', cutoff);

    const { data } = await supabase
      .from('live_sessions')
      .select('id, started_by, title_en, title_ur, last_heartbeat_at')
      .eq('status', 'live')
      .limit(1)
      .maybeSingle();

    if (!data) {
      setForeignRow(null);
      setOwnStaleRow(null);
      return;
    }

    if (user && data.started_by === user.id) {
      if (!active) setOwnStaleRow(data);
      setForeignRow(null);
    } else {
      setForeignRow(data);
      setOwnStaleRow(null);
    }
  }, [active, user]);

  useEffect(() => { refresh(); }, [refresh]);

  const onStart = useCallback(async () => {
    if (!user) return;
    if (!titleEn.trim() || !titleUr.trim()) {
      setBroadcastError('Please enter both titles.');
      return;
    }
    if (starting || active) return;
    setStarting(true);
    setBroadcastError(null);
    try {
      await broadcast.start({
        title_en: titleEn.trim(),
        title_ur: titleUr.trim(),
        userId: user.id,
      });
      setTitleEn('');
      setTitleUr('');
    } catch (err) {
      if (err instanceof BroadcastLockedError) {
        await refresh();
        return;
      }
      setBroadcastError(err instanceof Error ? err.message : String(err));
    } finally {
      setStarting(false);
    }
  }, [user, titleEn, titleUr, starting, active, refresh, setBroadcastError]);

  const onStop = useCallback(async () => {
    if (stopping) return;
    setStopping(true);
    try {
      await broadcast.stop();
      await refresh();
    } finally {
      setStopping(false);
    }
  }, [stopping, refresh]);

  const onResume = useCallback(async () => {
    if (!user || !ownStaleRow) return;
    setStarting(true);
    setBroadcastError(null);
    try {
      await broadcast.start({
        title_en: ownStaleRow.title_en ?? '',
        title_ur: ownStaleRow.title_ur ?? '',
        userId: user.id,
        resumeExistingId: ownStaleRow.id,
      });
      setOwnStaleRow(null);
    } catch (err) {
      setBroadcastError(err instanceof Error ? err.message : String(err));
    } finally {
      setStarting(false);
    }
  }, [user, ownStaleRow, setBroadcastError]);

  const onStopOwnStale = useCallback(async () => {
    if (!ownStaleRow) return;
    setStopping(true);
    try {
      await supabase
        .from('live_sessions')
        .update({ status: 'ended', ended_at: new Date().toISOString() })
        .eq('id', ownStaleRow.id);
      await refresh();
    } finally {
      setStopping(false);
    }
  }, [ownStaleRow, refresh]);

  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!active) { setElapsed(0); return; }
    const tick = () => setElapsed(Math.floor((Date.now() - active.startedAt) / 1000));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [active]);

  if (active) {
    const mm = Math.floor(elapsed / 60).toString().padStart(2, '0');
    const ss = (elapsed % 60).toString().padStart(2, '0');
    return (
      <View style={{ flex: 1, backgroundColor: c.background, padding: 24, justifyContent: 'center' }}>
        <Text style={{ color: c.liveRed, fontSize: 12, letterSpacing: 1.5, textTransform: 'uppercase', textAlign: 'center', fontFamily: 'DMSans-SemiBold' }}>● ON AIR</Text>
        <Text style={{ color: c.text, fontSize: 28, fontFamily: 'CrimsonPro-SemiBold', textAlign: 'center', marginTop: 10 }}>
          {active.titleEn}
        </Text>
        <Text style={{ color: c.textMuted, fontSize: 16, fontFamily: 'CrimsonPro-Italic', textAlign: 'center', marginTop: 4 }}>
          {active.titleUr}
        </Text>
        <Text style={{ color: c.accent, fontSize: 36, fontFamily: 'CrimsonPro-SemiBold', textAlign: 'center', marginTop: 24 }}>
          {mm}:{ss}
        </Text>
        <TouchableOpacity
          onPress={onStop}
          disabled={stopping}
          style={{ marginTop: 32, backgroundColor: c.liveRed, paddingVertical: 18, borderRadius: 999, alignItems: 'center', opacity: stopping ? 0.5 : 1 }}
          activeOpacity={0.85}
        >
          <Text style={{ color: '#fff', fontFamily: 'DMSans-SemiBold', letterSpacing: 2, textTransform: 'uppercase' }}>
            {stopping ? 'Stopping…' : 'Stop broadcast'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (foreignRow) {
    return (
      <View style={{ flex: 1, backgroundColor: c.background, padding: 24, justifyContent: 'center' }}>
        <Text style={{ color: c.textMuted, fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', textAlign: 'center', fontFamily: 'DMSans-Medium' }}>● LIVE NOW</Text>
        <Text style={{ color: c.text, fontSize: 24, fontFamily: 'CrimsonPro-SemiBold', textAlign: 'center', marginTop: 10 }}>
          {foreignRow.title_en || foreignRow.title_ur || 'Majlis'}
        </Text>
        <Text style={{ color: c.textMuted, fontSize: 14, fontFamily: 'CrimsonPro-Italic', textAlign: 'center', marginTop: 10 }}>
          Another admin is already broadcasting. Only one live session is allowed at a time.
        </Text>
        <TouchableOpacity
          onPress={() => router.push('/player/live')}
          style={{ marginTop: 24, backgroundColor: c.primary, paddingVertical: 16, borderRadius: 999, alignItems: 'center' }}
          activeOpacity={0.85}
        >
          <Text style={{ color: c.onPrimary, fontFamily: 'DMSans-SemiBold', letterSpacing: 2, textTransform: 'uppercase' }}>
            Join as listener
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (ownStaleRow) {
    return (
      <View style={{ flex: 1, backgroundColor: c.background, padding: 24, justifyContent: 'center' }}>
        <Text style={{ color: c.textMuted, fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', textAlign: 'center', fontFamily: 'DMSans-Medium' }}>Session open</Text>
        <Text style={{ color: c.text, fontSize: 22, fontFamily: 'CrimsonPro-SemiBold', textAlign: 'center', marginTop: 10 }}>
          {ownStaleRow.title_en || ownStaleRow.title_ur}
        </Text>
        <Text style={{ color: c.textMuted, fontSize: 14, fontFamily: 'CrimsonPro-Italic', textAlign: 'center', marginTop: 10 }}>
          You have a session marked live but no broadcaster is connected. Resume to reopen the mic, or stop it now.
        </Text>
        <TouchableOpacity
          onPress={onResume}
          disabled={starting}
          style={{ marginTop: 24, backgroundColor: c.primary, paddingVertical: 16, borderRadius: 999, alignItems: 'center', opacity: starting ? 0.5 : 1 }}
          activeOpacity={0.85}
        >
          <Text style={{ color: c.onPrimary, fontFamily: 'DMSans-SemiBold', letterSpacing: 2, textTransform: 'uppercase' }}>
            {starting ? 'Resuming…' : 'Resume broadcast'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={onStopOwnStale}
          disabled={stopping}
          style={{ marginTop: 12, borderColor: c.liveRed, borderWidth: 1, paddingVertical: 16, borderRadius: 999, alignItems: 'center', opacity: stopping ? 0.5 : 1 }}
          activeOpacity={0.85}
        >
          <Text style={{ color: c.liveRed, fontFamily: 'DMSans-SemiBold', letterSpacing: 2, textTransform: 'uppercase' }}>
            {stopping ? 'Stopping…' : 'Stop it'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: c.background, padding: 24, justifyContent: 'center' }}>
      <Text style={{ color: c.accent, fontFamily: 'CrimsonPro-Italic', fontSize: 22, textAlign: 'center', marginBottom: 8 }}>
        Ready to broadcast
      </Text>
      <Text style={{ color: c.textMuted, fontFamily: 'CrimsonPro', fontSize: 14, textAlign: 'center', marginBottom: 24 }}>
        Fill in the session details below, then tap the button to go live.
      </Text>

      <Text style={{ color: c.textMuted, fontFamily: 'DMSans-Medium', fontSize: 10, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 6 }}>
        Session title (English)
      </Text>
      <TextInput
        value={titleEn}
        onChangeText={setTitleEn}
        placeholder="Title"
        placeholderTextColor={c.textMuted}
        style={{ backgroundColor: c.surface, borderColor: c.border, borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 14, color: c.text, fontFamily: 'CrimsonPro' }}
      />

      <Text style={{ color: c.textMuted, fontFamily: 'DMSans-Medium', fontSize: 10, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 6 }}>
        Session title (Urdu)
      </Text>
      <TextInput
        value={titleUr}
        onChangeText={setTitleUr}
        placeholder="عنوان"
        placeholderTextColor={c.textMuted}
        textAlign="right"
        style={{ backgroundColor: c.surface, borderColor: c.border, borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 14, color: c.text, fontFamily: 'NastaleeqUrdu', fontSize: 16 }}
      />

      {broadcastError ? (
        <Text style={{ color: c.liveRed, fontFamily: 'DMSans-Medium', fontSize: 13, textAlign: 'center', marginBottom: 12 }}>
          {broadcastError}
        </Text>
      ) : null}

      <TouchableOpacity
        onPress={onStart}
        disabled={starting}
        style={{ backgroundColor: c.liveRed, paddingVertical: 18, borderRadius: 999, alignItems: 'center', opacity: starting ? 0.6 : 1 }}
        activeOpacity={0.85}
      >
        {starting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={{ color: '#fff', fontFamily: 'DMSans-SemiBold', letterSpacing: 2, textTransform: 'uppercase' }}>
            Start broadcast
          </Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity onPress={goBack} style={{ marginTop: 20, alignItems: 'center' }}>
        <Text style={{ color: c.primary, fontFamily: 'CrimsonPro-Medium', fontSize: 14 }}>‹ Back</Text>
      </TouchableOpacity>
    </View>
  );
}
