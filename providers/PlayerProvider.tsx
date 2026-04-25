import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  Audio,
  AVPlaybackStatus,
  InterruptionModeAndroid,
  InterruptionModeIOS,
} from 'expo-av';

import { Content } from '../lib/types';
import { saveProgress } from '../hooks/useListeningProgress';
import { useAuth } from '../hooks/useAuth';

interface PlayerContextValue {
  currentContent: Content | null;
  isPlaying: boolean;
  isBuffering: boolean;
  isLoading: boolean;
  position: number;
  duration: number;
  playbackSpeed: number;
  playContent: (content: Content) => Promise<void>;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  seekTo: (seconds: number) => Promise<void>;
  seekBy: (seconds: number) => Promise<void>;
  setSpeed: (rate: number) => Promise<void>;
  skipToNext: () => Promise<void>;
  skipToPrevious: () => Promise<void>;
  addToQueue: (contents: Content[]) => Promise<void>;
  stop: () => Promise<void>;
}

const PlayerContext = createContext<PlayerContextValue>({
  currentContent: null,
  isPlaying: false,
  isBuffering: false,
  isLoading: false,
  position: 0,
  duration: 0,
  playbackSpeed: 1.0,
  playContent: async () => {},
  pause: async () => {},
  resume: async () => {},
  seekTo: async () => {},
  seekBy: async () => {},
  setSpeed: async () => {},
  skipToNext: async () => {},
  skipToPrevious: async () => {},
  addToQueue: async () => {},
  stop: async () => {},
});

function PlayerProviderInner({ children }: { children: React.ReactNode }) {
  const soundRef = useRef<Audio.Sound | null>(null);
  const queueRef = useRef<Content[]>([]);
  const indexRef = useRef<number>(-1);

  const [currentContent, setCurrentContent] = useState<Content | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);

  const { user } = useAuth();

  const onStatus = useCallback((status: AVPlaybackStatus) => {
    if (!status.isLoaded) {
      setIsPlaying(false);
      setIsBuffering(false);
      return;
    }
    // Sound is loaded — clear the "loading" spinner once playback has
    // actually started. Staying true through buffering would also be
    // acceptable but isBuffering already covers that state separately.
    if (status.isPlaying) setIsLoading(false);
    setIsPlaying(status.isPlaying);
    setIsBuffering(status.isBuffering);
    setPosition((status.positionMillis ?? 0) / 1000);
    if (status.durationMillis) setDuration(status.durationMillis / 1000);
  }, []);

  const unload = useCallback(async () => {
    const s = soundRef.current;
    soundRef.current = null;
    if (s) {
      try { await s.unloadAsync(); } catch { /* noop */ }
    }
  }, []);

  const loadAndPlay = useCallback(
    async (content: Content) => {
      await unload();
      setIsLoading(true);
      setCurrentContent(content);
      try {
        const { sound } = await Audio.Sound.createAsync(
          { uri: content.media_url },
          {
            shouldPlay: true,
            rate: playbackSpeed,
            shouldCorrectPitch: true,
          },
          onStatus,
        );
        soundRef.current = sound;
      } catch (err) {
        setIsLoading(false);
        throw err;
      }
    },
    [onStatus, playbackSpeed, unload],
  );

  const playContent = useCallback(
    async (content: Content) => {
      queueRef.current = [content];
      indexRef.current = 0;
      await loadAndPlay(content);
    },
    [loadAndPlay],
  );

  const pause = useCallback(async () => {
    try { await soundRef.current?.pauseAsync(); } catch { /* noop */ }
  }, []);

  const resume = useCallback(async () => {
    try { await soundRef.current?.playAsync(); } catch { /* noop */ }
  }, []);

  const seekTo = useCallback(async (seconds: number) => {
    try {
      await soundRef.current?.setPositionAsync(Math.max(0, seconds) * 1000);
    } catch { /* noop */ }
  }, []);

  const seekBy = useCallback(async (seconds: number) => {
    const s = soundRef.current;
    if (!s) return;
    try {
      const status = await s.getStatusAsync();
      if (!status.isLoaded) return;
      const next = ((status.positionMillis ?? 0) + seconds * 1000);
      await s.setPositionAsync(Math.max(0, next));
    } catch { /* noop */ }
  }, []);

  const setSpeed = useCallback(async (rate: number) => {
    try {
      await soundRef.current?.setRateAsync(rate, true);
    } catch { /* noop */ }
    setPlaybackSpeed(rate);
  }, []);

  const skipToNext = useCallback(async () => {
    const next = indexRef.current + 1;
    if (next >= queueRef.current.length) return;
    indexRef.current = next;
    await loadAndPlay(queueRef.current[next]);
  }, [loadAndPlay]);

  const skipToPrevious = useCallback(async () => {
    const prev = indexRef.current - 1;
    if (prev < 0) return;
    indexRef.current = prev;
    await loadAndPlay(queueRef.current[prev]);
  }, [loadAndPlay]);

  const addToQueue = useCallback(async (contents: Content[]) => {
    queueRef.current = [...queueRef.current, ...contents];
  }, []);

  const stop = useCallback(async () => {
    await unload();
    setCurrentContent(null);
    setIsPlaying(false);
    setIsLoading(false);
    setPosition(0);
    setDuration(0);
    queueRef.current = [];
    indexRef.current = -1;
  }, [unload]);

  useEffect(() => {
    return () => {
      void unload();
    };
  }, [unload]);

  useEffect(() => {
    if (!user?.id || !currentContent) return;
    const interval = setInterval(async () => {
      const s = soundRef.current;
      if (!s) return;
      try {
        const status = await s.getStatusAsync();
        if (!status.isLoaded) return;
        const pos = (status.positionMillis ?? 0) / 1000;
        if (pos <= 0) return;
        const dur = (status.durationMillis ?? 0) / 1000;
        const completed = dur > 0 && pos >= dur - 2;
        saveProgress(user.id, currentContent.id, pos, completed);
      } catch { /* noop */ }
    }, 10_000);
    return () => clearInterval(interval);
  }, [user?.id, currentContent]);

  return (
    <PlayerContext.Provider
      value={{
        currentContent,
        isPlaying,
        isBuffering,
        isLoading,
        position,
        duration,
        playbackSpeed,
        playContent,
        pause,
        resume,
        seekTo,
        seekBy,
        setSpeed,
        skipToNext,
        skipToPrevious,
        addToQueue,
        stop,
      }}
    >
      {children}
    </PlayerContext.Provider>
  );
}

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const [audioReady, setAudioReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Audio.setAudioModeAsync({
      staysActiveInBackground: true,
      playsInSilentModeIOS: true,
      interruptionModeIOS: InterruptionModeIOS.DoNotMix,
      interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
      shouldDuckAndroid: false,
      playThroughEarpieceAndroid: false,
    })
      .catch(() => { /* best-effort — still render children */ })
      .finally(() => { if (!cancelled) setAudioReady(true); });
    return () => { cancelled = true; };
  }, []);

  if (!audioReady) return <>{children}</>;

  return <PlayerProviderInner>{children}</PlayerProviderInner>;
}

export function usePlayer() {
  return useContext(PlayerContext);
}
