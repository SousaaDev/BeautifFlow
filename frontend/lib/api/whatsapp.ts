import { api } from './client'

export interface WhatsAppStatusResponse {
  status: 'starting' | 'qr' | 'connected' | 'disconnected' | 'error'
  message: string
  qrUrl?: string
  ready?: boolean
}

export const whatsappApi = {
  getStatus: () => api.get<WhatsAppStatusResponse>('/api/whatsapp/status'),
  getQr: () => api.get<WhatsAppStatusResponse>('/api/whatsapp/qr'),
  sendMessage: (number: string, text: string) => api.post<{ success: boolean }>('/api/whatsapp/send', { number, text }),
}
