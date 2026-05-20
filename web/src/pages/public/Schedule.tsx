import { useSchedule } from '../../hooks/useSchedule'

export default function Schedule() {
  const { data: sessions } = useSchedule()
  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-semibold text-stone-800 mb-6">Schedule</h1>
      <div className="space-y-3">
        {sessions?.map((s: any) => (
          <div key={s.id} className="bg-white border border-stone-100 rounded-xl p-4">
            <p className="font-medium text-stone-800">{s.title_en}</p>
            <p className="text-stone-400 text-sm mt-1">{new Date(s.scheduled_at).toLocaleString()}</p>
            {s.is_recurring && <span className="text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full mt-2 inline-block">Recurring</span>}
          </div>
        ))}
        {sessions?.length === 0 && <p className="text-stone-400">No upcoming sessions.</p>}
      </div>
    </div>
  )
}
