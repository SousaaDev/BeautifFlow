import Cookies from 'js-cookie'

const rawApiBaseUrl = process.env.NEXT_PUBLIC_API_URL
const API_BASE_URL = rawApiBaseUrl
  ? rawApiBaseUrl.replace(/\/+$/, '')
  : 'http://localhost:3000'

export class ApiError extends Error {
  status: number
  redirect?: string

  constructor(message: string, status: number, redirect?: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.redirect = redirect
  }
}

interface RequestOptions extends RequestInit {
  skipAuth?: boolean
}

async function request<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { skipAuth = false, ...fetchOptions } = options
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...fetchOptions.headers,
  }

  if (!skipAuth) {
    const token = Cookies.get('beautyflow_token')
    if (token) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`
    }
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...fetchOptions,
    headers,
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    
    // Handle trial expired or subscription issues
    if (response.status === 403 && errorData.redirect) {
      if (typeof window !== 'undefined') {
        window.location.href = errorData.redirect
      }
      throw new ApiError(errorData.message || 'Access denied', response.status, errorData.redirect)
    }
    
    // Handle unauthorized (token expired)
    if (response.status === 401) {
      Cookies.remove('beautyflow_token')
      if (typeof window !== 'undefined') {
        window.location.href = '/auth/login'
      }
      throw new ApiError('Session expired', response.status)
    }

    // Format error message
    let errorMessage = 'An error occurred'
    if (errorData.message) {
      errorMessage = errorData.message
    } else if (errorData.error) {
      if (Array.isArray(errorData.error)) {
        // Handle Zod validation errors
        errorMessage = errorData.error
          .map((err: any) => err.message || String(err))
          .join(', ')
      } else if (typeof errorData.error === 'string') {
        errorMessage = errorData.error
      }
    }

    throw new ApiError(
      errorMessage,
      response.status
    )
  }

  // Handle empty responses
  const text = await response.text()
  if (!text) return {} as T
  
  return JSON.parse(text)
}

export const api = {
  get: <T>(endpoint: string, options?: RequestOptions) =>
    request<T>(endpoint, { ...options, method: 'GET' }),

  post: <T>(endpoint: string, data?: unknown, options?: RequestOptions) =>
    request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    }),

  put: <T>(endpoint: string, data?: unknown, options?: RequestOptions) =>
    request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    }),

  patch: <T>(endpoint: string, data?: unknown, options?: RequestOptions) =>
    request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    }),

  delete: <T>(endpoint: string, options?: RequestOptions) =>
    request<T>(endpoint, { ...options, method: 'DELETE' }),
}

export default api
