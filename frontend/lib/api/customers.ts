import api from './client'
import type { Customer, CustomerFormData } from '../types'

export const customersApi = {
  list: (tenantId: string) =>
    api.get<Customer[]>(`/api/customers?tenantId=${tenantId}`),

  get: (id: string) =>
    api.get<Customer>(`/api/customers/${id}`),

  create: (tenantId: string, data: CustomerFormData) =>
    api.post<Customer>(`/api/customers?tenantId=${tenantId}`, data),

  update: (id: string, data: Partial<CustomerFormData>) =>
    api.put<Customer>(`/api/customers/${id}`, data),

  delete: (id: string) =>
    api.delete(`/api/customers/${id}`),
}

export default customersApi
