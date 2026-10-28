import apiClient from './api'
import type { Floor, ApiResponse } from '../types'

export const floorsService = {
  async list(includeInactive = false): Promise<Floor[]> {
    const res = await apiClient.get<ApiResponse<Floor[]>>('/floors', {
      params: includeInactive ? { include_inactive: 'true' } : undefined,
    })
    return res.data.data!
  },

  async get(id: string): Promise<Floor> {
    const res = await apiClient.get<ApiResponse<Floor>>(`/floors/${id}`)
    return res.data.data!
  },

  async create(data: Omit<Floor, 'id' | 'created_at' | 'updated_at' | 'active_seat_count'>): Promise<Floor> {
    const res = await apiClient.post<ApiResponse<Floor>>('/floors', data)
    return res.data.data!
  },

  async update(id: string, data: Partial<Floor>): Promise<Floor> {
    const res = await apiClient.put<ApiResponse<Floor>>(`/floors/${id}`, data)
    return res.data.data!
  },

  async delete(id: string): Promise<void> {
    await apiClient.delete(`/floors/${id}`)
  },
}
