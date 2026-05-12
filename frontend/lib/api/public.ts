import api from './client'
import type { Professional, Service, Tenant } from '../types'

interface PublicSalonData {
  tenant: Pick<Tenant, 'id' | 'name' | 'slug'>
  professionals: Professional[]
  services: Service[]
}

interface PublicCustomerAuthResponse {
  token: string
  customer: {
    id: string
    name: string
    email: string
    phone?: string | null
  }
}

export const publicApi = {
  getSalonData: (slug: string) =>
    api.get<PublicSalonData>(`/api/public/${slug}`, { skipAuth: true }),

  registerCustomer: (data: {
    slug: string
    name: string
    email: string
    phone?: string
    password: string
    confirmPassword: string
  }) => api.post<PublicCustomerAuthResponse>(`/api/public/customers/register`, data, { skipAuth: true }),

  loginCustomer: (data: { slug: string; email: string; password: string }) =>
    api.post<PublicCustomerAuthResponse>(`/api/public/customers/login`, data, { skipAuth: true }),
}

export default publicApi
