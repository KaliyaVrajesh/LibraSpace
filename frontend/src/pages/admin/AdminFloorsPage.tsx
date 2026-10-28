import React, { useEffect, useState, useCallback } from 'react'
import {
  Plus,
  Pencil,
  Trash2,
  ToggleLeft,
  ToggleRight,
  ChevronDown,
  ChevronRight,
  Layers,
  LayoutGrid,
} from 'lucide-react'
import { floorsService } from '../../services/floors.service'
import { seatsService } from '../../services/seats.service'
import type { Floor, Seat } from '../../types'
import { Modal, ConfirmModal } from '../../components/ui/Modal'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { Button } from '../../components/ui/Button'
import { Alert } from '../../components/ui/Alert'
import { Badge } from '../../components/ui/Badge'
import { PageLoader } from '../../components/ui/LoadingSpinner'
import { getErrorMessage, getFieldErrors } from '../../services/api'

const SEAT_TYPES = [
  { value: 'regular', label: 'Regular' },
  { value: 'window', label: 'Window' },
  { value: 'quiet', label: 'Quiet Zone' },
  { value: 'computer', label: 'Computer' },
  { value: 'group', label: 'Group Study' },
]

function FloorForm({
  initial,
  onSave,
  onClose,
}: {
  initial?: Partial<Floor>
  onSave: (data: Partial<Floor>) => Promise<void>
  onClose: () => void
}) {
  const [form, setForm] = useState({
    name: initial?.name || '',
    floor_number: String(initial?.floor_number ?? ''),
    description: initial?.description || '',
    is_active: initial?.is_active ?? true,
  })
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrors({})
    try {
      await onSave({
        name: form.name,
        floor_number: parseInt(form.floor_number, 10),
        description: form.description,
        is_active: form.is_active,
      })
      onClose()
    } catch (err) {
      setErrors(getFieldErrors(err) || { _: getErrorMessage(err) })
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {errors._ && <Alert variant="error" message={errors._} />}
      <Input label="Floor Name" value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} error={errors.name} required />
      <Input label="Floor Number" type="number" min="0" value={form.floor_number} onChange={(e) => setForm(f => ({ ...f, floor_number: e.target.value }))} error={errors.floor_number} required />
      <div>
        <label className="form-label">Description</label>
        <textarea
          className="form-input resize-none"
          rows={3}
          value={form.description}
          onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
          placeholder="Optional description..."
        />
      </div>
      {initial && (
        <div className="flex items-center gap-3">
          <input type="checkbox" id="is_active_floor" checked={form.is_active} onChange={(e) => setForm(f => ({ ...f, is_active: e.target.checked }))} className="rounded" />
          <label htmlFor="is_active_floor" className="text-sm text-navy-700">Active (visible to students)</label>
        </div>
      )}
      <div className="flex gap-3 justify-end">
        <Button variant="secondary" onClick={onClose} type="button">Cancel</Button>
        <Button variant="primary" type="submit" loading={loading}>{initial ? 'Update Floor' : 'Create Floor'}</Button>
      </div>
    </form>
  )
}

function SeatForm({
  floorId,
  initial,
  onSave,
  onClose,
}: {
  floorId: string
  initial?: Partial<Seat>
  onSave: (data: any) => Promise<void>
  onClose: () => void
}) {
  const [form, setForm] = useState({
    seat_label: initial?.seat_label || '',
    row_number: String(initial?.row_number ?? ''),
    column_number: String(initial?.column_number ?? ''),
    seat_type: initial?.seat_type || 'regular',
  })
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrors({})
    try {
      await onSave({
        floor_id: floorId,
        seat_label: form.seat_label,
        row_number: parseInt(form.row_number, 10),
        column_number: parseInt(form.column_number, 10),
        seat_type: form.seat_type,
      })
      onClose()
    } catch (err) {
      setErrors(getFieldErrors(err) || { _: getErrorMessage(err) })
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {errors._ && <Alert variant="error" message={errors._} />}
      <Input label="Seat Label" placeholder="e.g. A01" value={form.seat_label} onChange={(e) => setForm(f => ({ ...f, seat_label: e.target.value }))} error={errors.seat_label} required />
      <div className="grid grid-cols-2 gap-3">
        <Input label="Row" type="number" min="1" value={form.row_number} onChange={(e) => setForm(f => ({ ...f, row_number: e.target.value }))} error={errors.row_number} required />
        <Input label="Column" type="number" min="1" value={form.column_number} onChange={(e) => setForm(f => ({ ...f, column_number: e.target.value }))} error={errors.column_number} required />
      </div>
      <Select label="Seat Type" options={SEAT_TYPES} value={form.seat_type} onChange={(e) => setForm(f => ({ ...f, seat_type: e.target.value }))} />
      <div className="flex gap-3 justify-end">
        <Button variant="secondary" onClick={onClose} type="button">Cancel</Button>
        <Button variant="primary" type="submit" loading={loading}>{initial ? 'Update Seat' : 'Add Seat'}</Button>
      </div>
    </form>
  )
}

export function AdminFloorsPage() {
  const [floors, setFloors] = useState<Floor[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [expandedFloor, setExpandedFloor] = useState<string | null>(null)
  const [floorSeats, setFloorSeats] = useState<Record<string, Seat[]>>({})
  const [seatsLoading, setSeatsLoading] = useState<string | null>(null)

  // Floor modals
  const [floorModal, setFloorModal] = useState<{ open: boolean; floor: Floor | null }>({ open: false, floor: null })
  const [deleteFloorModal, setDeleteFloorModal] = useState<{ open: boolean; floor: Floor | null }>({ open: false, floor: null })
  const [deleteFloorLoading, setDeleteFloorLoading] = useState(false)

  // Seat modals
  const [seatModal, setSeatModal] = useState<{ open: boolean; seat: Seat | null; floorId: string }>({ open: false, seat: null, floorId: '' })
  const [deleteSeatModal, setDeleteSeatModal] = useState<{ open: boolean; seat: Seat | null }>({ open: false, seat: null })
  const [deleteSeatLoading, setDeleteSeatLoading] = useState(false)

  const [success, setSuccess] = useState('')

  const loadFloors = useCallback(async () => {
    try {
      const fs = await floorsService.list(true)
      setFloors(fs)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadFloors() }, [loadFloors])

  const loadSeats = async (floorId: string) => {
    setSeatsLoading(floorId)
    try {
      const seats = await seatsService.listByFloor(floorId, true)
      setFloorSeats(prev => ({ ...prev, [floorId]: seats }))
    } finally {
      setSeatsLoading(null)
    }
  }

  const toggleFloor = (floorId: string) => {
    if (expandedFloor === floorId) {
      setExpandedFloor(null)
    } else {
      setExpandedFloor(floorId)
      if (!floorSeats[floorId]) {
        loadSeats(floorId)
      }
    }
  }

  const handleSaveFloor = async (data: Partial<Floor>) => {
    if (floorModal.floor) {
      await floorsService.update(floorModal.floor.id, data)
      setSuccess('Floor updated.')
    } else {
      await floorsService.create(data as any)
      setSuccess('Floor created.')
    }
    loadFloors()
  }

  const handleDeleteFloor = async () => {
    if (!deleteFloorModal.floor) return
    setDeleteFloorLoading(true)
    try {
      await floorsService.delete(deleteFloorModal.floor.id)
      setSuccess('Floor deleted.')
      setDeleteFloorModal({ open: false, floor: null })
      loadFloors()
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setDeleteFloorLoading(false)
    }
  }

  const handleSaveSeat = async (data: any) => {
    if (seatModal.seat) {
      await seatsService.update(seatModal.seat.id, data)
      setSuccess('Seat updated.')
    } else {
      await seatsService.create(data)
      setSuccess('Seat created.')
    }
    loadSeats(seatModal.floorId)
  }

  const handleToggleSeat = async (seat: Seat) => {
    await seatsService.updateStatus(seat.id, !seat.is_active)
    loadSeats(seat.floor_id)
  }

  const handleDeleteSeat = async () => {
    if (!deleteSeatModal.seat) return
    setDeleteSeatLoading(true)
    try {
      await seatsService.delete(deleteSeatModal.seat.id)
      setSuccess('Seat deleted.')
      setDeleteSeatModal({ open: false, seat: null })
      loadSeats(deleteSeatModal.seat.floor_id)
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setDeleteSeatLoading(false)
    }
  }

  if (loading) return <PageLoader />

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="page-title">Floors & Seats</h1>
          <p className="page-subtitle">{floors.length} floor{floors.length !== 1 ? 's' : ''}</p>
        </div>
        <Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={() => setFloorModal({ open: true, floor: null })}>
          Add Floor
        </Button>
      </div>

      {success && <Alert variant="success" message={success} onDismiss={() => setSuccess('')} className="mb-5" />}
      {error && <Alert variant="error" message={error} onDismiss={() => setError('')} className="mb-5" />}

      {floors.length === 0 ? (
        <div className="card text-center py-16">
          <Layers className="h-12 w-12 text-navy-200 mx-auto mb-4" />
          <h3 className="text-base font-semibold text-navy-700 mb-1">No floors yet</h3>
          <p className="text-sm text-navy-500 mb-4">Create your first library floor to get started.</p>
          <Button variant="primary" size="sm" onClick={() => setFloorModal({ open: true, floor: null })}>
            <Plus className="h-4 w-4" /> Add Floor
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {floors.map((floor) => (
            <div key={floor.id} className="card overflow-hidden p-0">
              {/* Floor header */}
              <div className="flex items-center gap-4 p-5">
                <button
                  onClick={() => toggleFloor(floor.id)}
                  className="flex items-center gap-3 flex-1 min-w-0 text-left"
                  aria-expanded={expandedFloor === floor.id}
                >
                  {expandedFloor === floor.id ? (
                    <ChevronDown className="h-4 w-4 text-navy-400 flex-shrink-0" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-navy-400 flex-shrink-0" />
                  )}
                  <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-navy-100 text-navy-700 font-bold text-sm flex-shrink-0">
                    {floor.floor_number}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-navy-900 truncate">{floor.name}</p>
                    <p className="text-xs text-navy-500">{floor.active_seat_count ?? 0} active seats</p>
                  </div>
                </button>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Badge variant={floor.is_active ? 'green' : 'gray'}>{floor.is_active ? 'Active' : 'Inactive'}</Badge>
                  <button onClick={() => setFloorModal({ open: true, floor })} className="btn-ghost btn-sm" title="Edit floor">
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => setDeleteFloorModal({ open: true, floor })} className="btn-ghost btn-sm text-red-500 hover:bg-red-50" title="Delete floor">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Seats panel */}
              {expandedFloor === floor.id && (
                <div className="border-t border-navy-100 p-5">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-sm font-semibold text-navy-700">Seats</p>
                    <Button variant="secondary" size="sm" icon={<Plus className="h-3.5 w-3.5" />} onClick={() => setSeatModal({ open: true, seat: null, floorId: floor.id })}>
                      Add Seat
                    </Button>
                  </div>

                  {seatsLoading === floor.id ? (
                    <p className="text-sm text-navy-500">Loading seats...</p>
                  ) : !floorSeats[floor.id] || floorSeats[floor.id].length === 0 ? (
                    <p className="text-sm text-navy-400">No seats on this floor yet.</p>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                      {floorSeats[floor.id].map((seat) => (
                        <div
                          key={seat.id}
                          className={`relative rounded-xl border-2 p-2 text-center group ${
                            seat.is_active
                              ? 'bg-navy-50 border-navy-200'
                              : 'bg-navy-50/50 border-navy-100 opacity-60'
                          }`}
                        >
                          <p className="text-xs font-bold text-navy-800">{seat.seat_label}</p>
                          <p className="text-[10px] text-navy-500 capitalize">{seat.seat_type}</p>
                          <div className="absolute -top-2 -right-2 hidden group-hover:flex items-center gap-1 bg-white rounded-lg shadow-card border border-navy-100 p-0.5">
                            <button onClick={() => setSeatModal({ open: true, seat, floorId: floor.id })} className="p-1 text-navy-500 hover:text-navy-900 rounded" title="Edit">
                              <Pencil className="h-2.5 w-2.5" />
                            </button>
                            <button onClick={() => handleToggleSeat(seat)} className="p-1 text-navy-500 hover:text-amber-600 rounded" title={seat.is_active ? 'Deactivate' : 'Activate'}>
                              {seat.is_active ? <ToggleRight className="h-2.5 w-2.5" /> : <ToggleLeft className="h-2.5 w-2.5" />}
                            </button>
                            <button onClick={() => setDeleteSeatModal({ open: true, seat })} className="p-1 text-navy-500 hover:text-red-600 rounded" title="Delete">
                              <Trash2 className="h-2.5 w-2.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Floor modal */}
      <Modal open={floorModal.open} onClose={() => setFloorModal({ open: false, floor: null })} title={floorModal.floor ? 'Edit Floor' : 'Add Floor'}>
        <FloorForm initial={floorModal.floor || undefined} onSave={handleSaveFloor} onClose={() => setFloorModal({ open: false, floor: null })} />
      </Modal>

      {/* Delete floor */}
      <ConfirmModal
        open={deleteFloorModal.open}
        onClose={() => setDeleteFloorModal({ open: false, floor: null })}
        onConfirm={handleDeleteFloor}
        title="Delete Floor"
        message={`Delete "${deleteFloorModal.floor?.name}"? This will also delete all seats on this floor. Active bookings will prevent deletion.`}
        confirmLabel="Delete Floor"
        variant="danger"
        loading={deleteFloorLoading}
      />

      {/* Seat modal */}
      <Modal open={seatModal.open} onClose={() => setSeatModal({ open: false, seat: null, floorId: '' })} title={seatModal.seat ? 'Edit Seat' : 'Add Seat'}>
        <SeatForm floorId={seatModal.floorId} initial={seatModal.seat || undefined} onSave={handleSaveSeat} onClose={() => setSeatModal({ open: false, seat: null, floorId: '' })} />
      </Modal>

      {/* Delete seat */}
      <ConfirmModal
        open={deleteSeatModal.open}
        onClose={() => setDeleteSeatModal({ open: false, seat: null })}
        onConfirm={handleDeleteSeat}
        title="Delete Seat"
        message={`Delete seat "${deleteSeatModal.seat?.seat_label}"? Active bookings will prevent deletion.`}
        confirmLabel="Delete Seat"
        variant="danger"
        loading={deleteSeatLoading}
      />
    </div>
  )
}
