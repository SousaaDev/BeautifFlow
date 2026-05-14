/**
 * Agenda pública: alinhar "dia" e horários de parede com o navegador do cliente.
 * `tzOffsetMinutes` = valor de Date.getTimezoneOffset() (minutos: UTC − horário local).
 */

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_RE = /^(\d{1,2}):(\d{2})$/;

export function utcInstantFromLocalWallClock(
  dateStr: string,
  timeStr: string,
  tzOffsetMinutes: number
): Date | null {
  const dm = dateStr.match(DATE_RE);
  const tm = timeStr.match(TIME_RE);
  if (!dm || !tm) return null;
  const y = Number(dm[1]);
  const mo = Number(dm[2]);
  const d = Number(dm[3]);
  const h = Number(tm[1]);
  const mi = Number(tm[2]);
  if ([y, mo, d, h, mi].some((n) => Number.isNaN(n))) return null;
  const ms = Date.UTC(y, mo - 1, d, h, mi, 0, 0) + tzOffsetMinutes * 60 * 1000;
  return new Date(ms);
}

export function localDayBoundsUtc(dateStr: string, tzOffsetMinutes: number): { dayStart: Date; dayEnd: Date } | null {
  const dayStart = utcInstantFromLocalWallClock(dateStr, '00:00', tzOffsetMinutes);
  if (!dayStart) return null;
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
  return { dayStart, dayEnd };
}

/** "HH:mm" visível no fuso do cliente para um instante UTC. */
export function formatLocalSlotLabel(utcDate: Date, tzOffsetMinutes: number): string {
  const shifted = new Date(utcDate.getTime() - tzOffsetMinutes * 60 * 1000);
  const hours = String(shifted.getUTCHours()).padStart(2, '0');
  const minutes = String(shifted.getUTCMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

/** yyyy-MM-dd do "agora" no mesmo fuso do cliente. */
export function localYmdFromInstant(now: Date, tzOffsetMinutes: number): string {
  const shifted = new Date(now.getTime() - tzOffsetMinutes * 60 * 1000);
  const y = shifted.getUTCFullYear();
  const m = String(shifted.getUTCMonth() + 1).padStart(2, '0');
  const d = String(shifted.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
