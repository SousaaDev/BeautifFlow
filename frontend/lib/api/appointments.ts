import api from './client'
import type { Appointment, AppointmentFormData, AppointmentStatus } from '../types'

interface AppointmentFilters {
  customerId?: string
  professionalId?: string
  startDate?: string
  endDate?: string
  status?: AppointmentStatus
}

const normalizeStatus = (status: string | undefined) => {
  if (!status) return status
  return status.toUpperCase().replace(/ /g, '_') as AppointmentStatus
}

const normalizeAppointment = (appointment: Appointment): Appointment => ({
  ...appointment,
  status: normalizeStatus(appointment.status) as Appointment['status'],
})

export const appointmentsApi = {
  list: async (tenantId: string, filters?: AppointmentFilters) => {
    const params = new URLSearchParams()
    if (filters?.customerId) params.append('customerId', filters.customerId)
    if (filters?.professionalId) params.append('professionalId', filters.professionalId)
    if (filters?.startDate) params.append('startDate', filters.startDate)
    if (filters?.endDate) params.append('endDate', filters.endDate)
    if (filters?.status) params.append('status', filters.status)
    
    const query = params.toString()
    const response = await api.get<Appointment[]>(`/api/tenants/${tenantId}/appointments${query ? `?${query}` : ''}`)
    return response.map(normalizeAppointment)
  },

  get: async (tenantId: string, id: string) => {
    const response = await api.get<Appointment>(`/api/tenants/${tenantId}/appointments/${id}`)
    return normalizeAppointment(response)
  },

  create: async (tenantId: string, data: AppointmentFormData) => {
    const response = await api.post<Appointment>(`/api/tenants/${tenantId}/appointments`, data)
    return normalizeAppointment(response)
  },

  update: async (
    tenantId: string,
    id: string,
    data: Partial<AppointmentFormData & { status: AppointmentStatus }>
  ) => {
    const payload = {
      ...data,
      status: data.status ? data.status.toLowerCase() : undefined,
    }
    const response = await api.put<Appointment>(`/api/tenants/${tenantId}/appointments/${id}`, payload)
    return normalizeAppointment(response)
  },

  delete: (tenantId: string, id: string) =>
    api.delete(`/api/tenants/${tenantId}/appointments/${id}`),

  // Public endpoint for customer booking
  getAvailableSlots: (slug: string, serviceId: string, professionalId: string, date: string) =>
    api.get<string[]>(`/api/public/${slug}/available-slots?serviceId=${serviceId}&professionalId=${professionalId}&date=${date}`, { skipAuth: true }),

  createPublic: (slug: string, data: AppointmentFormData & { customerName: string; customerEmail: string; customerPhone?: string }) =>
    api.post<Appointment>(`/api/public/${slug}/appointments`, data, { skipAuth: true }),
}

export default appointmentsApi
