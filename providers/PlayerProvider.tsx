import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import TrackPlayer, {
  State,
  useActiveTrack,
  usePlaybackState,
  useProgress,
} from 'react-native-track-player';

import { Content } from '../lib/types';
import { setupPlayer } from '../services/player-service';
import { saveProgress } from '../hooks/useListeningProgress';
import { useAuth } from '../hooks/useAuth';

interface PlayerContextValue {
  currentContent: Content | null;
  isPlaying: boolean;
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
}

const PlayerContext = createContext<PlayerContextValue>({
  currentContent: null,
  isPlaying: false,
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
});

function contentToTrack(content: Content, language: string = 'en') {
  return {
    id: content.id,
    url: content.media_url,
    title: language === 'ur' ? content.title_ur : content.title_en,
    artist: 'Mufti Abdur Rasheed Miftahi DB',
    artwork: content.thumbnail_url ?? undefined,
    duration: content.duration ?? undefined,
  };
}

function PlayerProviderInner({ children }: { children: React.ReactNode }) {
  const [currentContent, setCurrentContent] = useState<Content | null>(null);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);

  const playbackState = usePlaybackState();
  const progress = useProgress();
  useActiveTrack(); // keep active track subscription alive

  const isPlaying = playbackState.state === State.Playing;

  const { user } = useAuth();

  // Auto-save progress every 10 seconds while playing
  useEffect(() => {
    if (!user?.id || !currentContent) return;

    const interval = setInterval(async () => {
      const { position: pos, duration: dur } = await TrackPlayer.getProgress();
      if (pos <= 0) return;

      const completed = dur > 0 && pos >= dur - 2;
      saveProgress(user.id, currentContent.id, pos, completed);
    }, 10_000);

    return () => clearInterval(interval);
  }, [user?.id, currentContent]);

  const playContent = useCallback(async (content: Content) => {
    const track = contentToTrack(content);
    await TrackPlayer.reset();
    await TrackPlayer.add(track);
    await TrackPlayer.play();
    setCurrentContent(content);
  }, []);

  const pause = useCallback(async () => {
    await TrackPlayer.pause();
  }, []);

  const resume = useCallback(async () => {
    await TrackPlayer.play();
  }, []);

  const seekTo = useCallback(async (seconds: number) => {
    await TrackPlayer.seekTo(seconds);
  }, []);

  const seekBy = useCallback(async (seconds: number) => {
    const current = (await TrackPlayer.getProgress()).position;
    await TrackPlayer.seekTo(current + seconds);
  }, []);

  const setSpeed = useCallback(async (rate: number) => {
    await TrackPlayer.setRate(rate);
    setPlaybackSpeed(rate);
  }, []);

  const skipToNext = useCallback(async () => {
    await TrackPlayer.skipToNext();
  }, []);

  const skipToPrevious = useCallback(async () => {
    await TrackPlayer.skipToPrevious();
  }, []);

  const addToQueue = useCallback(async (contents: Content[]) => {
    const tracks = contents.map((c) => contentToTrack(c));
    await TrackPlayer.add(tracks);
  }, []);

  return (
    <PlayerContext.Provider
      value={{
        currentContent,
        isPlaying,
        position: progress.position,
        duration: progress.duration,
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
      }}
    >
      {children}
    </PlayerContext.Provider>
  );
}

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const [playerReady, setPlayerReady] = useState(false);

  useEffect(() => {
    setupPlayer().then(() => setPlayerReady(true));
  }, []);

  if (!playerReady) return <>{children}</>;

  return <PlayerProviderInner>{children}</PlayerProviderInner>;
}

export function usePlayer() {
  return useContext(PlayerContext);
}
