import { useLive } from '../../hooks/useLive'

export default function Live() {
  const { data: session } = useLive()

  if (!session) return (
    <div className="max-w-2xl mx-auto px-4 py-8 text-stone-400">No live session right now.</div>
  )

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center gap-2 mb-4">
        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
        <span className="text-red-600 font-medium">LIVE</span>
      </div>
      <h1 className="text-2xl font-semibold text-stone-800 mb-6">{session.title_en}</h1>
      <video src={session.stream_url} controls autoPlay className="w-full rounded-xl" />
    </div>
  )
}
