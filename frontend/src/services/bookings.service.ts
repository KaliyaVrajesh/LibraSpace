import apiClient from './api'
import type {
  Booking,
  ApiResponse,
  PaginatedResponse,
  AvailabilityResponse,
} from '../types'

export interface CreateBookingData {
  seat_id: string
  booking_date: string
  start_time: string
  end_time: string
}

export interface BookingFilters {
  status?: string
  search?: string
  page?: number
  per_page?: number
}

export const bookingsService = {
  async list(filters: BookingFilters = {}): Promise<PaginatedResponse<Booking>> {
    const res = await apiClient.get<PaginatedResponse<Booking>>('/bookings', {
      params: filters,
    })
    return res.data
  },

  async adminList(filters: BookingFilters = {}): Promise<PaginatedResponse<Booking>> {
    const res = await apiClient.get<PaginatedResponse<Booking>>('/admin/bookings', {
      params: filters,
    })
    return res.data
  },

  async get(id: string): Promise<Booking> {
    const res = await apiClient.get<ApiResponse<Booking>>(`/bookings/${id}`)
    return res.data.data!
  },

  async create(data: CreateBookingData): Promise<Booking> {
    const res = await apiClient.post<ApiResponse<Booking>>('/bookings', data)
    return res.data.data!
  },

  async cancel(id: string): Promise<Booking> {
    const res = await apiClient.patch<ApiResponse<Booking>>(`/bookings/${id}/cancel`)
    return res.data.data!
  },

  async getAvailability(params: {
    floor_id: string
    date: string
    start_time: string
    end_time: string
  }): Promise<AvailabilityResponse> {
    const res = await apiClient.get<ApiResponse<AvailabilityResponse>>('/availability', {
      params,
    })
    return res.data.data!
  },
}
