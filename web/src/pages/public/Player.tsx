import { useParams } from 'react-router-dom'
import { useContentItem } from '../../hooks/useContent'

export default function Player() {
  const { id } = useParams<{ id: string }>()
  const { data: item, isLoading } = useContentItem(id!)

  if (isLoading) return <div className="p-8 text-stone-400">Loading...</div>
  if (!item) return <div className="p-8 text-stone-400">Not found</div>

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-semibold text-stone-800 mb-2">{item.title_en}</h1>
      <p className="text-stone-400 text-right mb-6" dir="rtl">{item.title_ur}</p>
      {item.is_video ? (
        <video src={item.media_url} controls className="w-full rounded-xl" />
      ) : (
        <audio src={item.media_url} controls className="w-full" />
      )}
      {item.description_en && (
        <p className="mt-6 text-stone-600 leading-relaxed">{item.description_en}</p>
      )}
    </div>
  )
}
