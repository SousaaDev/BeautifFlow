import api from './client'
import type { Service, ServiceFormData } from '../types'

const normalizeService = (service: any): Service => ({
  id: service.id,
  tenantId: service.tenantId,
  name: service.name,
  description: service.description ?? null,
  price: typeof service.price === 'number' ? service.price : Number(service.price),
  duration: typeof service.duration === 'number'
    ? service.duration
    : Number(service.duration ?? service.durationMinutes),
  isActive: service.isActive === true || service.isActive === 'true',
  createdAt: service.createdAt,
  updatedAt: service.updatedAt,
})

export const servicesApi = {
  list: (tenantId: string) =>
    api.get<Service[]>(`/api/tenants/${tenantId}/services`).then((services) =>
      services.map(normalizeService)
    ),

  get: (tenantId: string, id: string) =>
    api.get<Service>(`/api/tenants/${tenantId}/services/${id}`).then(normalizeService),

  create: (tenantId: string, data: ServiceFormData) =>
    api.post<Service>(`/api/tenants/${tenantId}/services`, data).then(normalizeService),

  update: (tenantId: string, id: string, data: Partial<ServiceFormData>) =>
    api.put<Service>(`/api/tenants/${tenantId}/services/${id}`, data).then(normalizeService),

  delete: (tenantId: string, id: string) =>
    api.delete(`/api/tenants/${tenantId}/services/${id}`),
}

export default servicesApi
