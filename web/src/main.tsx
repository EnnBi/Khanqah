import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './index.css'

import ProtectedRoute from './components/ProtectedRoute'

import Home from './pages/public/Home'
import Library from './pages/public/Library'
import CategoryPage from './pages/public/CategoryPage'
import Player from './pages/public/Player'
import Schedule from './pages/public/Schedule'
import Live from './pages/public/Live'
import Login from './pages/public/Login'

import Content from './pages/admin/Content'
import Upload from './pages/admin/Upload'
import Categories from './pages/admin/Categories'
import AdminSchedule from './pages/admin/Schedule'
import AdminLive from './pages/admin/Live'
import Team from './pages/admin/Team'
import Bugs from './pages/admin/Bugs'

const queryClient = new QueryClient()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/library" element={<Library />} />
          <Route path="/library/:categoryId" element={<CategoryPage />} />
          <Route path="/player/:id" element={<Player />} />
          <Route path="/schedule" element={<Schedule />} />
          <Route path="/live" element={<Live />} />
          <Route path="/login" element={<Login />} />

          <Route element={<ProtectedRoute />}>
            <Route path="/admin" element={<Navigate to="/admin/content" replace />} />
            <Route path="/admin/content" element={<Content />} />
            <Route path="/admin/upload" element={<Upload />} />
            <Route path="/admin/categories" element={<Categories />} />
            <Route path="/admin/schedule" element={<AdminSchedule />} />
            <Route path="/admin/live" element={<AdminLive />} />
            <Route path="/admin/team" element={<Team />} />
            <Route path="/admin/bugs" element={<Bugs />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>
)
