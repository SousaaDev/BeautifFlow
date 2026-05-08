import api from './client'
import type { Plan, CheckoutResponse } from '../types'

interface VerifyResponse {
  success: boolean
  plan: string | null
}

export const billingApi = {
  getPlans: () =>
    api.get<Plan[]>('/api/billing/plans'),

  createCheckout: (planId: string, successUrl: string, cancelUrl: string) =>
    api.post<CheckoutResponse>('/api/billing/checkout', { planId, successUrl, cancelUrl }),

  verifyPayment: (sessionId: string) =>
    api.get<VerifyResponse>(`/api/billing/verify?sessionId=${sessionId}`),

  getPortalUrl: () =>
    api.post<{ url: string }>('/api/billing/portal', {}),
}

export default billingApi
