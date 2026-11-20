import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type Hls from 'hls.js'

export type LiveAudioState = 'idle' | 'connecting' | 'playing' | 'paused' | 'error' | 'unsupported'

const HLS_MIME = 'application/vnd.apple.mpegurl'

// iPhones have no MediaSource, so they play HLS natively; that is also what keeps the audio
// going with the screen locked. Every other browser gets hls.js, loaded only when needed.
function hasMediaSource(): boolean {
  return typeof window.MediaSource !== 'undefined' &&
    window.MediaSource.isTypeSupported('audio/mp4; codecs="mp4a.40.2"')
}

/**
 * Plays a live HLS audio stream. Nothing loads until the listener presses play: browsers block
 * sound that starts on its own, and a page left open in a tab should not use mobile data.
 */
export function useLiveAudio(streamUrl: string | null) {
  const supported = useMemo(() => hasMediaSource() || new Audio().canPlayType(HLS_MIME) !== '', [])
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const hlsRef = useRef<Hls | null>(null)
  const waitingForHls = useRef(false)
  const playWhenReady = useRef(false)
  const [state, setState] = useState<LiveAudioState>('idle')

  const play = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return
    setState('connecting')
    if (waitingForHls.current) {
      playWhenReady.current = true
      return
    }
    const hls = hlsRef.current
    if (hls) {
      hls.startLoad(-1)
      // After a pause, rejoin at the live edge rather than where the listener left off.
      const live = hls.liveSyncPosition
      if (live != null && Number.isFinite(live)) audio.currentTime = live
    } else if (audio.error || audio.currentTime > 0) {
      audio.load() // native HLS: reloading is what rejoins the live edge (and clears an error)
    }
    audio.play().catch((err: DOMException) => {
      if (err.name === 'AbortError') return
      // NotAllowedError: the browser wants a fresh tap, so go back to the play button.
      setState(err.name === 'NotAllowedError' ? 'idle' : 'error')
    })
  }, [])

  const pause = useCallback(() => {
    audioRef.current?.pause()
    hlsRef.current?.stopLoad()
  }, [])

  useEffect(() => {
    if (!streamUrl) return
    const audio = new Audio()
    audio.preload = 'none'
    audioRef.current = audio
    let disposed = false

    const onPlaying = () => setState('playing')
    const onWaiting = () => setState((s) => (s === 'playing' ? 'connecting' : s))
    const onPause = () => setState((s) => (s === 'error' ? s : 'paused'))
    const onError = () => setState('error')
    audio.addEventListener('playing', onPlaying)
    audio.addEventListener('waiting', onWaiting)
    audio.addEventListener('pause', onPause)

    if (hasMediaSource()) {
      waitingForHls.current = true
      import('hls.js').then(({ default: HlsJs }) => {
        if (disposed) return
        const hls = new HlsJs({ autoStartLoad: false })
        hls.on(HlsJs.Events.ERROR, (_event, data) => {
          if (!data.fatal) return
          if (data.type === HlsJs.ErrorTypes.MEDIA_ERROR) {
            hls.recoverMediaError()
            return
          }
          hls.stopLoad()
          setState('error')
          audio.pause()
        })
        hls.attachMedia(audio)
        hls.loadSource(streamUrl)
        hlsRef.current = hls
        waitingForHls.current = false
        if (playWhenReady.current) {
          playWhenReady.current = false
          play()
        }
      }).catch(() => {
        if (disposed) return
        waitingForHls.current = false
        setState('error')
      })
    } else {
      audio.addEventListener('error', onError)
      audio.src = streamUrl
    }

    return () => {
      disposed = true
      audio.removeEventListener('playing', onPlaying)
      audio.removeEventListener('waiting', onWaiting)
      audio.removeEventListener('pause', onPause)
      audio.removeEventListener('error', onError)
      audio.pause()
      hlsRef.current?.destroy()
      hlsRef.current = null
      waitingForHls.current = false
      playWhenReady.current = false
      audio.removeAttribute('src')
      audio.load()
      audioRef.current = null
      setState('idle')
    }
  }, [streamUrl, play])

  return { state: supported ? state : 'unsupported' as LiveAudioState, play, pause }
}
