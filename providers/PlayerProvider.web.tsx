import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { Content } from '../lib/types';
import { isYouTubeUrl, isDirectVideoUrl } from '../components/YouTubeEmbed';

function isHlsUrl(url: string | null | undefined): boolean {
  return !!url && url.toLowerCase().split(/[?#]/)[0].endsWith('.m3u8');
}

// Web PlayerProvider — uses HTML5 <audio> since react-native-track-player
// is native-only. Supports play/pause/seek/speed and queueing.

interface PlayerContextValue {
  currentContent: Content | null;
  isPlaying: boolean;
  isBuffering: boolean;
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
  stop: () => Promise<void>;
}

const noop = async () => {};

const PlayerContext = createContext<PlayerContextValue>({
  currentContent: null,
  isPlaying: false,
  isBuffering: false,
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
  stop: noop,
});

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  // HLS manifests (.m3u8) can't be played via <audio src=...> outside
  // Safari — they need shaka-player (or hls.js) to pull segments over
  // MSE and feed the element. We instantiate shaka lazily and only
  // when we actually hit a live stream URL.
  const shakaRef = useRef<any>(null);
  const queueRef = useRef<Content[]>([]);
  const queueIndexRef = useRef<number>(-1);

  const [currentContent, setCurrentContent] = useState<Content | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackSpeed, setPlaybackSpeedState] = useState(1);

  // Lazy-create the audio element on first use so SSR doesn't fail.
  const getAudio = useCallback((): HTMLAudioElement => {
    if (!audioRef.current) {
      const el = new Audio();
      el.preload = 'metadata';
      el.addEventListener('play', () => setIsPlaying(true));
      el.addEventListener('pause', () => setIsPlaying(false));
      el.addEventListener('ended', () => {
        setIsPlaying(false);
        // advance in queue if possible
        const next = queueIndexRef.current + 1;
        if (next < queueRef.current.length) {
          queueIndexRef.current = next;
          playContentInternal(queueRef.current[next]);
        }
      });
      el.addEventListener('timeupdate', () => {
        setPosition(el.currentTime || 0);
      });
      el.addEventListener('loadedmetadata', () => {
        setDuration(isFinite(el.duration) ? el.duration : 0);
      });
      // Buffering lifecycle — drives a spinner on the player UI so the
      // user knows why nothing's happening between "tap play" and
      // "audio actually plays".
      el.addEventListener('loadstart', () => setIsBuffering(true));
      el.addEventListener('waiting',    () => setIsBuffering(true));
      el.addEventListener('canplay',    () => setIsBuffering(false));
      el.addEventListener('playing',    () => setIsBuffering(false));
      el.addEventListener('error', (e) => {
        console.warn('[player] audio error:', el.error);
        setIsBuffering(false);
      });
      audioRef.current = el;
    }
    return audioRef.current;
  }, []);

  const playContentInternal = useCallback(
    async (content: Content) => {
      // YouTube URLs go through an iframe; direct video files (.mp4
      // etc.) go through an HTML5 <video> tag rendered on the player
      // screen. In either case we don't load the URL into the shared
      // <audio> element, but we still track the current content so the
      // mini-player + queue reflect what the user is viewing.
      if (isYouTubeUrl(content.media_url) || isDirectVideoUrl(content.media_url)) {
        audioRef.current?.pause();
        setCurrentContent(content);
        setPosition(0);
        setDuration(0);
        setIsPlaying(false);
        return;
      }
      try {
        const audio = getAudio();

        if (isHlsUrl(content.media_url)) {
          // Tear down any previous shaka instance, attach to the <audio>
          // element, and load the new manifest. Safari can handle HLS
          // natively but we still go through shaka for consistency with
          // Chromium/Firefox — it auto-detects native support and gets
          // out of the way.
          const shaka = (await import('shaka-player')).default;
          if (!shakaRef.current || shakaRef.current.getMediaElement() !== audio) {
            if (shakaRef.current) {
              try { await shakaRef.current.destroy(); } catch { /* ignore */ }
            }
            shakaRef.current = new shaka.Player();
            await shakaRef.current.attach(audio);
          }
          setPosition(0);
          setDuration(0);
          await shakaRef.current.load(content.media_url);
        } else {
          // Non-HLS — leave shaka detached, go back to a plain src.
          if (shakaRef.current) {
            try { await shakaRef.current.destroy(); } catch { /* ignore */ }
            shakaRef.current = null;
          }
          if (audio.src !== content.media_url) {
            audio.src = content.media_url;
            setPosition(0);
            setDuration(0);
          }
        }

        audio.playbackRate = playbackSpeed;
        setCurrentContent(content);
        await audio.play();
      } catch (err) {
        console.warn('[player] play failed:', err);
      }
    },
    [playbackSpeed, getAudio],
  );

  const playContent = useCallback(
    async (content: Content) => {
      // Reset queue to just this content (manual play overrides queue)
      queueRef.current = [content];
      queueIndexRef.current = 0;
      await playContentInternal(content);
    },
    [playContentInternal],
  );

  const pause = useCallback(async () => {
    audioRef.current?.pause();
  }, []);

  const resume = useCallback(async () => {
    const audio = audioRef.current;
    // Guard against resuming when no playable source is loaded. Common
    // cases: the current track is a YouTube URL (we skip loading those
    // into <audio> — they render via iframe), or no track has been
    // selected yet. For HLS streams the audio element has no `src`
    // (shaka feeds it via MSE) but it IS playable — allow it through.
    if (!audio) return;
    const hasShakaSource = !!shakaRef.current;
    if (!hasShakaSource && (!audio.src || isYouTubeUrl(audio.src) || isDirectVideoUrl(audio.src))) return;
    try {
      await audio.play();
    } catch (err) {
      console.warn('[player] resume failed:', err);
    }
  }, []);

  const seekTo = useCallback(async (seconds: number) => {
    if (audioRef.current) audioRef.current.currentTime = seconds;
  }, []);

  const seekBy = useCallback(async (seconds: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = Math.max(0, Math.min((audio.duration || 0), audio.currentTime + seconds));
  }, []);

  const setSpeed = useCallback(async (rate: number) => {
    if (audioRef.current) audioRef.current.playbackRate = rate;
    setPlaybackSpeedState(rate);
  }, []);

  const skipToNext = useCallback(async () => {
    const next = queueIndexRef.current + 1;
    if (next < queueRef.current.length) {
      queueIndexRef.current = next;
      await playContentInternal(queueRef.current[next]);
    }
  }, [playContentInternal]);

  const skipToPrevious = useCallback(async () => {
    const prev = queueIndexRef.current - 1;
    if (prev >= 0) {
      queueIndexRef.current = prev;
      await playContentInternal(queueRef.current[prev]);
    } else {
      // Restart current track
      if (audioRef.current) audioRef.current.currentTime = 0;
    }
  }, [playContentInternal]);

  const addToQueue = useCallback(async (contents: Content[]) => {
    queueRef.current = queueRef.current.concat(contents);
  }, []);

  const stop = useCallback(async () => {
    if (shakaRef.current) {
      try { await shakaRef.current.destroy(); } catch { /* ignore */ }
      shakaRef.current = null;
    }
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
    }
    queueRef.current = [];
    queueIndexRef.current = -1;
    setCurrentContent(null);
    setIsPlaying(false);
    setIsBuffering(false);
    setPosition(0);
    setDuration(0);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      audioRef.current = null;
    };
  }, []);

  const value: PlayerContextValue = {
    currentContent,
    isPlaying,
    isBuffering,
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
  };

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}

export function usePlayer() {
  return useContext(PlayerContext);
}
