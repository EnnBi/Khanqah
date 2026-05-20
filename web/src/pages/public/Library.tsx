import { useCategories } from '../../hooks/useCategories'

export default function Library() {
  const { data: categories } = useCategories()
  const roots = categories?.filter((c: any) => !c.parent_id) ?? []

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-semibold text-stone-800 mb-6">Library</h1>
      <div className="grid grid-cols-2 gap-3">
        {roots.map((cat: any) => (
          <a key={cat.id} href={`/library/${cat.id}`}
            className="bg-white border border-stone-100 rounded-xl p-5 hover:border-stone-300 transition-colors">
            <p className="font-medium text-stone-800">{cat.name_en}</p>
            <p className="text-stone-400 text-sm mt-1 text-right" dir="rtl">{cat.name_ur}</p>
          </a>
        ))}
      </div>
    </div>
  )
}
