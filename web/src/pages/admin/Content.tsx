import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../api/client'

export default function Content() {
  const qc = useQueryClient()
  const { data: items } = useQuery({ queryKey: ['admin-content'], queryFn: () => api.get<any[]>('/content') })
  const del = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/content/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-content'] }),
  })

  return (
    <div className="max-w-3xl mx-auto py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-stone-800">Content</h1>
        <a href="/admin/upload" className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium">+ Upload</a>
      </div>
      <div className="space-y-2">
        {items?.map((item: any) => (
          <div key={item.id} className="flex items-center justify-between bg-white border border-stone-100 rounded-xl px-4 py-3">
            <div>
              <p className="font-medium text-stone-800">{item.title_en}</p>
              <p className="text-stone-400 text-sm">{item.type}</p>
            </div>
            <button onClick={() => del.mutate(item.id)} className="text-red-400 text-sm hover:text-red-600">Delete</button>
          </div>
        ))}
      </div>
    </div>
  )
}
