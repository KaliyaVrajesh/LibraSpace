// ============================================================
// LibraSpace — Shared TypeScript Types
// ============================================================

export interface User {
  id: string
  full_name: string
  email: string
  role: 'student' | 'admin'
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Floor {
  id: string
  name: string
  floor_number: number
  description: string | null
  is_active: boolean
  active_seat_count?: number
  created_at: string
  updated_at: string
}

export type SeatType = 'regular' | 'window' | 'quiet' | 'computer' | 'group'
export type AvailabilityStatus = 'available' | 'occupied' | 'inactive' | 'selected'

export interface Seat {
  id: string
  floor_id: string
  seat_label: string
  row_number: number
  column_number: number
  seat_type: SeatType
  is_active: boolean
  floor?: {
    id: string
    name: string
    floor_number: number
  }
  created_at: string
  updated_at: string
}

export interface SeatWithAvailability extends Seat {
  availability_status: AvailabilityStatus
}

export type BookingStatus = 'confirmed' | 'cancelled' | 'completed'

export interface Booking {
  id: string
  booking_reference: string
  user_id: string
  seat_id: string
  booking_date: string
  start_time: string
  end_time: string
  status: BookingStatus
  stored_status: BookingStatus
  is_cancellable: boolean
  user?: {
    id: string
    full_name: string
    email: string
  }
  seat?: Seat & {
    floor?: {
      id: string
      name: string
      floor_number: number
    }
  }
  created_at: string
  updated_at: string
}

// ============================================================
// API Response Types
// ============================================================

export interface ApiResponse<T = unknown> {
  success: boolean
  message: string
  data?: T
  errors?: Record<string, string>
  code?: string
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  meta: {
    total: number
    page: number
    per_page: number
    total_pages: number
    has_next: boolean
    has_prev: boolean
  }
}

export interface AvailabilityResponse {
  seats: SeatWithAvailability[]
  summary: {
    total: number
    available: number
    occupied: number
  }
  query: {
    floor_id: string
    date: string
    start_time: string
    end_time: string
  }
}

export interface StudentDashboardData {
  user: User
  stats: {
    total_bookings: number
    completed_sessions: number
    upcoming_bookings: number
    cancelled_bookings: number
    total_active_seats: number
    total_floors: number
  }
  upcoming_bookings: Booking[]
  recent_bookings: Booking[]
}

export interface AdminDashboardData {
  stats: {
    total_students: number
    total_floors: number
    total_seats: number
    total_bookings: number
    active_bookings: number
    todays_bookings: number
    seat_utilization_percent: number
  }
  booking_trends: Array<{ date: string; bookings: number }>
  status_breakdown: Record<BookingStatus, number>
  floor_stats: Array<{ floor: string; bookings: number }>
  recent_bookings: Booking[]
}

// ============================================================
// Auth Types
// ============================================================

export interface AuthTokens {
  access_token: string
  refresh_token: string
  user: User
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterData {
  full_name: string
  email: string
  password: string
  confirm_password: string
}
