import api from './client'
import type { Product, ProductFormData } from '../types'

export const productsApi = {
  list: (tenantId: string) =>
    api.get<Product[]>(`/api/tenants/${tenantId}/products`),

  get: (tenantId: string, id: string) =>
    api.get<Product>(`/api/tenants/${tenantId}/products/${id}`),

  create: (tenantId: string, data: ProductFormData) =>
    api.post<Product>(`/api/tenants/${tenantId}/products`, data),

  update: (tenantId: string, id: string, data: Partial<ProductFormData>) =>
    api.put<Product>(`/api/tenants/${tenantId}/products/${id}`, data),

  delete: (tenantId: string, id: string) =>
    api.delete(`/api/tenants/${tenantId}/products/${id}`),
}

export default productsApi
