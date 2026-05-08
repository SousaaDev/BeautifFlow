import api from './client'
import type { Professional, ProfessionalFormData } from '../types'

export const professionalsApi = {
  list: (tenantId: string) =>
    api.get<Professional[]>(`/api/tenants/${tenantId}/professionals`),

  get: (tenantId: string, id: string) =>
    api.get<Professional>(`/api/tenants/${tenantId}/professionals/${id}`),

  create: (tenantId: string, data: ProfessionalFormData) =>
    api.post<Professional>(`/api/tenants/${tenantId}/professionals`, data),

  update: (tenantId: string, id: string, data: Partial<ProfessionalFormData>) =>
    api.put<Professional>(`/api/tenants/${tenantId}/professionals/${id}`, data),

  delete: (tenantId: string, id: string) =>
    api.delete(`/api/tenants/${tenantId}/professionals/${id}`),
}

export default professionalsApi
