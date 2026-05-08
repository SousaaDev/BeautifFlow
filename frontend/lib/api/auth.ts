import api from './client'
import type { AuthResponse, User } from '../types'

interface RegisterData {
  email: string
  password: string
  name: string
  salonName: string
}

interface LoginData {
  email: string
  password: string
}

export const authApi = {
  register: (data: RegisterData) =>
    api.post<AuthResponse>('/api/auth/register', data, { skipAuth: true }),

  login: (data: LoginData) =>
    api.post<AuthResponse>('/api/auth/login', data, { skipAuth: true }),

  me: () =>
    api.get<User>('/api/auth/me'),

  updateProfile: (data: Partial<{ name: string; email: string }>) =>
    api.put<User>('/api/auth/me', data),

  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    api.post<{ message: string }>('/api/auth/change-password', data),

  logout: () =>
    api.post('/api/auth/logout'),
}

export default authApi
