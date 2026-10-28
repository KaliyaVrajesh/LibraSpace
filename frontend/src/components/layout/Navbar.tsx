import React, { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { BookOpen, Menu, X, LogOut, User, LayoutDashboard, Calendar } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { clsx } from 'clsx'

export function Navbar() {
  const { user, isAuthenticated, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const studentLinks = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/book', label: 'Book a Seat', icon: BookOpen },
    { to: '/my-bookings', label: 'My Bookings', icon: Calendar },
  ]

  const adminLinks = [
    { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/admin/floors', label: 'Floors & Seats', icon: BookOpen },
    { to: '/admin/bookings', label: 'Bookings', icon: Calendar },
  ]

  const links = user?.role === 'admin' ? adminLinks : studentLinks

  return (
    <nav className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-navy-100 shadow-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link to={isAuthenticated ? (user?.role === 'admin' ? '/admin/dashboard' : '/dashboard') : '/'} className="flex items-center gap-2.5 group">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-navy-800 group-hover:bg-navy-700 transition-colors">
              <BookOpen className="h-4 w-4 text-white" aria-hidden="true" />
            </div>
            <span className="text-lg font-bold text-navy-900">
              Libra<span className="text-accent-600">Space</span>
            </span>
          </Link>

          {/* Desktop nav */}
          {isAuthenticated && (
            <div className="hidden md:flex items-center gap-1">
              {links.map(({ to, label, icon: Icon }) => (
                <Link
                  key={to}
                  to={to}
                  className={clsx(
                    'flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-colors',
                    location.pathname.startsWith(to)
                      ? 'bg-navy-50 text-navy-900'
                      : 'text-navy-600 hover:bg-navy-50 hover:text-navy-900'
                  )}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  {label}
                </Link>
              ))}
            </div>
          )}

          {/* Right side */}
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <>
                <Link
                  to="/profile"
                  className="hidden md:flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-navy-600 hover:bg-navy-50 hover:text-navy-900 transition-colors"
                >
                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-accent-100 text-accent-700 text-xs font-semibold">
                    {user?.full_name?.charAt(0).toUpperCase()}
                  </div>
                  <span className="max-w-[120px] truncate">{user?.full_name}</span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="hidden md:flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-navy-600 hover:bg-red-50 hover:text-red-700 transition-colors"
                  title="Log out"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="sr-only md:not-sr-only">Logout</span>
                </button>
              </>
            ) : (
              <div className="hidden md:flex items-center gap-2">
                <Link to="/login" className="btn-ghost btn-sm">Sign In</Link>
                <Link to="/register" className="btn-primary btn-sm">Get Started</Link>
              </div>
            )}

            {/* Mobile menu toggle */}
            <button
              className="md:hidden rounded-xl p-2 text-navy-600 hover:bg-navy-50"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-expanded={mobileOpen}
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-navy-100 bg-white px-4 pb-4 pt-2 animate-fade-in">
          {isAuthenticated ? (
            <>
              <div className="flex items-center gap-3 py-3 border-b border-navy-100 mb-2">
                <div className="flex items-center justify-center w-9 h-9 rounded-full bg-accent-100 text-accent-700 font-semibold">
                  {user?.full_name?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-medium text-navy-900">{user?.full_name}</p>
                  <p className="text-xs text-navy-500 capitalize">{user?.role}</p>
                </div>
              </div>
              {links.map(({ to, label, icon: Icon }) => (
                <Link
                  key={to}
                  to={to}
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-navy-700 hover:bg-navy-50"
                  onClick={() => setMobileOpen(false)}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Link>
              ))}
              <Link
                to="/profile"
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-navy-700 hover:bg-navy-50"
                onClick={() => setMobileOpen(false)}
              >
                <User className="h-4 w-4" />
                Profile
              </Link>
              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 mt-1"
              >
                <LogOut className="h-4 w-4" />
                Log Out
              </button>
            </>
          ) : (
            <div className="flex flex-col gap-2 pt-2">
              <Link to="/login" className="btn-secondary w-full justify-center" onClick={() => setMobileOpen(false)}>
                Sign In
              </Link>
              <Link to="/register" className="btn-primary w-full justify-center" onClick={() => setMobileOpen(false)}>
                Get Started
              </Link>
            </div>
          )}
        </div>
      )}
    </nav>
  )
}
