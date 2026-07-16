import type { MondayColumnValue } from '../services/mapMondayToCrm';

/** Read ISO or display text from a monday.com date column. */
export function readMondayDateColumnText(
  col: MondayColumnValue | undefined,
): string {
  if (!col) return '';

  const text = col.text?.trim();
  if (text) return text;

  if (col.value) {
    try {
      const parsed = JSON.parse(col.value) as { date?: string };
      if (parsed.date?.trim()) return parsed.date.trim();
    } catch {
      // fall through
    }
  }

  return '';
}

export function parseDateOfBirth(value: string | undefined): Date | null {
  if (!value?.trim() || value.trim() === '—') return null;

  const trimmed = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const parsed = new Date(`${trimmed}T12:00:00`);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const parsed = Date.parse(trimmed);
  if (Number.isNaN(parsed)) return null;
  return new Date(parsed);
}

/** Display as Month D, YYYY (e.g. March 14, 1990). */
export function formatDisplayDateFromDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

/** Display as Month D, YYYY (e.g. August 24, 2026). */
export function formatDisplayDate(value: string | undefined): string | null {
  if (!value?.trim()) return null;

  const parsed = parseDateOfBirth(value);
  if (!parsed) return value.trim();

  return formatDisplayDateFromDate(parsed);
}

export function formatDateOfBirth(value: string | undefined): string | null {
  return formatDisplayDate(value);
}

/** Normalize stored values to Month D, YYYY when parseable. */
export function normalizeDateOfBirth(
  value: string | undefined,
): string | undefined {
  return formatDisplayDate(value) ?? value?.trim() ?? undefined;
}

/** Value for `<input type="date">` (YYYY-MM-DD). */
export function dateOfBirthToInputValue(value: string | undefined): string {
  const parsed = parseDateOfBirth(value);
  if (!parsed) return '';

  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const day = String(parsed.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
