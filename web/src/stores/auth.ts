import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AuthState {
  accessToken: string | null
  refreshToken: string | null
  role: string | null
  setTokens: (access: string, refresh: string, role: string) => void
  refresh: () => Promise<boolean>
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      accessToken: null,
      refreshToken: null,
      role: null,

      setTokens: (access, refresh, role) =>
        set({ accessToken: access, refreshToken: refresh, role }),

      refresh: async () => {
        const rt = get().refreshToken
        if (!rt) return false
        try {
          const res = await fetch('/api/auth/refresh', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refresh_token: rt }),
          })
          if (!res.ok) {
            set({ accessToken: null, refreshToken: null, role: null })
            return false
          }
          const data = await res.json()
          set({ accessToken: data.access_token })
          return true
        } catch {
          set({ accessToken: null, refreshToken: null, role: null })
          return false
        }
      },

      logout: () => set({ accessToken: null, refreshToken: null, role: null }),
    }),
    { name: 'khanqah-auth' }
  )
)
