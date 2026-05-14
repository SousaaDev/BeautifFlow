/** Exibe aniversário (dia/mês) a partir de data de nascimento YYYY-MM-DD, sem depender de fuso. */
export function formatBirthdayDisplay(ymd: string | null | undefined): string {
  if (!ymd) return '-'
  const m = ymd.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!m) return '-'
  return `${m[3]}/${m[2]}`
}
