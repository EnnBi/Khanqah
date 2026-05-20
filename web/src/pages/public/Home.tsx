import { useContent } from '../../hooks/useContent'
import { useLive } from '../../hooks/useLive'
import { useSchedule } from '../../hooks/useSchedule'

export default function Home() {
  const { data: recent } = useContent()
  const { data: live } = useLive()
  const { data: schedule } = useSchedule()

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {live && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-6 flex items-center gap-3">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-emerald-800 font-medium">Live: {live.title_en}</span>
          <a href="/live" className="ml-auto text-emerald-600 text-sm font-medium">Watch →</a>
        </div>
      )}
      {schedule && schedule.length > 0 && (
        <div className="mb-6">
          <h2 className="text-stone-500 text-sm uppercase tracking-wider mb-3">Next Session</h2>
          <div className="bg-white border border-stone-100 rounded-xl p-4">
            <p className="font-medium text-stone-800">{schedule[0].title_en}</p>
            <p className="text-stone-400 text-sm mt-1">{new Date(schedule[0].scheduled_at).toLocaleString()}</p>
          </div>
        </div>
      )}
      <h2 className="text-stone-500 text-sm uppercase tracking-wider mb-3">Recent</h2>
      <div className="space-y-2">
        {recent?.map((item: any) => (
          <a key={item.id} href={`/player/${item.id}`}
            className="flex items-center gap-3 bg-white border border-stone-100 rounded-xl p-4 hover:border-stone-300 transition-colors">
            {item.thumbnail_url && (
              <img src={item.thumbnail_url} className="w-12 h-12 rounded-lg object-cover" alt="" />
            )}
            <div>
              <p className="font-medium text-stone-800">{item.title_en}</p>
              <p className="text-stone-400 text-sm">{item.type}</p>
            </div>
          </a>
        ))}
      </div>
    </div>
  )
}
