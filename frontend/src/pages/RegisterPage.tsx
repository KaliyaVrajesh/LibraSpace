import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Mail, Lock, User, BookOpen, CheckCircle } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { getErrorMessage, getFieldErrors } from '../services/api'
import { Input } from '../components/ui/Input'
import { Button } from '../components/ui/Button'
import { Alert } from '../components/ui/Alert'

function PasswordStrengthBar({ password }: { password: string }) {
  const checks = [
    { label: '8+ characters', ok: password.length >= 8 },
    { label: 'Uppercase letter', ok: /[A-Z]/.test(password) },
    { label: 'Lowercase letter', ok: /[a-z]/.test(password) },
    { label: 'Number', ok: /\d/.test(password) },
  ]
  const score = checks.filter((c) => c.ok).length
  const barColor =
    score === 0 ? 'bg-navy-100' :
    score <= 1 ? 'bg-red-400' :
    score <= 2 ? 'bg-amber-400' :
    score === 3 ? 'bg-yellow-400' :
    'bg-emerald-500'

  if (!password) return null

  return (
    <div className="mt-2 space-y-2">
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-all duration-300 ${
              i <= score ? barColor : 'bg-navy-100'
            }`}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1">
        {checks.map(({ label, ok }) => (
          <span
            key={label}
            className={`flex items-center gap-1 text-xs ${ok ? 'text-emerald-600' : 'text-navy-400'}`}
          >
            <CheckCircle className={`h-3 w-3 ${ok ? 'text-emerald-500' : 'text-navy-300'}`} />
            {label}
          </span>
        ))}
      </div>
    </div>
  )
}

export function RegisterPage() {
  const navigate = useNavigate()
  const { register } = useAuth()

  const [form, setForm] = useState({
    full_name: '',
    email: '',
    password: '',
    confirm_password: '',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setFieldErrors({})
    setLoading(true)

    try {
      await register(form)
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setError(getErrorMessage(err))
      setFieldErrors(getFieldErrors(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <Link to="/" className="flex items-center justify-center gap-2.5 mb-8">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-navy-800">
            <BookOpen className="h-4 w-4 text-white" />
          </div>
          <span className="text-lg font-bold text-navy-900">
            Libra<span className="text-accent-600">Space</span>
          </span>
        </Link>

        <div className="card">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-navy-900">Create your account</h1>
            <p className="mt-1.5 text-sm text-navy-500">
              Already have an account?{' '}
              <Link to="/login" className="font-medium text-accent-600 hover:text-accent-700">
                Sign in
              </Link>
            </p>
          </div>

          {error && (
            <Alert
              variant="error"
              message={error}
              onDismiss={() => setError('')}
              className="mb-5"
            />
          )}

          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            <Input
              label="Full Name"
              type="text"
              autoComplete="name"
              required
              value={form.full_name}
              onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
              error={fieldErrors.full_name}
              icon={<User className="h-4 w-4" />}
              placeholder="Jane Doe"
            />

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
                  autoComplete="new-password"
                  required
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  className="form-input pl-10 pr-10"
                  placeholder="Create a strong password"
                  aria-invalid={!!fieldErrors.password}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-navy-400 hover:text-navy-600"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {fieldErrors.password && <p className="form-error">{fieldErrors.password}</p>}
              <PasswordStrengthBar password={form.password} />
            </div>

            <div>
              <label className="form-label" htmlFor="confirm_password">
                Confirm Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-navy-400" />
                <input
                  id="confirm_password"
                  type={showConfirm ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  value={form.confirm_password}
                  onChange={(e) => setForm((f) => ({ ...f, confirm_password: e.target.value }))}
                  className="form-input pl-10 pr-10"
                  placeholder="Repeat your password"
                  aria-invalid={!!fieldErrors.confirm_password}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-navy-400 hover:text-navy-600"
                  aria-label={showConfirm ? 'Hide confirm password' : 'Show confirm password'}
                >
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {fieldErrors.confirm_password && (
                <p className="form-error">{fieldErrors.confirm_password}</p>
              )}
            </div>

            <p className="text-xs text-navy-500">
              By creating an account you agree to our terms of service. Your account will have student access.
            </p>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={loading}
              className="w-full"
            >
              Create Account
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
