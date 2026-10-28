import apiClient from './api'
import type { Seat, ApiResponse } from '../types'

export const seatsService = {
  async listByFloor(floorId: string, includeInactive = false): Promise<Seat[]> {
    const res = await apiClient.get<ApiResponse<Seat[]>>(`/floors/${floorId}/seats`, {
      params: includeInactive ? { include_inactive: 'true' } : undefined,
    })
    return res.data.data!
  },

  async get(id: string): Promise<Seat> {
    const res = await apiClient.get<ApiResponse<Seat>>(`/seats/${id}`)
    return res.data.data!
  },

  async create(data: {
    floor_id: string
    seat_label: string
    row_number: number
    column_number: number
    seat_type: string
  }): Promise<Seat> {
    const res = await apiClient.post<ApiResponse<Seat>>('/seats', data)
    return res.data.data!
  },

  async update(id: string, data: Partial<Seat>): Promise<Seat> {
    const res = await apiClient.put<ApiResponse<Seat>>(`/seats/${id}`, data)
    return res.data.data!
  },

  async updateStatus(id: string, isActive: boolean): Promise<Seat> {
    const res = await apiClient.patch<ApiResponse<Seat>>(`/seats/${id}/status`, {
      is_active: isActive,
    })
    return res.data.data!
  },

  async delete(id: string): Promise<void> {
    await apiClient.delete(`/seats/${id}`)
  },
}
