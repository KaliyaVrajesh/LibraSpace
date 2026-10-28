import React, { useState } from 'react'
import { User, Mail, Shield, Lock, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { authService } from '../services/auth.service'
import { getErrorMessage, getFieldErrors } from '../services/api'
import { Input } from '../components/ui/Input'
import { Button } from '../components/ui/Button'
import { Alert } from '../components/ui/Alert'
import { Badge } from '../components/ui/Badge'

export function ProfilePage() {
  const { user, refreshUser } = useAuth()

  const [nameForm, setNameForm] = useState({ full_name: user?.full_name || '' })
  const [nameLoading, setNameLoading] = useState(false)
  const [nameSuccess, setNameSuccess] = useState('')
  const [nameError, setNameError] = useState('')

  const [pwForm, setPwForm] = useState({
    current_password: '',
    new_password: '',
    confirm_new_password: '',
  })
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [pwLoading, setPwLoading] = useState(false)
  const [pwSuccess, setPwSuccess] = useState('')
  const [pwError, setPwError] = useState('')
  const [pwFieldErrors, setPwFieldErrors] = useState<Record<string, string>>({})

  const handleUpdateName = async (e: React.FormEvent) => {
    e.preventDefault()
    setNameLoading(true)
    setNameError('')
    setNameSuccess('')
    try {
      await authService.updateProfile({ full_name: nameForm.full_name })
      await refreshUser()
      setNameSuccess('Name updated successfully.')
    } catch (err) {
      setNameError(getErrorMessage(err))
    } finally {
      setNameLoading(false)
    }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setPwLoading(true)
    setPwError('')
    setPwSuccess('')
    setPwFieldErrors({})

    if (pwForm.new_password !== pwForm.confirm_new_password) {
      setPwFieldErrors({ confirm_new_password: 'Passwords do not match' })
      setPwLoading(false)
      return
    }

    try {
      await authService.updateProfile({
        current_password: pwForm.current_password,
        new_password: pwForm.new_password,
      })
      setPwSuccess('Password changed successfully.')
      setPwForm({ current_password: '', new_password: '', confirm_new_password: '' })
    } catch (err) {
      setPwError(getErrorMessage(err))
      setPwFieldErrors(getFieldErrors(err))
    } finally {
      setPwLoading(false)
    }
  }

  if (!user) return null

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="page-header">
        <h1 className="page-title">Profile & Settings</h1>
        <p className="page-subtitle">Manage your account details</p>
      </div>

      {/* Account info */}
      <div className="card mb-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-accent-100 text-accent-700 text-2xl font-bold">
            {user.full_name?.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-lg font-bold text-navy-900">{user.full_name}</p>
            <p className="text-sm text-navy-500">{user.email}</p>
            <Badge variant={user.role === 'admin' ? 'blue' : 'green'} className="mt-1">
              {user.role === 'admin' ? 'Administrator' : 'Student'}
            </Badge>
          </div>
        </div>

        <div className="space-y-3 border-t border-navy-100 pt-4">
          {[
            { icon: User, label: 'Full Name', value: user.full_name },
            { icon: Mail, label: 'Email', value: user.email },
            { icon: Shield, label: 'Role', value: user.role === 'admin' ? 'Administrator' : 'Student' },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex items-center gap-3">
              <Icon className="h-4 w-4 text-navy-400 flex-shrink-0" />
              <div>
                <p className="text-xs text-navy-500">{label}</p>
                <p className="text-sm font-medium text-navy-900">{value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Update name */}
      <div className="card mb-6">
        <h2 className="text-base font-semibold text-navy-900 mb-4">Update Display Name</h2>
        {nameSuccess && <Alert variant="success" message={nameSuccess} onDismiss={() => setNameSuccess('')} className="mb-4" />}
        {nameError && <Alert variant="error" message={nameError} onDismiss={() => setNameError('')} className="mb-4" />}
        <form onSubmit={handleUpdateName} className="space-y-4">
          <Input
            label="Full Name"
            value={nameForm.full_name}
            onChange={(e) => setNameForm({ full_name: e.target.value })}
            required
            icon={<User className="h-4 w-4" />}
          />
          <Button type="submit" variant="primary" loading={nameLoading} size="sm">
            Update Name
          </Button>
        </form>
      </div>

      {/* Change password */}
      <div className="card">
        <h2 className="text-base font-semibold text-navy-900 mb-4">Change Password</h2>
        {pwSuccess && <Alert variant="success" message={pwSuccess} onDismiss={() => setPwSuccess('')} className="mb-4" />}
        {pwError && <Alert variant="error" message={pwError} onDismiss={() => setPwError('')} className="mb-4" />}
        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label className="form-label">Current Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-navy-400 pointer-events-none" />
              <input
                type={showCurrent ? 'text' : 'password'}
                autoComplete="current-password"
                required
                value={pwForm.current_password}
                onChange={(e) => setPwForm(f => ({ ...f, current_password: e.target.value }))}
                className="form-input pl-10 pr-10"
                aria-invalid={!!pwFieldErrors.current_password}
              />
              <button type="button" onClick={() => setShowCurrent(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-navy-400">
                {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {pwFieldErrors.current_password && <p className="form-error">{pwFieldErrors.current_password}</p>}
          </div>

          <div>
            <label className="form-label">New Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-navy-400 pointer-events-none" />
              <input
                type={showNew ? 'text' : 'password'}
                autoComplete="new-password"
                required
                value={pwForm.new_password}
                onChange={(e) => setPwForm(f => ({ ...f, new_password: e.target.value }))}
                className="form-input pl-10 pr-10"
                aria-invalid={!!pwFieldErrors.new_password}
              />
              <button type="button" onClick={() => setShowNew(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-navy-400">
                {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {pwFieldErrors.new_password && <p className="form-error">{pwFieldErrors.new_password}</p>}
          </div>

          <Input
            label="Confirm New Password"
            type="password"
            autoComplete="new-password"
            required
            value={pwForm.confirm_new_password}
            onChange={(e) => setPwForm(f => ({ ...f, confirm_new_password: e.target.value }))}
            error={pwFieldErrors.confirm_new_password}
            icon={<Lock className="h-4 w-4" />}
          />

          <Button type="submit" variant="primary" loading={pwLoading} size="sm">
            Change Password
          </Button>
        </form>
      </div>
    </div>
  )
}
