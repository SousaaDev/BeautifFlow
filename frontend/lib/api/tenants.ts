import api from './client'
import type { Tenant } from '../types'

export const tenantApi = {
  update: (
    tenantId: string,
    data: Partial<Pick<Tenant, 'name' | 'slug' | 'businessHours' | 'bufferMinutes'>> & {
      business_hours?: Record<string, string>
      buffer_minutes?: number
      settings?: Record<string, any>
    }
  ) => api.put<Tenant>(`/api/tenants/${tenantId}`, data),
}

export default tenantApi
