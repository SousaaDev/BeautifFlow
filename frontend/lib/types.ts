// BeautyFlow Types

export type TenantStatus = 'TRIALING' | 'ACTIVE' | 'PAST_DUE' | 'CANCELED'

export interface Tenant {
  id: string
  name: string
  slug: string
  status: TenantStatus
  trialEndsAt: string | null
  currentPlan: string | null
  stripeCustomerId: string | null
  createdAt: string
  updatedAt: string
}

export interface User {
  id: string
  email: string
  name: string
  tenantId: string
  tenant: Tenant
  createdAt: string
}

export interface AuthResponse {
  token: string
  user: User
}

export interface Professional {
  id: string
  tenantId: string
  name: string
  email: string
  phone: string | null
  avatarUrl: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface Customer {
  id: string
  tenantId: string
  name: string
  email: string
  phone: string | null
  birthDate: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
}

export interface Service {
  id: string
  tenantId: string
  name: string
  description: string | null
  aprice: number
  duration: number // in minutes
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface Product {
  id: string
  tenantId: string
  name: string
  description?: string | null
  salePrice: number
  costPrice?: number | null
  currentStock: number
  minThreshold: number
  isActive: boolean
  createdAt: string
  updatedAt?: string
}

export type AppointmentStatus = 'SCHEDULED' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELED' | 'NO_SHOW'

export interface Appointment {
  id: string
  tenantId: string
  customerId: string
  professionalId: string
  serviceId: string
  startTime: string
  endTime: string
  status: AppointmentStatus
  notes: string | null
  customer?: Customer
  professional?: Professional
  service?: Service
  createdAt: string
  updatedAt: string
}

export type PaymentMethod = 'CASH' | 'CREDIT_CARD' | 'DEBIT_CARD' | 'PIX' | 'OTHER'
export type PaymentStatus = 'PENDING' | 'PAID' | 'REFUNDED' | 'CANCELED'

export interface SaleItem {
  id: string
  saleId: string
  productId: string | null
  serviceId: string | null
  quantity: number
  unitPrice: number
  totalPrice: number
  product?: Product
  service?: Service
}

export interface Sale {
  id: string
  tenantId: string
  customerId: string | null
  professionalId: string | null
  appointmentId: string | null
  totalAmount: number
  discount: number
  finalAmount: number
  paymentMethod: PaymentMethod
  paymentStatus: PaymentStatus
  notes: string | null
  items: SaleItem[]
  customer?: Customer
  professional?: Professional
  createdAt: string
  updatedAt: string
}

export interface Plan {
  id: string
  name: string
  price: number
  interval: 'month' | 'year'
  features: string[]
  stripePriceId: string
}

export interface CheckoutResponse {
  checkoutUrl?: string
  planUpdated?: boolean
  message?: string
}

// Form Types
export interface ProfessionalFormData {
  name: string
  email: string
  phone?: string
  isActive: boolean
}

export interface CustomerFormData {
  name: string
  email: string
  phone?: string
  birthDate?: string
  notes?: string
}

export interface ServiceFormData {
  name: string
  description?: string
  price: number
  duration: number
  isActive: boolean
}

export interface ProductFormData {
  name: string
  description?: string
  price: number
  costPrice?: number
  stock: number
  minStock: number
  sku?: string
  isActive: boolean
}

export interface AppointmentFormData {
  customerId: string
  professionalId: string
  serviceId: string
  startTime: string
  notes?: string
}

export interface SaleItemFormData {
  productId?: string
  serviceId?: string
  quantity: number
  unitPrice: number
}

export interface SaleFormData {
  customerId?: string
  professionalId?: string
  appointmentId?: string
  items: SaleItemFormData[]
  discount: number
  paymentMethod: PaymentMethod
  notes?: string
}

// API Response Types
export interface ApiError {
  error: string
  message: string
  redirect?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
}
