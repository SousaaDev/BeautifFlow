import api from './client'
import type { Sale, SaleFormData } from '../types'

interface SaleFilters {
  customerId?: string
  startDate?: string
  endDate?: string
}

export const salesApi = {
  list: (tenantId: string, filters?: SaleFilters) => {
    const params = new URLSearchParams()
    if (filters?.customerId) params.append('customerId', filters.customerId)
    if (filters?.startDate) params.append('startDate', filters.startDate)
    if (filters?.endDate) params.append('endDate', filters.endDate)
    
    const query = params.toString()
    return api.get<Sale[]>(`/api/tenants/${tenantId}/sales${query ? `?${query}` : ''}`)
  },

  get: (tenantId: string, id: string) =>
    api.get<Sale>(`/api/tenants/${tenantId}/sales/${id}`),

  create: (tenantId: string, data: SaleFormData) =>
    api.post<Sale>(`/api/tenants/${tenantId}/sales`, data),
}

export default salesApi
