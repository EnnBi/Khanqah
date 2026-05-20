import { useQuery } from '@tanstack/react-query'
import { api } from '../../api/client'

export default function Bugs() {
  const { data: reports } = useQuery({ queryKey: ['bugs'], queryFn: () => api.get<any[]>('/admin/bugs') })

  return (
    <div className="max-w-3xl mx-auto py-8">
      <h1 className="text-2xl font-semibold text-stone-800 mb-6">Bug Reports</h1>
      <div className="space-y-3">
        {reports?.map((r: any) => (
          <div key={r.id} className="bg-white border border-stone-100 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${r.status === 'open' ? 'bg-red-50 text-red-600' : 'bg-stone-100 text-stone-500'}`}>{r.status}</span>
              <span className="text-stone-400 text-xs">{r.platform} · v{r.app_version}</span>
            </div>
            <p className="text-stone-700">{r.note || r.type}</p>
            <p className="text-stone-400 text-xs mt-1">{new Date(r.timestamp).toLocaleString()}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
