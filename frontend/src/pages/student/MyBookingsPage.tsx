import React, { useEffect, useState, useCallback } from 'react'
import { Calendar, Filter, Search, XCircle, BookOpen } from 'lucide-react'
import { bookingsService } from '../../services/bookings.service'
import type { Booking, BookingStatus } from '../../types'
import { BookingStatusBadge } from '../../components/ui/Badge'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { Button } from '../../components/ui/Button'
import { ConfirmModal } from '../../components/ui/Modal'
import { Alert } from '../../components/ui/Alert'
import { PageLoader } from '../../components/ui/LoadingSpinner'
import { getErrorMessage } from '../../services/api'
import { format } from 'date-fns'

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
]

export function MyBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<BookingStatus | ''>('')
  const [error, setError] = useState('')

  const [cancelModal, setCancelModal] = useState<{ open: boolean; booking: Booking | null }>({
    open: false,
    booking: null,
  })
  const [cancelling, setCancelling] = useState(false)
  const [cancelError, setCancelError] = useState('')
  const [cancelSuccess, setCancelSuccess] = useState('')

  const PER_PAGE = 20

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await bookingsService.list({
        status: statusFilter || undefined,
        page,
        per_page: PER_PAGE,
      })
      setBookings(res.data || [])
      setTotal(res.meta?.total || 0)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [statusFilter, page])

  useEffect(() => { load() }, [load])

  const handleCancel = async () => {
    if (!cancelModal.booking) return
    setCancelling(true)
    setCancelError('')
    try {
      await bookingsService.cancel(cancelModal.booking.id)
      setCancelModal({ open: false, booking: null })
      setCancelSuccess('Booking cancelled successfully.')
      load()
    } catch (err) {
      setCancelError(getErrorMessage(err))
    } finally {
      setCancelling(false)
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="page-header">
        <h1 className="page-title">My Bookings</h1>
        <p className="page-subtitle">
          {total} booking{total !== 1 ? 's' : ''} found
        </p>
      </div>

      {cancelSuccess && (
        <Alert variant="success" message={cancelSuccess} onDismiss={() => setCancelSuccess('')} className="mb-5" />
      )}
      {error && (
        <Alert variant="error" message={error} onDismiss={() => setError('')} className="mb-5" />
      )}

      {/* Filters */}
      <div className="card mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="sm:w-48">
            <Select
              options={STATUS_OPTIONS}
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value as BookingStatus | ''); setPage(1) }}
              label="Status"
            />
          </div>
        </div>
      </div>

      {loading ? (
        <PageLoader />
      ) : bookings.length === 0 ? (
        <div className="card text-center py-16">
          <BookOpen className="h-12 w-12 text-navy-200 mx-auto mb-4" />
          <h3 className="text-base font-semibold text-navy-700 mb-1">No bookings found</h3>
          <p className="text-sm text-navy-500">
            {statusFilter ? `No ${statusFilter} bookings yet.` : 'You haven\'t made any bookings yet.'}
          </p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="card overflow-hidden p-0 hidden md:block">
            <table className="w-full">
              <thead>
                <tr className="bg-navy-50/60 border-b border-navy-100">
                  {['Reference', 'Seat', 'Floor', 'Date', 'Time', 'Status', 'Actions'].map(
                    (h) => (
                      <th
                        key={h}
                        className="text-left px-4 py-3 text-xs font-semibold text-navy-600 uppercase tracking-wide"
                      >
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-50">
                {bookings.map((b) => (
                  <tr key={b.id} className="hover:bg-navy-50/40 transition-colors">
                    <td className="px-4 py-3 text-xs font-mono text-navy-700">{b.booking_reference}</td>
                    <td className="px-4 py-3 text-sm font-medium text-navy-900">{b.seat?.seat_label}</td>
                    <td className="px-4 py-3 text-sm text-navy-600 max-w-[140px] truncate">{b.seat?.floor?.name}</td>
                    <td className="px-4 py-3 text-sm text-navy-600">
                      {format(new Date(b.booking_date + 'T00:00:00'), 'dd MMM yyyy')}
                    </td>
                    <td className="px-4 py-3 text-sm text-navy-600">{b.start_time} – {b.end_time}</td>
                    <td className="px-4 py-3">
                      <BookingStatusBadge status={b.status} />
                    </td>
                    <td className="px-4 py-3">
                      {b.is_cancellable && (
                        <button
                          onClick={() => setCancelModal({ open: true, booking: b })}
                          className="btn-ghost btn-sm text-red-600 hover:bg-red-50"
                        >
                          <XCircle className="h-3.5 w-3.5" /> Cancel
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="space-y-3 md:hidden">
            {bookings.map((b) => (
              <div key={b.id} className="card">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-sm font-semibold text-navy-900">{b.seat?.seat_label} — {b.seat?.floor?.name}</p>
                    <p className="text-xs font-mono text-navy-400">{b.booking_reference}</p>
                  </div>
                  <BookingStatusBadge status={b.status} />
                </div>
                <p className="text-xs text-navy-500">
                  {format(new Date(b.booking_date + 'T00:00:00'), 'EEEE, MMMM d')} · {b.start_time}–{b.end_time}
                </p>
                {b.is_cancellable && (
                  <button
                    onClick={() => setCancelModal({ open: true, booking: b })}
                    className="mt-3 btn-ghost btn-sm text-red-600 hover:bg-red-50 w-full justify-center"
                  >
                    <XCircle className="h-3.5 w-3.5" /> Cancel Booking
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Pagination */}
          {total > PER_PAGE && (
            <div className="flex items-center justify-between mt-5">
              <p className="text-sm text-navy-500">
                Showing {(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, total)} of {total}
              </p>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
                  Previous
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={page * PER_PAGE >= total}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Cancel confirm modal */}
      {cancelModal.booking && (
        <ConfirmModal
          open={cancelModal.open}
          onClose={() => setCancelModal({ open: false, booking: null })}
          onConfirm={handleCancel}
          title="Cancel Booking"
          message={`Cancel booking ${cancelModal.booking.booking_reference}? This cannot be undone.`}
          confirmLabel="Yes, Cancel"
          variant="danger"
          loading={cancelling}
        />
      )}
      {cancelError && (
        <Alert variant="error" message={cancelError} onDismiss={() => setCancelError('')} />
      )}
    </div>
  )
}
