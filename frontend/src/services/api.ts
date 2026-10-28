/**
 * Centralized Axios API client for LibraSpace.
 * All backend calls go through this module.
 */
import axios, { AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from 'axios'

// The API base URL is configurable via environment variable.
// In development, Vite's proxy forwards /api → http://localhost:5000/api
// In production, set VITE_API_BASE_URL to the ALB URL.
const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

const apiClient: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// ── Request interceptor — attach JWT token ──────────────────
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('access_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// ── Response interceptor — handle 401s ─────────────────────
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Clear stale credentials and redirect to login
      const code = (error.response.data as { code?: string })?.code
      if (code === 'TOKEN_EXPIRED' || code === 'TOKEN_REVOKED') {
        localStorage.removeItem('access_token')
        localStorage.removeItem('refresh_token')
        localStorage.removeItem('user')
        // Avoid redirect loops on the login page itself
        if (!window.location.pathname.startsWith('/login')) {
          window.location.href = '/login'
        }
      }
    }
    return Promise.reject(error)
  }
)

export default apiClient

/**
 * Extract a user-friendly error message from an Axios error.
 */
export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data
    if (data?.message) return data.message
    if (error.message) return error.message
  }
  if (error instanceof Error) return error.message
  return 'An unexpected error occurred'
}

/**
 * Extract field-level validation errors from an Axios error response.
 */
export function getFieldErrors(error: unknown): Record<string, string> {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.errors || {}
  }
  return {}
}
