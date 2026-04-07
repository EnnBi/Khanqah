import React, { createContext, useContext } from 'react';
import type { Content } from '../lib/types';

// Web stub — react-native-track-player is not available on web.
// Provides no-op player context so the app doesn't crash.

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
  addToQueue: (content: Content[]) => Promise<void>;
}

const noop = async () => {};

const PlayerContext = createContext<PlayerContextValue>({
  currentContent: null,
  isPlaying: false,
  position: 0,
  duration: 0,
  playbackSpeed: 1,
  playContent: noop,
  pause: noop,
  resume: noop,
  seekTo: noop,
  seekBy: noop,
  setSpeed: noop,
  skipToNext: noop,
  skipToPrevious: noop,
  addToQueue: noop,
});

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  return <PlayerContext.Provider value={PlayerContext._currentValue}>{children}</PlayerContext.Provider>;
}

export function usePlayer() {
  return useContext(PlayerContext);
}
