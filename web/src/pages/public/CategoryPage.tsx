import { useParams } from 'react-router-dom'
import { useContent } from '../../hooks/useContent'

export default function CategoryPage() {
  const { categoryId } = useParams<{ categoryId: string }>()
  const { data: items } = useContent({ category_id: categoryId })

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="space-y-2">
        {items?.map((item: any) => (
          <a key={item.id} href={`/player/${item.id}`}
            className="flex items-center gap-3 bg-white border border-stone-100 rounded-xl p-4 hover:border-stone-300 transition-colors">
            <div>
              <p className="font-medium text-stone-800">{item.title_en}</p>
              <p className="text-stone-400 text-sm" dir="rtl">{item.title_ur}</p>
            </div>
          </a>
        ))}
      </div>
    </div>
  )
}
