import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Calendar,
  BookOpen,
  CheckCircle,
  Clock,
  XCircle,
  Plus,
  ArrowRight,
  Layers,
} from 'lucide-react'
import { dashboardService } from '../../services/dashboard.service'
import { bookingsService } from '../../services/bookings.service'
import type { StudentDashboardData, Booking } from '../../types'
import { BookingStatusBadge } from '../../components/ui/Badge'
import { PageLoader, SkeletonCard } from '../../components/ui/LoadingSpinner'
import { Alert } from '../../components/ui/Alert'
import { ConfirmModal } from '../../components/ui/Modal'
import { getErrorMessage } from '../../services/api'
import { format } from 'date-fns'

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType
  label: string
  value: string | number
  color: string
}) {
  return (
    <div className="card">
      <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl mb-3 ${color}`}>
        <Icon className="h-5 w-5" aria-hidden="true" />
      </div>
      <p className="text-2xl font-bold text-navy-900">{value}</p>
      <p className="text-sm text-navy-500 mt-0.5">{label}</p>
    </div>
  )
}

export function StudentDashboardPage() {
  const [data, setData] = useState<StudentDashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [cancelModal, setCancelModal] = useState<{ open: boolean; booking: Booking | null }>({
    open: false,
    booking: null,
  })
  const [cancelling, setCancelling] = useState(false)
  const [cancelError, setCancelError] = useState('')

  const load = async () => {
    try {
      const d = await dashboardService.getStudentDashboard()
      setData(d)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleCancel = async () => {
    if (!cancelModal.booking) return
    setCancelling(true)
    setCancelError('')
    try {
      await bookingsService.cancel(cancelModal.booking.id)
      setCancelModal({ open: false, booking: null })
      load()
    } catch (err) {
      setCancelError(getErrorMessage(err))
    } finally {
      setCancelling(false)
    }
  }

  if (loading) return <PageLoader />
  if (error) return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <Alert variant="error" message={error} />
    </div>
  )
  if (!data) return null

  const { stats, upcoming_bookings, recent_bookings, user } = data

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-navy-900">
            Welcome back, {user.full_name.split(' ')[0]} 👋
          </h1>
          <p className="mt-1 text-sm text-navy-500">
            Here's what's happening with your library bookings
          </p>
        </div>
        <Link to="/book" className="btn-primary hidden sm:flex">
          <Plus className="h-4 w-4" />
          Book a Seat
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          icon={Calendar}
          label="Total Bookings"
          value={stats.total_bookings}
          color="bg-accent-50 text-accent-600"
        />
        <StatCard
          icon={CheckCircle}
          label="Completed Sessions"
          value={stats.completed_sessions}
          color="bg-emerald-50 text-emerald-600"
        />
        <StatCard
          icon={Clock}
          label="Upcoming Bookings"
          value={stats.upcoming_bookings}
          color="bg-amber-50 text-amber-600"
        />
        <StatCard
          icon={Layers}
          label="Available Seats"
          value={stats.total_active_seats}
          color="bg-sky-50 text-sky-600"
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Upcoming bookings */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-navy-900">Upcoming Bookings</h2>
            <Link
              to="/my-bookings"
              className="text-xs font-medium text-accent-600 hover:text-accent-700 flex items-center gap-1"
            >
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          {upcoming_bookings.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="h-10 w-10 text-navy-200 mx-auto mb-3" />
              <p className="text-sm font-medium text-navy-700 mb-1">No upcoming bookings</p>
              <p className="text-xs text-navy-500 mb-4">Book a seat to get started</p>
              <Link to="/book" className="btn-primary btn-sm">
                <Plus className="h-3 w-3" /> Book Now
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {upcoming_bookings.map((booking) => (
                <div
                  key={booking.id}
                  className="flex items-start justify-between p-3 rounded-xl bg-navy-50/60 border border-navy-100"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-navy-900 truncate">
                      {booking.seat?.seat_label} — {booking.seat?.floor?.name}
                    </p>
                    <p className="text-xs text-navy-500 mt-0.5">
                      {format(new Date(booking.booking_date + 'T00:00:00'), 'EEE, MMM d')} ·{' '}
                      {booking.start_time} – {booking.end_time}
                    </p>
                    <p className="text-xs text-navy-400 font-mono mt-0.5">
                      {booking.booking_reference}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                    <BookingStatusBadge status={booking.status} />
                    {booking.is_cancellable && (
                      <button
                        onClick={() => setCancelModal({ open: true, booking })}
                        className="p-1 rounded-lg text-navy-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        title="Cancel booking"
                        aria-label="Cancel this booking"
                      >
                        <XCircle className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent activity */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-navy-900">Recent Activity</h2>
            <Link
              to="/my-bookings"
              className="text-xs font-medium text-accent-600 hover:text-accent-700 flex items-center gap-1"
            >
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          {recent_bookings.length === 0 ? (
            <div className="text-center py-8">
              <BookOpen className="h-10 w-10 text-navy-200 mx-auto mb-3" />
              <p className="text-sm text-navy-500">No booking history yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recent_bookings.slice(0, 6).map((booking) => (
                <div key={booking.id} className="flex items-center gap-3 py-2 border-b border-navy-50 last:border-0">
                  <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-lg bg-navy-50">
                    <BookOpen className="h-4 w-4 text-navy-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-navy-800 truncate">
                      Seat {booking.seat?.seat_label}
                    </p>
                    <p className="text-xs text-navy-400">
                      {booking.booking_date} · {booking.start_time}–{booking.end_time}
                    </p>
                  </div>
                  <BookingStatusBadge status={booking.status} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Mobile book button */}
      <div className="fixed bottom-6 right-6 sm:hidden">
        <Link to="/book" className="btn-accent rounded-full shadow-modal w-14 h-14 !px-0 !py-0 flex items-center justify-center">
          <Plus className="h-6 w-6" />
          <span className="sr-only">Book a Seat</span>
        </Link>
      </div>

      {/* Cancel modal */}
      {cancelModal.booking && (
        <ConfirmModal
          open={cancelModal.open}
          onClose={() => setCancelModal({ open: false, booking: null })}
          onConfirm={handleCancel}
          title="Cancel Booking"
          message={`Are you sure you want to cancel booking ${cancelModal.booking.booking_reference}? This action cannot be undone.`}
          confirmLabel="Yes, Cancel Booking"
          variant="danger"
          loading={cancelling}
        />
      )}
      {cancelError && (
        <Alert variant="error" message={cancelError} onDismiss={() => setCancelError('')} className="fixed bottom-4 left-4 right-4 z-50" />
      )}
    </div>
  )
}
