import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { AppLayout } from './components/layout/AppLayout'

// Public pages
import { LandingPage } from './pages/LandingPage'
import { LoginPage } from './pages/LoginPage'
import { RegisterPage } from './pages/RegisterPage'

// Student pages
import { StudentDashboardPage } from './pages/student/DashboardPage'
import { BookSeatPage } from './pages/student/BookSeatPage'
import { MyBookingsPage } from './pages/student/MyBookingsPage'

// Admin pages
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage'
import { AdminFloorsPage } from './pages/admin/AdminFloorsPage'
import { AdminBookingsPage } from './pages/admin/AdminBookingsPage'

// Shared
import { ProfilePage } from './pages/ProfilePage'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public routes (no auth required) */}
          <Route element={<AppLayout />}>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
          </Route>

          {/* Student routes (auth required) */}
          <Route element={<AppLayout requireAuth />}>
            <Route path="/dashboard" element={<StudentDashboardPage />} />
            <Route path="/book" element={<BookSeatPage />} />
            <Route path="/my-bookings" element={<MyBookingsPage />} />
            <Route path="/profile" element={<ProfilePage />} />
          </Route>

          {/* Admin routes (auth + admin role required) */}
          <Route element={<AppLayout requireAuth requireAdmin />}>
            <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
            <Route path="/admin/floors" element={<AdminFloorsPage />} />
            <Route path="/admin/bookings" element={<AdminBookingsPage />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
