import { create } from 'zustand'
import { api } from '../api/client'

interface UploadState {
  status: 'idle' | 'uploading' | 'saving' | 'done' | 'error'
  progress: number
  filename: string
  error: string
  start: (file: File, form: { title_en: string; title_ur: string; type: string; category_id: string; is_video: boolean }) => Promise<void>
  reset: () => void
}

export const useUploadStore = create<UploadState>((set) => ({
  status: 'idle',
  progress: 0,
  filename: '',
  error: '',

  reset: () => set({ status: 'idle', progress: 0, filename: '', error: '' }),

  start: async (file, form) => {
    set({ status: 'uploading', progress: 0, filename: file.name, error: '' })
    try {
      const { upload_url, cdn_url }: any = await api.post('/admin/upload', {
        filename: file.name,
        content_type: file.type || 'application/octet-stream',
      })

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.upload.onprogress = e => {
          if (e.lengthComputable) set({ progress: Math.round(e.loaded / e.total * 100) })
        }
        xhr.onload = () => xhr.status < 300 ? resolve() : reject(new Error('Upload failed'))
        xhr.onerror = () => reject(new Error('Upload failed'))
        xhr.open('PUT', upload_url)
        xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream')
        xhr.send(file)
      })

      set({ status: 'saving', progress: 100 })
      await api.post('/admin/content', { ...form, media_url: cdn_url, file_size: file.size })
      set({ status: 'done' })
    } catch (e: any) {
      set({ status: 'error', error: e.message })
    }
  },
}))
