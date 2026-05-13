/**
 * Horário comercial do tenant (beauty_shops.business_hours) e resolução por data.
 */

export const parseWorkingHoursRange = (range: unknown): { start: string; end: string } | null => {
  if (range == null) return null;

  if (typeof range === 'string') {
    const normalized = range.trim().toLowerCase();
    if (!normalized || normalized === 'closed' || normalized === 'fechado') return null;
    const [start, end] = range.split(/[-–—]/).map((value) => value.trim());
    if (!start || !end) return null;
    return { start, end };
  }

  if (typeof range === 'object' && range !== null) {
    const maybeRange = range as { closed?: unknown; start?: string; end?: string; open?: string; close?: string };
    if (maybeRange.closed === true || String(maybeRange.closed).toLowerCase() === 'true') {
      return null;
    }
    const start = (maybeRange.start ?? maybeRange.open ?? '').toString().trim();
    const end = (maybeRange.end ?? maybeRange.close ?? '').toString().trim();
    if (start && end) {
      return { start, end };
    }
  }

  return null;
};

/** Converte JSONB / coluna TEXT que venha como string em objeto de horários. */
export const coerceBusinessHoursRecord = (raw: unknown): Record<string, unknown> | undefined => {
  if (raw == null || raw === '') return undefined;
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      return undefined;
    }
    return undefined;
  }
  if (typeof raw === 'object' && !Array.isArray(raw)) {
    return raw as Record<string, unknown>;
  }
  return undefined;
};

/** Unifica o que está no banco (string, objeto, legado) para `Record<dia, "HH:mm-HH:mm"|"">`. */
export const normalizeStoredBusinessHours = (raw: unknown): Record<string, string> => {
  const coerced = coerceBusinessHoursRecord(raw);
  if (!coerced) return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(coerced)) {
    const key = k.trim().toLowerCase();
    if (!key) continue;
    if (typeof v === 'string') {
      const t = v.trim();
      const low = t.toLowerCase();
      if (!t || low === 'fechado' || low === 'closed') out[key] = '';
      else out[key] = t;
      continue;
    }
    const parsed = parseWorkingHoursRange(v);
    if (parsed) out[key] = `${parsed.start}-${parsed.end}`;
    else out[key] = '';
  }
  return out;
};

/**
 * Aceita o payload do front (strings, `{ closed }`, `{ start, end }`, aliases open/close)
 * e grava sempre strings compatíveis com a agenda pública.
 */
export const normalizeBusinessHoursPayload = (input: unknown): Record<string, string> => {
  const out: Record<string, string> = {};
  if (input === null || input === undefined) return out;
  if (typeof input !== 'object' || Array.isArray(input)) return out;

  for (const [rawKey, val] of Object.entries(input as Record<string, unknown>)) {
    const key = rawKey.trim().toLowerCase();
    if (!key) continue;

    if (typeof val === 'string') {
      const t = val.trim();
      const low = t.toLowerCase();
      if (!t || low === 'fechado' || low === 'closed') out[key] = '';
      else out[key] = t;
      continue;
    }

    if (val && typeof val === 'object' && !Array.isArray(val)) {
      const o = val as Record<string, unknown>;
      if (o.closed === true || String(o.closed).toLowerCase() === 'true') {
        out[key] = '';
        continue;
      }
      const start = String(o.start ?? o.open ?? '').trim();
      const end = String(o.end ?? o.close ?? '').trim();
      if (start && end) out[key] = `${start}-${end}`;
      else out[key] = '';
    }
  }
  return out;
};

/** settings JSONB (ou TEXT) — mesmo problema de serialização em alguns hosts. */
export const coerceSettingsRecord = (raw: unknown): Record<string, any> | undefined => {
  if (raw == null || raw === '') return undefined;
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
        return parsed as Record<string, any>;
      }
    } catch {
      return undefined;
    }
    return undefined;
  }
  if (typeof raw === 'object' && !Array.isArray(raw)) {
    return raw as Record<string, any>;
  }
  return undefined;
};

const formatLocalYmd = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

export const getWeekdayKeys = (date: Date): string[] => {
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const dayNamesShort = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  const ptDayNames = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
  const ptDayNamesNoAccent = ['domingo', 'segunda-feira', 'terca-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sabado'];
  const ptDayNamesShort = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
  const ptDayNamesShortNoAccent = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'];
  const keys: string[] = [];

  const addKey = (locale: string, format: 'long' | 'short') =>
    keys.push(date.toLocaleDateString(locale, { weekday: format }).toLowerCase());

  keys.push(formatLocalYmd(date));
  addKey('en-US', 'long');
  addKey('en-US', 'short');
  addKey('pt-BR', 'long');
  addKey('pt-BR', 'short');
  keys.push(dayNames[date.getDay()]);
  keys.push(dayNamesShort[date.getDay()]);
  keys.push(ptDayNames[date.getDay()]);
  keys.push(ptDayNamesNoAccent[date.getDay()]);
  keys.push(ptDayNamesShort[date.getDay()]);
  keys.push(ptDayNamesShortNoAccent[date.getDay()]);
  keys.push(String(date.getDay()));

  return Array.from(new Set(keys.filter(Boolean)));
};

/**
 * Primeiro valor de agenda encontrado para as chaves candidatas.
 * Ignora entradas vazias para não "prender" em '' antes de uma chave válida (ex.: thu vs thursday).
 */
export const getNormalizedScheduleValue = <T>(
  schedule: Record<string, T> | undefined,
  keys: string[]
): T | undefined => {
  if (!schedule) return undefined;
  const normalizedSchedule = Object.entries(schedule).reduce<Record<string, T>>((acc, [key, value]) => {
    acc[key.trim().toLowerCase()] = value;
    return acc;
  }, {} as Record<string, T>);

  for (const key of keys) {
    const k = key.trim().toLowerCase();
    if (!Object.prototype.hasOwnProperty.call(normalizedSchedule, k)) continue;
    const value = normalizedSchedule[k];
    if (value === undefined || value === null) continue;
    if (typeof value === 'string' && value.trim() === '') continue;
    return value;
  }
  return undefined;
};
