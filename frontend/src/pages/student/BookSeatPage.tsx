import React, { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  MapPin,
  Calendar,
  Clock,
  Info,
  RefreshCw,
  CheckCircle,
  Monitor,
  Wifi,
  Volume2,
  Users,
} from 'lucide-react'
import { floorsService } from '../../services/floors.service'
import { bookingsService } from '../../services/bookings.service'
import type { Floor, SeatWithAvailability, AvailabilityResponse } from '../../types'
import { Select } from '../../components/ui/Select'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { Alert } from '../../components/ui/Alert'
import { LoadingSpinner } from '../../components/ui/LoadingSpinner'
import { getErrorMessage } from '../../services/api'
import { clsx } from 'clsx'
import { format, addDays } from 'date-fns'

const SEAT_TYPE_ICONS: Record<string, React.ElementType> = {
  computer: Monitor,
  quiet: Volume2,
  window: Wifi,
  group: Users,
  regular: MapPin,
}

const SEAT_TYPE_LABELS: Record<string, string> = {
  regular: 'Regular',
  window: 'Window',
  quiet: 'Quiet Zone',
  computer: 'Computer',
  group: 'Group Study',
}

function SeatTile({
  seat,
  isSelected,
  onClick,
}: {
  seat: SeatWithAvailability
  isSelected: boolean
  onClick: () => void
}) {
  const statusColors = {
    available: 'bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100 cursor-pointer',
    occupied: 'bg-red-50 border-red-200 text-red-400 cursor-not-allowed opacity-70',
    inactive: 'bg-navy-50 border-navy-200 text-navy-400 cursor-not-allowed opacity-50',
    selected: 'bg-accent-600 border-accent-600 text-white shadow-lg cursor-pointer ring-2 ring-accent-400',
  }

  const status = !seat.is_active ? 'inactive' : isSelected ? 'selected' : seat.availability_status

  return (
    <button
      onClick={onClick}
      disabled={status === 'occupied' || status === 'inactive'}
      className={clsx(
        'flex flex-col items-center justify-center rounded-xl border-2 p-2 text-center transition-all duration-150 min-w-[52px] min-h-[52px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-500',
        statusColors[status]
      )}
      title={`Seat ${seat.seat_label} — ${SEAT_TYPE_LABELS[seat.seat_type]} (${status})`}
      aria-label={`Seat ${seat.seat_label}, ${status}`}
      aria-pressed={isSelected}
    >
      <span className="text-xs font-bold leading-none">{seat.seat_label}</span>
      <span className="text-[9px] mt-0.5 opacity-75 capitalize">{seat.seat_type.slice(0, 3)}</span>
    </button>
  )
}

function SeatMap({
  seats,
  selectedSeat,
  onSelect,
  loading,
}: {
  seats: SeatWithAvailability[]
  selectedSeat: SeatWithAvailability | null
  onSelect: (seat: SeatWithAvailability) => void
  loading: boolean
}) {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!seats.length) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-navy-400">
        <MapPin className="h-10 w-10 mb-3 text-navy-200" />
        <p className="text-sm">No seats available on this floor</p>
      </div>
    )
  }

  // Build grid structure
  const maxRow = Math.max(...seats.map((s) => s.row_number))
  const maxCol = Math.max(...seats.map((s) => s.column_number))

  const grid: Record<string, SeatWithAvailability> = {}
  seats.forEach((s) => {
    grid[`${s.row_number},${s.column_number}`] = s
  })

  return (
    <div className="overflow-x-auto pb-2">
      <div
        className="inline-grid gap-2"
        style={{ gridTemplateColumns: `repeat(${maxCol}, minmax(52px, 1fr))` }}
        role="group"
        aria-label="Seat selection grid"
      >
        {Array.from({ length: maxRow }).map((_, ri) =>
          Array.from({ length: maxCol }).map((_, ci) => {
            const key = `${ri + 1},${ci + 1}`
            const seat = grid[key]
            if (!seat) return <div key={key} className="w-14 h-14" aria-hidden="true" />
            return (
              <SeatTile
                key={seat.id}
                seat={seat}
                isSelected={selectedSeat?.id === seat.id}
                onClick={() => {
                  if (seat.is_active && seat.availability_status === 'available') {
                    onSelect(seat)
                  }
                }}
              />
            )
          })
        )}
      </div>
    </div>
  )
}

// Generate date options (today + 6 days)
const dateOptions = Array.from({ length: 7 }, (_, i) => {
  const d = addDays(new Date(), i)
  return {
    value: format(d, 'yyyy-MM-dd'),
    label: i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : format(d, 'EEE, MMM d'),
  }
})

// Time slot options (8:00–21:30 in 30-min increments)
const timeOptions = Array.from({ length: 27 }, (_, i) => {
  const h = Math.floor(i / 2) + 8
  const m = i % 2 === 0 ? '00' : '30'
  return { value: `${String(h).padStart(2, '0')}:${m}`, label: `${String(h).padStart(2, '0')}:${m}` }
})

export function BookSeatPage() {
  const navigate = useNavigate()

  const [floors, setFloors] = useState<Floor[]>([])
  const [selectedFloorId, setSelectedFloorId] = useState('')
  const [selectedDate, setSelectedDate] = useState(dateOptions[0].value)
  const [selectedStart, setSelectedStart] = useState('09:00')
  const [selectedEnd, setSelectedEnd] = useState('11:00')

  const [availabilityData, setAvailabilityData] = useState<AvailabilityResponse | null>(null)
  const [availLoading, setAvailLoading] = useState(false)
  const [availError, setAvailError] = useState('')

  const [selectedSeat, setSelectedSeat] = useState<SeatWithAvailability | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [booking, setBooking] = useState(false)
  const [bookingError, setBookingError] = useState('')
  const [successBooking, setSuccessBooking] = useState<{ ref: string } | null>(null)

  // Load floors
  useEffect(() => {
    floorsService.list().then((fs) => {
      setFloors(fs)
      if (fs.length > 0) setSelectedFloorId(fs[0].id)
    })
  }, [])

  const fetchAvailability = useCallback(async () => {
    if (!selectedFloorId || !selectedDate || !selectedStart || !selectedEnd) return
    if (selectedEnd <= selectedStart) return

    setAvailLoading(true)
    setAvailError('')
    setSelectedSeat(null)

    try {
      const data = await bookingsService.getAvailability({
        floor_id: selectedFloorId,
        date: selectedDate,
        start_time: selectedStart,
        end_time: selectedEnd,
      })
      setAvailabilityData(data)
    } catch (err) {
      setAvailError(getErrorMessage(err))
    } finally {
      setAvailLoading(false)
    }
  }, [selectedFloorId, selectedDate, selectedStart, selectedEnd])

  useEffect(() => {
    fetchAvailability()
  }, [fetchAvailability])

  const handleBook = async () => {
    if (!selectedSeat) return
    setBooking(true)
    setBookingError('')
    try {
      const b = await bookingsService.create({
        seat_id: selectedSeat.id,
        booking_date: selectedDate,
        start_time: selectedStart,
        end_time: selectedEnd,
      })
      setSuccessBooking({ ref: b.booking_reference })
      setConfirmOpen(false)
      fetchAvailability()
    } catch (err) {
      setBookingError(getErrorMessage(err))
      setConfirmOpen(false)
    } finally {
      setBooking(false)
    }
  }

  const seats = availabilityData?.seats || []
  const summary = availabilityData?.summary
  const selectedFloor = floors.find((f) => f.id === selectedFloorId)

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="page-header">
        <h1 className="page-title">Book a Seat</h1>
        <p className="page-subtitle">Select a floor, date, and time slot, then choose your seat</p>
      </div>

      {successBooking && (
        <Alert
          variant="success"
          title="Seat booked!"
          message={`Booking confirmed — Reference: ${successBooking.ref}`}
          onDismiss={() => setSuccessBooking(null)}
          className="mb-6"
        />
      )}
      {bookingError && (
        <Alert
          variant="error"
          message={bookingError}
          onDismiss={() => setBookingError('')}
          className="mb-6"
        />
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Controls */}
        <div className="space-y-5">
          <div className="card">
            <h2 className="text-sm font-semibold text-navy-900 mb-4 flex items-center gap-2">
              <MapPin className="h-4 w-4 text-accent-600" />
              Floor
            </h2>
            <Select
              options={floors.map((f) => ({ value: f.id, label: f.name }))}
              value={selectedFloorId}
              onChange={(e) => setSelectedFloorId(e.target.value)}
              placeholder="Select a floor"
            />
            {selectedFloor && (
              <p className="mt-2 text-xs text-navy-500">{selectedFloor.description}</p>
            )}
          </div>

          <div className="card">
            <h2 className="text-sm font-semibold text-navy-900 mb-4 flex items-center gap-2">
              <Calendar className="h-4 w-4 text-accent-600" />
              Date
            </h2>
            <Select
              options={dateOptions}
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </div>

          <div className="card">
            <h2 className="text-sm font-semibold text-navy-900 mb-4 flex items-center gap-2">
              <Clock className="h-4 w-4 text-accent-600" />
              Time Slot
            </h2>
            <div className="space-y-3">
              <Select
                label="Start time"
                options={timeOptions}
                value={selectedStart}
                onChange={(e) => setSelectedStart(e.target.value)}
              />
              <Select
                label="End time"
                options={timeOptions.filter((t) => t.value > selectedStart)}
                value={selectedEnd}
                onChange={(e) => setSelectedEnd(e.target.value)}
              />
            </div>
            <p className="mt-2 text-xs text-navy-500">Library hours: 08:00–22:00. Max 4 hours.</p>
          </div>

          {/* Legend */}
          <div className="card">
            <h2 className="text-sm font-semibold text-navy-900 mb-3 flex items-center gap-2">
              <Info className="h-4 w-4 text-accent-600" />
              Legend
            </h2>
            <div className="space-y-2">
              {[
                { color: 'bg-emerald-100 border-emerald-200', label: 'Available' },
                { color: 'bg-red-100 border-red-200', label: 'Occupied' },
                { color: 'bg-navy-100 border-navy-200', label: 'Inactive' },
                { color: 'bg-accent-600 border-accent-600', label: 'Selected' },
              ].map(({ color, label }) => (
                <div key={label} className="flex items-center gap-2">
                  <div className={`w-5 h-5 rounded border-2 flex-shrink-0 ${color}`} aria-hidden="true" />
                  <span className="text-xs text-navy-600">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Seat map */}
        <div className="lg:col-span-2">
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-semibold text-navy-900">
                  {selectedFloor?.name || 'Floor Map'}
                </h2>
                {summary && (
                  <p className="text-xs text-navy-500 mt-0.5">
                    {summary.available} available · {summary.occupied} occupied · {summary.total} total
                  </p>
                )}
              </div>
              <button
                onClick={fetchAvailability}
                className="btn-ghost btn-sm flex items-center gap-1"
                title="Refresh availability"
              >
                <RefreshCw className={clsx('h-3.5 w-3.5', availLoading && 'animate-spin')} />
                Refresh
              </button>
            </div>

            {availError && <Alert variant="error" message={availError} className="mb-4" />}

            <SeatMap
              seats={seats}
              selectedSeat={selectedSeat}
              onSelect={setSelectedSeat}
              loading={availLoading}
            />

            {/* Selected seat detail */}
            {selectedSeat && (
              <div className="mt-4 p-4 rounded-xl bg-accent-50 border border-accent-200 animate-fade-in">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-semibold text-navy-900">
                      Seat {selectedSeat.seat_label} selected
                    </p>
                    <p className="text-xs text-navy-600 mt-0.5">
                      {SEAT_TYPE_LABELS[selectedSeat.seat_type]} · Row {selectedSeat.row_number}, Column{' '}
                      {selectedSeat.column_number}
                    </p>
                    <p className="text-xs text-navy-500 mt-0.5">
                      {format(new Date(selectedDate + 'T00:00:00'), 'EEE, MMMM d')} · {selectedStart} – {selectedEnd}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedSeat(null)}
                    className="text-xs text-navy-400 hover:text-navy-600"
                  >
                    Clear
                  </button>
                </div>
                <Button
                  variant="accent"
                  size="sm"
                  className="mt-3 w-full sm:w-auto"
                  onClick={() => setConfirmOpen(true)}
                  icon={<CheckCircle className="h-3.5 w-3.5" />}
                >
                  Confirm Booking
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation modal */}
      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Confirm Your Booking"
        size="sm"
      >
        {selectedSeat && (
          <div className="space-y-4">
            <div className="space-y-3">
              {[
                { label: 'Floor', value: selectedFloor?.name },
                { label: 'Seat', value: `${selectedSeat.seat_label} (${SEAT_TYPE_LABELS[selectedSeat.seat_type]})` },
                { label: 'Date', value: format(new Date(selectedDate + 'T00:00:00'), 'EEEE, MMMM d, yyyy') },
                { label: 'Time', value: `${selectedStart} – ${selectedEnd}` },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between items-center text-sm">
                  <span className="text-navy-500">{label}</span>
                  <span className="font-medium text-navy-900">{value}</span>
                </div>
              ))}
            </div>

            {bookingError && <Alert variant="error" message={bookingError} />}

            <div className="flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={() => setConfirmOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="accent"
                className="flex-1"
                loading={booking}
                onClick={handleBook}
              >
                Book Seat
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
