import api from './client'
import type { Tenant } from '../types'

export const tenantApi = {
  update: (tenantId: string, data: Partial<Pick<Tenant, 'name' | 'slug'>>) =>
    api.put<Tenant>(`/api/tenants/${tenantId}`, data),
}

export default tenantApi
