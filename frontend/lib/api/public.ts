import api from './client'
import type { Professional, Service, Tenant } from '../types'

interface PublicSalonData {
  tenant: Pick<Tenant, 'id' | 'name' | 'slug'>
  professionals: Professional[]
  services: Service[]
}

export const publicApi = {
  getSalonData: (slug: string) =>
    api.get<PublicSalonData>(`/api/public/${slug}`, { skipAuth: true }),
}

export default publicApi
