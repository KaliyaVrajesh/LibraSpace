import apiClient from './api'
import type { ApiResponse, StudentDashboardData, AdminDashboardData } from '../types'

export const dashboardService = {
  async getStudentDashboard(): Promise<StudentDashboardData> {
    const res = await apiClient.get<ApiResponse<StudentDashboardData>>('/dashboard/student')
    return res.data.data!
  },

  async getAdminDashboard(): Promise<AdminDashboardData> {
    const res = await apiClient.get<ApiResponse<AdminDashboardData>>('/dashboard/admin')
    return res.data.data!
  },
}
