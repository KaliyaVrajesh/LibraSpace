import React from 'react'
import { Outlet, Navigate } from 'react-router-dom'
import { Navbar } from './Navbar'
import { useAuth } from '../../context/AuthContext'
import { PageLoader } from '../ui/LoadingSpinner'

interface AppLayoutProps {
  requireAuth?: boolean
  requireAdmin?: boolean
}

export function AppLayout({ requireAuth = false, requireAdmin = false }: AppLayoutProps) {
  const { isAuthenticated, isLoading, user } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen bg-surface">
        <PageLoader />
      </div>
    )
  }

  if (requireAuth && !isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (requireAdmin && user?.role !== 'admin') {
    return <Navigate to="/dashboard" replace />
  }

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  )
}
