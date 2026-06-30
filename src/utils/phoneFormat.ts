import parsePhoneNumber, {
  type CountryCode,
  type PhoneNumber,
} from 'libphonenumber-js';
import type { MondayColumnValue } from '../services/mapMondayToCrm';

const DEFAULT_COUNTRY: CountryCode = 'US';

export interface MondayPhoneColumnValue {
  phone: string;
  countryShortName: string;
}

function parsePhone(
  raw: string,
  countryHint?: string,
): PhoneNumber | undefined {
  const trimmed = raw.trim();
  if (!trimmed) return undefined;

  const country =
    countryHint && countryHint.length === 2
      ? (countryHint.toUpperCase() as CountryCode)
      : DEFAULT_COUNTRY;

  try {
    if (trimmed.startsWith('+')) {
      const parsed = parsePhoneNumber(trimmed);
      if (parsed) return parsed;
    }
    return parsePhoneNumber(trimmed, country);
  } catch {
    return undefined;
  }
}

/** International display format, e.g. +1 555 123 4567 */
export function formatPhoneDisplay(
  raw: string | undefined | null,
  countryHint?: string,
): string | undefined {
  const trimmed = raw?.trim();
  if (!trimmed) return undefined;

  const parsed = parsePhone(trimmed, countryHint);
  if (parsed) {
    try {
      return parsed.formatInternational();
    } catch {
      // fall through
    }
  }

  return trimmed;
}

/** E.164 digits for tel: and wa.me (no plus). */
export function formatPhoneE164(
  raw: string | undefined | null,
  countryHint?: string,
): string | undefined {
  const trimmed = raw?.trim();
  if (!trimmed) return undefined;

  const parsed = parsePhone(trimmed, countryHint);
  if (parsed) {
    try {
      return parsed.format('E.164').replace(/^\+/, '');
    } catch {
      // fall through
    }
  }

  const digits = trimmed.replace(/\D/g, '');
  return digits || undefined;
}

export function formatPhoneTelHref(
  raw: string | undefined | null,
  countryHint?: string,
): string | undefined {
  const e164 = formatPhoneE164(raw, countryHint);
  if (!e164) return undefined;
  return `tel:+${e164}`;
}

export function parseMondayPhoneColumn(
  col: MondayColumnValue | undefined,
): string {
  if (!col) return '';

  if (col.value) {
    try {
      const data = JSON.parse(col.value) as {
        phone?: string;
        countryShortName?: string;
      };
      if (data.phone?.trim()) {
        return (
          formatPhoneDisplay(data.phone, data.countryShortName) ??
          data.phone.trim()
        );
      }
    } catch {
      // fall through to text
    }
  }

  const fromText = formatPhoneDisplay(col.text ?? '');
  return fromText ?? col.text?.trim() ?? '';
}

type PhoneColumnMap = { phone: string };

function normalizeTitle(title: string): string {
  return title.trim().toLowerCase();
}

function findPhoneColumn(
  columnValues: MondayColumnValue[],
  map: PhoneColumnMap,
): MondayColumnValue | undefined {
  const target = normalizeTitle(map.phone);
  return columnValues.find(
    (col) => normalizeTitle(col.column?.title?.trim() || '') === target,
  );
}

export function getColumnPhone(
  columnValues: MondayColumnValue[],
  map: PhoneColumnMap,
): string {
  return parseMondayPhoneColumn(findPhoneColumn(columnValues, map));
}

export function phoneForMondayColumn(
  raw: string | undefined | null,
  countryHint?: string,
): MondayPhoneColumnValue {
  const trimmed = raw?.trim() ?? '';
  if (!trimmed) {
    return { phone: '', countryShortName: DEFAULT_COUNTRY };
  }

  const parsed = parsePhone(trimmed, countryHint);
  if (parsed) {
    try {
      return {
        phone: parsed.nationalNumber,
        countryShortName: parsed.country ?? DEFAULT_COUNTRY,
      };
    } catch {
      // fall through
    }
  }

  return {
    phone: trimmed.replace(/\D/g, ''),
    countryShortName:
      countryHint && countryHint.length === 2
        ? countryHint.toUpperCase()
        : DEFAULT_COUNTRY,
  };
}

/** Normalize optional phone for storage; returns undefined when empty. */
export function normalizeStoredPhone(
  raw: string | undefined | null,
  countryHint?: string,
): string | undefined {
  const trimmed = raw?.trim();
  if (!trimmed) return undefined;
  return formatPhoneDisplay(trimmed, countryHint) ?? trimmed;
}
