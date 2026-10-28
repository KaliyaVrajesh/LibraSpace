import React, { useEffect, useState, useCallback } from 'react'
import { Search, XCircle, BookOpen } from 'lucide-react'
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

export function AdminBookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState<string>('')
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [cancelModal, setCancelModal] = useState<{ open: boolean; booking: Booking | null }>({ open: false, booking: null })
  const [cancelling, setCancelling] = useState(false)

  const PER_PAGE = 20

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await bookingsService.adminList({
        status: status || undefined,
        search: search || undefined,
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
  }, [status, search, page])

  useEffect(() => { load() }, [load])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setSearch(searchInput)
    setPage(1)
  }

  const handleCancel = async () => {
    if (!cancelModal.booking) return
    setCancelling(true)
    try {
      await bookingsService.cancel(cancelModal.booking.id)
      setSuccess('Booking cancelled.')
      setCancelModal({ open: false, booking: null })
      load()
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setCancelling(false)
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="page-header">
        <h1 className="page-title">All Bookings</h1>
        <p className="page-subtitle">{total} booking{total !== 1 ? 's' : ''}</p>
      </div>

      {success && <Alert variant="success" message={success} onDismiss={() => setSuccess('')} className="mb-5" />}
      {error && <Alert variant="error" message={error} onDismiss={() => setError('')} className="mb-5" />}

      {/* Filters */}
      <div className="card mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <form onSubmit={handleSearch} className="flex gap-2 flex-1">
            <Input
              placeholder="Search by name, email, or reference..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              icon={<Search className="h-4 w-4" />}
            />
            <Button type="submit" variant="secondary">Search</Button>
          </form>
          <div className="sm:w-44">
            <Select
              options={STATUS_OPTIONS}
              value={status}
              onChange={(e) => { setStatus(e.target.value); setPage(1) }}
              placeholder="All Statuses"
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
          <p className="text-sm text-navy-500">Try adjusting your search or filters.</p>
        </div>
      ) : (
        <>
          <div className="card overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-navy-50/60 border-b border-navy-100">
                    {['Reference', 'Student', 'Seat', 'Date', 'Time', 'Status', 'Actions'].map((h) => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-navy-600 uppercase tracking-wide">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-navy-50">
                  {bookings.map((b) => (
                    <tr key={b.id} className="hover:bg-navy-50/40 transition-colors">
                      <td className="px-4 py-3 text-xs font-mono text-navy-700">{b.booking_reference}</td>
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-navy-900">{b.user?.full_name}</p>
                        <p className="text-xs text-navy-500">{b.user?.email}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-navy-900">{b.seat?.seat_label}</p>
                        <p className="text-xs text-navy-500 max-w-[120px] truncate">{b.seat?.floor?.name}</p>
                      </td>
                      <td className="px-4 py-3 text-sm text-navy-600">
                        {format(new Date(b.booking_date + 'T00:00:00'), 'dd MMM yyyy')}
                      </td>
                      <td className="px-4 py-3 text-sm text-navy-600 whitespace-nowrap">
                        {b.start_time} – {b.end_time}
                      </td>
                      <td className="px-4 py-3">
                        <BookingStatusBadge status={b.status} />
                      </td>
                      <td className="px-4 py-3">
                        {b.status === 'confirmed' && (
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
          </div>

          {total > PER_PAGE && (
            <div className="flex items-center justify-between mt-5">
              <p className="text-sm text-navy-500">
                {(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, total)} of {total}
              </p>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
                  Previous
                </Button>
                <Button variant="secondary" size="sm" disabled={page * PER_PAGE >= total} onClick={() => setPage((p) => p + 1)}>
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      <ConfirmModal
        open={cancelModal.open}
        onClose={() => setCancelModal({ open: false, booking: null })}
        onConfirm={handleCancel}
        title="Cancel Booking"
        message={`Cancel booking ${cancelModal.booking?.booking_reference} for ${cancelModal.booking?.user?.full_name}? This cannot be undone.`}
        confirmLabel="Cancel Booking"
        variant="danger"
        loading={cancelling}
      />
    </div>
  )
}
