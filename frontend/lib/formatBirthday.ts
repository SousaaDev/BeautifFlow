/** Aceita YYYY-MM-DD ou prefixo ISO (YYYY-MM-DDTHH...) vindo da API. */
export function formatBirthdayDisplay(raw: string | null | undefined): string {
  if (!raw) return '-'
  const head = raw.trim().slice(0, 10)
  const m = head.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!m) return '-'
  return `${m[3]}/${m[2]}`
}
