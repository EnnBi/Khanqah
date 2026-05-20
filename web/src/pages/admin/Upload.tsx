import { useState, useRef } from 'react'
import { api } from '../../api/client'
import { useCategories } from '../../hooks/useCategories'

export default function Upload() {
  const { data: categories } = useCategories()
  const fileRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [form, setForm] = useState({ title_en: '', title_ur: '', type: 'bayan', category_id: '', is_video: false })
  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState<'idle' | 'uploading' | 'saving' | 'done' | 'error'>('idle')
  const [error, setError] = useState('')

  async function handleUpload() {
    if (!file) return
    setStatus('uploading'); setError('')
    try {
      const { upload_url, cdn_url }: any = await api.post('/admin/upload', {
        filename: file.name,
        content_type: file.type || 'application/octet-stream',
      })

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.upload.onprogress = e => setProgress(Math.round(e.loaded / e.total * 100))
        xhr.onload = () => xhr.status < 300 ? resolve() : reject(new Error('Upload failed'))
        xhr.onerror = () => reject(new Error('Upload failed'))
        xhr.open('PUT', upload_url)
        xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream')
        xhr.send(file)
      })

      setStatus('saving')
      await api.post('/admin/content', {
        ...form,
        media_url: cdn_url,
        file_size: file.size,
      })
      setStatus('done')
    } catch (e: any) {
      setError(e.message)
      setStatus('error')
    }
  }

  return (
    <div className="max-w-xl mx-auto py-8">
      <h1 className="text-2xl font-semibold text-stone-800 mb-6">Upload Content</h1>
      <div onClick={() => fileRef.current?.click()}
        className="border-2 border-dashed border-stone-200 rounded-xl p-8 text-center cursor-pointer hover:border-emerald-400 transition-colors mb-6">
        {file ? <p className="text-stone-700">{file.name}</p> : <p className="text-stone-400">Click to choose file</p>}
        <input ref={fileRef} type="file" className="hidden" onChange={e => setFile(e.target.files?.[0] ?? null)} />
      </div>
      <div className="space-y-4">
        <input className="w-full border border-stone-200 rounded-lg px-4 py-2" placeholder="Title (English)"
          value={form.title_en} onChange={e => setForm(f => ({ ...f, title_en: e.target.value }))} />
        <input className="w-full border border-stone-200 rounded-lg px-4 py-2 text-right" dir="rtl" placeholder="عنوان (اردو)"
          value={form.title_ur} onChange={e => setForm(f => ({ ...f, title_ur: e.target.value }))} />
        <select className="w-full border border-stone-200 rounded-lg px-4 py-2"
          value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
          {['bayan', 'clip', 'nazam', 'quran', 'hamd_naat', 'book', 'mamulat'].map(t => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <select className="w-full border border-stone-200 rounded-lg px-4 py-2"
          value={form.category_id} onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))}>
          <option value="">Select category</option>
          {categories?.map((c: any) => <option key={c.id} value={c.id}>{c.name_en}</option>)}
        </select>
      </div>
      {status === 'uploading' && (
        <div className="mt-6">
          <div className="h-2 bg-stone-100 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500 transition-all" style={{ width: `${progress}%` }} />
          </div>
          <p className="text-stone-400 text-sm mt-2">{progress}% uploaded</p>
        </div>
      )}
      {status === 'done' && <p className="mt-4 text-emerald-600 font-medium">Uploaded successfully!</p>}
      {error && <p className="mt-4 text-red-500 text-sm">{error}</p>}
      <button className="mt-6 w-full bg-emerald-600 text-white rounded-lg py-2 font-medium disabled:opacity-50"
        onClick={handleUpload}
        disabled={!file || !form.title_en || !form.category_id || status === 'uploading' || status === 'saving'}>
        {status === 'uploading' ? 'Uploading...' : status === 'saving' ? 'Saving...' : 'Upload'}
      </button>
    </div>
  )
}
