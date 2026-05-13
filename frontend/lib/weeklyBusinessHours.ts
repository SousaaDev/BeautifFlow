export const WEEKDAY_KEYS = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
] as const

export type WeekdayKey = (typeof WEEKDAY_KEYS)[number]

export const WEEKDAY_LABELS_PT: Record<WeekdayKey, string> = {
  monday: 'Segunda-feira',
  tuesday: 'Terça-feira',
  wednesday: 'Quarta-feira',
  thursday: 'Quinta-feira',
  friday: 'Sexta-feira',
  saturday: 'Sábado',
  sunday: 'Domingo',
}

export type DayScheduleUi = { closed: boolean; open: string; close: string }

export function defaultWeeklySchedule(): Record<WeekdayKey, DayScheduleUi> {
  const out = {} as Record<WeekdayKey, DayScheduleUi>
  for (const k of WEEKDAY_KEYS) {
    if (k === 'sunday') {
      out[k] = { closed: true, open: '08:00', close: '18:00' }
    } else {
      out[k] = { closed: false, open: '08:00', close: '18:00' }
    }
  }
  return out
}

function toHHMM(t: string): string {
  const m = String(t).trim().match(/^(\d{1,2}):(\d{2})/)
  if (!m) return '08:00'
  const h = Math.min(23, Math.max(0, parseInt(m[1], 10)))
  const min = Math.min(59, Math.max(0, parseInt(m[2], 10)))
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`
}

export function parseTenantDayToUi(raw: unknown): DayScheduleUi {
  if (raw == null || raw === '') {
    return { closed: true, open: '08:00', close: '18:00' }
  }
  if (typeof raw === 'object' && raw !== null && !Array.isArray(raw)) {
    const o = raw as Record<string, unknown>
    if (o.closed === true || String(o.closed).toLowerCase() === 'true') {
      return { closed: true, open: '08:00', close: '18:00' }
    }
    const s = String(o.start ?? o.open ?? '').trim()
    const e = String(o.end ?? o.close ?? '').trim()
    if (s && e) {
      return { closed: false, open: toHHMM(s), close: toHHMM(e) }
    }
    return { closed: true, open: '08:00', close: '18:00' }
  }
  const str = String(raw).trim()
  if (!str) {
    return { closed: true, open: '08:00', close: '18:00' }
  }
  const low = str.toLowerCase()
  if (low === 'fechado' || low === 'closed') {
    return { closed: true, open: '08:00', close: '18:00' }
  }
  const parts = str.split(/[-–—]/).map((x) => x.trim())
  if (parts.length >= 2 && parts[0] && parts[1]) {
    return { closed: false, open: toHHMM(parts[0]), close: toHHMM(parts[1]) }
  }
  return { closed: true, open: '08:00', close: '18:00' }
}

/** Mescla o que veio da API com padrão útil (seg–sáb 08–18, dom fechado) quando estiver vazio. */
export function scheduleFromTenant(
  tenantHours: Record<string, string> | undefined
): Record<WeekdayKey, DayScheduleUi> {
  const base = defaultWeeklySchedule()
  if (!tenantHours || Object.keys(tenantHours).length === 0) {
    return base
  }
  for (const key of WEEKDAY_KEYS) {
    if (tenantHours[key] !== undefined && tenantHours[key] !== null) {
      base[key] = parseTenantDayToUi(tenantHours[key])
    }
  }
  return base
}

export function uiScheduleToBusinessHours(
  schedule: Record<WeekdayKey, DayScheduleUi>
): Record<string, string> {
  const out: Record<string, string> = {}
  for (const key of WEEKDAY_KEYS) {
    const d = schedule[key]
    if (d.closed) {
      out[key] = ''
    } else if (d.open && d.close) {
      out[key] = `${d.open}-${d.close}`
    } else {
      out[key] = ''
    }
  }
  return out
}

export function validateWeeklySchedule(schedule: Record<WeekdayKey, DayScheduleUi>): string | null {
  for (const key of WEEKDAY_KEYS) {
    const d = schedule[key]
    if (d.closed) continue
    if (!d.open || !d.close) {
      return `Preencha abertura e fechamento em ${WEEKDAY_LABELS_PT[key]} ou marque como fechado.`
    }
    const [oh, om] = d.open.split(':').map((n) => parseInt(n, 10))
    const [ch, cm] = d.close.split(':').map((n) => parseInt(n, 10))
    if (Number.isNaN(oh) || Number.isNaN(om) || Number.isNaN(ch) || Number.isNaN(cm)) {
      return `Horário inválido em ${WEEKDAY_LABELS_PT[key]}. Use o formato HH:MM.`
    }
    const openM = oh * 60 + om
    const closeM = ch * 60 + cm
    if (openM >= closeM) {
      return `Em ${WEEKDAY_LABELS_PT[key]}, o fechamento precisa ser depois da abertura.`
    }
  }
  return null
}
