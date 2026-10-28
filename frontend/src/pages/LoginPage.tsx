import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Mail, Lock, BookOpen } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { getErrorMessage, getFieldErrors } from '../services/api'
import { Input } from '../components/ui/Input'
import { Button } from '../components/ui/Button'
import { Alert } from '../components/ui/Alert'

export function LoginPage() {
  const navigate = useNavigate()
  const { login, user } = useAuth()

  const [form, setForm] = useState({ email: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setFieldErrors({})
    setLoading(true)

    try {
      await login(form)
      // Redirect based on role
      navigate(user?.role === 'admin' ? '/admin/dashboard' : '/dashboard', { replace: true })
    } catch (err) {
      setError(getErrorMessage(err))
      setFieldErrors(getFieldErrors(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-surface flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:flex-1 bg-gradient-to-br from-navy-900 to-navy-700 items-center justify-center p-12 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
          <div className="absolute top-1/4 left-1/4 w-72 h-72 rounded-full bg-accent-600/20 blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-64 h-64 rounded-full bg-navy-600/30 blur-3xl" />
        </div>
        <div className="relative text-white max-w-md text-center">
          <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-sm mb-6 mx-auto border border-white/20">
            <BookOpen className="h-8 w-8" aria-hidden="true" />
          </div>
          <h1 className="text-3xl font-bold mb-4">Welcome back to LibraSpace</h1>
          <p className="text-navy-300 text-base leading-relaxed">
            Your intelligent library seat booking platform. Find, reserve, and manage your study space in minutes.
          </p>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <Link to="/" className="flex items-center justify-center gap-2.5 mb-8 lg:hidden">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-navy-800">
              <BookOpen className="h-4 w-4 text-white" />
            </div>
            <span className="text-lg font-bold text-navy-900">
              Libra<span className="text-accent-600">Space</span>
            </span>
          </Link>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-navy-900">Sign in to your account</h2>
            <p className="mt-2 text-sm text-navy-500">
              Don't have an account?{' '}
              <Link to="/register" className="font-medium text-accent-600 hover:text-accent-700">
                Create one free
              </Link>
            </p>
          </div>

          {error && (
            <Alert
              variant="error"
              message={error}
              onDismiss={() => setError('')}
              className="mb-6"
            />
          )}

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            <Input
              label="Email address"
              type="email"
              autoComplete="email"
              required
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              error={fieldErrors.email}
              icon={<Mail className="h-4 w-4" />}
              placeholder="you@example.com"
            />

            <div>
              <label className="form-label" htmlFor="password">
                Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-navy-400" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  className="form-input pl-10 pr-10"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-navy-400 hover:text-navy-600 transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {fieldErrors.password && <p className="form-error">{fieldErrors.password}</p>}
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={loading}
              className="w-full mt-2"
            >
              Sign In
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
