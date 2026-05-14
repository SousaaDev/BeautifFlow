export type PublicBookingDraftV1 = {
  v: 1
  serviceId: string
  professionalId: string
  /** yyyy-MM-dd (calendário local ao salvar) */
  dateYmd: string
  time: string
  customerName: string
  customerEmail: string
  customerPhone?: string
}

const key = (slug: string) => `beautyflow_booking_draft_${slug}`

export function savePublicBookingDraft(slug: string, draft: PublicBookingDraftV1) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(key(slug), JSON.stringify(draft))
}

export function loadPublicBookingDraft(slug: string): PublicBookingDraftV1 | null {
  if (typeof window === 'undefined') return null
  const raw = window.localStorage.getItem(key(slug))
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as PublicBookingDraftV1
    if (parsed?.v !== 1 || !parsed.serviceId || !parsed.professionalId || !parsed.dateYmd || !parsed.time) {
      return null
    }
    return parsed
  } catch {
    return null
  }
}

export function clearPublicBookingDraft(slug: string) {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(key(slug))
}

export const publicCustomerChangedEvent = 'beautyflow_public_customer_changed'
