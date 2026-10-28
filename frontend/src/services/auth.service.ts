import apiClient from './api'
import type {
  AuthTokens,
  LoginCredentials,
  RegisterData,
  User,
  ApiResponse,
} from '../types'

export const authService = {
  async register(data: RegisterData): Promise<AuthTokens> {
    const res = await apiClient.post<ApiResponse<AuthTokens>>('/auth/register', data)
    return res.data.data!
  },

  async login(credentials: LoginCredentials): Promise<AuthTokens> {
    const res = await apiClient.post<ApiResponse<AuthTokens>>('/auth/login', credentials)
    return res.data.data!
  },

  async logout(): Promise<void> {
    await apiClient.post('/auth/logout')
  },

  async getMe(): Promise<User> {
    const res = await apiClient.get<ApiResponse<User>>('/auth/me')
    return res.data.data!
  },

  async updateProfile(data: {
    full_name?: string
    current_password?: string
    new_password?: string
  }): Promise<User> {
    const res = await apiClient.put<ApiResponse<User>>('/auth/me', data)
    return res.data.data!
  },
}
