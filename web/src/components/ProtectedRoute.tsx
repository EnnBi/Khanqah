import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '../stores/auth'

const ADMIN_ROLES = ['editor', 'admin', 'broadcaster']

export default function ProtectedRoute() {
  const { accessToken, role } = useAuthStore()
  if (!accessToken) return <Navigate to="/login" replace />
  if (!ADMIN_ROLES.includes(role ?? '')) return <Navigate to="/" replace />
  return <Outlet />
}
