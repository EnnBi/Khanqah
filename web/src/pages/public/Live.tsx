import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { Pause, Play, Share2 } from 'lucide-react'
import { useCurrentLive, useLiveSession } from '../../hooks/useLiveSession'
import type { LiveSession } from '../../hooks/useLiveSession'
import { useLiveAudio } from '../../hooks/useLiveAudio'
import type { LiveAudioState } from '../../hooks/useLiveAudio'
import './Live.css'

// The page people land on from a shared broadcast link, mostly on phones without the app.
// /live/:id is one broadcast (still playable, or ended); /live forwards to whatever is on air.
export default function Live() {
  const { id } = useParams()
  usePageColor('#022f2b')
  return id ? <SharedBroadcast id={id} /> : <CurrentBroadcast />
}

function CurrentBroadcast() {
  const { data: session, isPending, isError, refetch } = useCurrentLive()

  if (session) return <Navigate to={`/live/${session.id}`} replace />
  if (isPending) return <Shell><Loading /></Shell>
  if (isError && session === undefined) return <Shell><LoadFailed onRetry={refetch} /></Shell>
  return (
    <Shell>
      <Notice
        title="No live broadcast right now"
        detail="Broadcasts start from this page as soon as one goes on air."
        action={<Link className="live-link" to="/schedule">See the schedule</Link>}
      />
    </Shell>
  )
}

function SharedBroadcast({ id }: { id: string }) {
  const { data: session, isPending, isError, refetch } = useLiveSession(id)

  if (isPending) return <Shell><Loading /></Shell>
  if (isError && session === undefined) return <Shell><LoadFailed onRetry={refetch} /></Shell>
  if (!session) {
    return (
      <Shell>
        <Notice
          title="This link doesn't match a broadcast"
          detail="It may have been copied incompletely."
          action={<Link className="live-link" to="/live">Check what's live now</Link>}
        />
      </Shell>
    )
  }
  if (session.status !== 'live') return <Shell><Ended session={session} /></Shell>
  return <OnAir session={session} />
}

// ── On air ───────────────────────────────────────────────────────────────────

const STATUS_TEXT: Record<LiveAudioState, string> = {
  idle: 'Press play to listen',
  connecting: 'Connecting…',
  playing: 'Listening live',
  paused: 'Paused',
  error: "Can't reach the broadcast. Check your connection, then press play.",
  unsupported: "This browser can't play the broadcast. Open the link in Safari or Chrome.",
}

function OnAir({ session }: { session: LiveSession }) {
  const { state, play, pause } = useLiveAudio(session.stream_url)
  const playing = state === 'playing'
  const busy = state === 'connecting'
  const elapsed = useElapsed(session.started_at)

  useListenerPing(playing)
  useLockScreenInfo(session, playing)

  return (
    <Shell share={session}>
      <Emblem active={playing} />

      <p className="live-onair">
        <span className="live-pill"><span className="live-pill-dot" />Live</span>
        {elapsed && <span className="live-elapsed">{elapsed}</span>}
      </p>

      <h1 className="live-title serif">{session.title_en}</h1>
      {session.title_ur && <p className="live-title-ur nastaleeq" dir="rtl" lang="ur">{session.title_ur}</p>}
      {session.speaker_en && <p className="live-speaker">{session.speaker_en}</p>}

      <button
        type="button"
        className="live-play"
        onClick={playing || busy ? pause : play}
        disabled={state === 'unsupported'}
        aria-label={playing || busy ? 'Pause the broadcast' : 'Play the broadcast'}
      >
        {playing || busy ? <Pause size={30} fill="currentColor" strokeWidth={0} /> : <Play size={30} fill="currentColor" strokeWidth={0} />}
        {busy && <span className="live-play-spinner" />}
      </button>
      <p className={`live-status${state === 'error' || state === 'unsupported' ? ' live-status-problem' : ''}`} role="status">
        {STATUS_TEXT[state]}
      </p>

      <OpenInApp id={session.id} />
    </Shell>
  )
}

// ── Ended ────────────────────────────────────────────────────────────────────

function Ended({ session }: { session: LiveSession }) {
  // A link to last week's broadcast should still get people to the one that is on air today.
  const { data: current } = useCurrentLive()
  const onAirNow = current && current.id !== session.id ? current : null

  return (
    <Notice
      title="This live broadcast has ended"
      detail={endedDetail(session)}
      action={onAirNow ? (
        <Link className="live-button" to={`/live/${onAirNow.id}`}>Listen to {onAirNow.title_en}, live now</Link>
      ) : (
        <Link className="live-link" to="/library">Browse recordings in the library</Link>
      )}
    />
  )
}

function endedDetail(session: LiveSession): string {
  if (!session.ended_at) return session.title_en
  const ended = new Date(session.ended_at)
  const time = ended.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  const sameDay = ended.toDateString() === new Date().toDateString()
  const when = sameDay ? `at ${time}` : `on ${ended.toLocaleDateString([], { day: 'numeric', month: 'long' })} at ${time}`
  return `${session.title_en} ended ${when}.`
}

// ── Shared pieces ────────────────────────────────────────────────────────────

function Shell({ share, children }: { share?: LiveSession; children: ReactNode }) {
  return (
    <div className="live-page">
      <header className="live-header">
        <a className="live-brand serif" href="/">Khanqah Maseeh-ul-Ummah</a>
        {share && <ShareButton session={share} />}
      </header>
      <main className="live-stage">{children}</main>
    </div>
  )
}

function Notice({ title, detail, action }: { title: string; detail: string; action: ReactNode }) {
  return (
    <>
      <Emblem active={false} dim />
      <h1 className="live-notice-title serif">{title}</h1>
      <p className="live-notice-detail">{detail}</p>
      {action}
    </>
  )
}

function Loading() {
  return (
    <>
      <Emblem active={false} dim />
      <p className="live-status" role="status">Loading the broadcast…</p>
    </>
  )
}

function LoadFailed({ onRetry }: { onRetry: () => void }) {
  return (
    <Notice
      title="Couldn't load the broadcast"
      detail="Check your connection and try again."
      action={<button type="button" className="live-button" onClick={() => onRetry()}>Try again</button>}
    />
  )
}

// The Khanqah mark inside rings that ripple outward while sound is playing.
function Emblem({ active, dim = false }: { active: boolean; dim?: boolean }) {
  return (
    <div className={`live-emblem${active ? ' live-emblem-active' : ''}${dim ? ' live-emblem-dim' : ''}`} aria-hidden="true">
      <span className="live-ring" />
      <span className="live-ring" />
      <span className="live-ring" />
      <img src="/khanqah-logo.png" alt="" width={419} height={631} />
    </div>
  )
}

function ShareButton({ session }: { session: LiveSession }) {
  const [copied, setCopied] = useState(false)

  async function share() {
    const url = `${window.location.origin}/live/${session.id}`
    if (navigator.share) {
      // Rejects when the listener closes the share sheet; nothing to do about that.
      await navigator.share({ title: session.title_en, text: `Live now: ${session.title_en}`, url }).catch(() => {})
      return
    }
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      window.prompt('Copy this link', url)
    }
  }

  return (
    <button type="button" className="live-share" onClick={share}>
      <Share2 size={16} aria-hidden="true" />
      <span role="status">{copied ? 'Link copied' : 'Share'}</span>
    </button>
  )
}

// Android only: a tap opens this broadcast in the app, or the app's Play Store page if it is
// not installed. Needed because Android does not always hand a tapped link to the app itself.
function OpenInApp({ id }: { id: string }) {
  if (!/Android/i.test(navigator.userAgent)) return null
  const href = `intent://arrashid.ennbi.com/live/${id}#Intent;scheme=https;package=com.ennbi.khanqah;end`
  return <a className="live-link live-open-app" href={href}>Open in the Khanqah app</a>
}

// ── Hooks ────────────────────────────────────────────────────────────────────

/** Time on air as m:ss or h:mm:ss, ticking every second. Empty if the start time is unusable. */
function useElapsed(startedAt: string): string {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])

  const seconds = Math.floor((now - new Date(startedAt).getTime()) / 1000)
  if (!Number.isFinite(seconds) || seconds < 0) return ''
  const h = Math.floor(seconds / 3600)
  const mm = String(Math.floor((seconds % 3600) / 60)).padStart(h ? 2 : 1, '0')
  const ss = String(seconds % 60).padStart(2, '0')
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`
}

/** Counts this listener in the broadcaster's listener total, the way the app does. */
function useListenerPing(playing: boolean) {
  useEffect(() => {
    if (!playing) return
    const ping = () => { fetch('/api/live/ping', { method: 'POST' }).catch(() => {}) }
    ping()
    const timer = setInterval(ping, 15_000)
    return () => clearInterval(timer)
  }, [playing])
}

/** Title and speaker for the phone's lock screen and headphone controls. */
function useLockScreenInfo(session: LiveSession, playing: boolean) {
  useEffect(() => {
    if (!playing || !('mediaSession' in navigator)) return
    navigator.mediaSession.metadata = new MediaMetadata({
      title: session.title_en,
      artist: session.speaker_en || 'Khanqah Maseeh-ul-Ummah',
      album: 'Live broadcast',
    })
  }, [playing, session.title_en, session.speaker_en])
}

/** Paints the browser chrome and overscroll area in the page's colour while it is open. */
function usePageColor(color: string) {
  useEffect(() => {
    const meta = document.createElement('meta')
    meta.name = 'theme-color'
    meta.content = color
    document.head.appendChild(meta)
    const previous = document.body.style.backgroundColor
    document.body.style.backgroundColor = color
    return () => {
      meta.remove()
      document.body.style.backgroundColor = previous
    }
  }, [color])
}
