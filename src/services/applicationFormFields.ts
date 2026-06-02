import { columnMap } from '../config/columnMap';
import type { ApplicationFormField } from '../types/volunteer';
import type { MondayColumnValue } from './mapMondayToCrm';

const SKIP_COLUMN_TYPES = new Set([
  'subtasks',
  'board_relation',
  'mirror',
  'auto_number',
  'creation_log',
  'last_updated',
  'item_id',
  'formula',
]);

const CRM_EXCLUDED_TITLES = new Set(
  Object.values(columnMap).map((title) => normalizeTitle(title)),
);

/** Onboarding status column — not pastor reference form Q&A */
const PASTOR_REFERENCE_STATUS_TITLE = normalizeTitle(columnMap.pastorReference);

function normalizeTitle(title: string): string {
  return title.trim().toLowerCase();
}

function columnTitle(col: MondayColumnValue): string {
  return col.column?.title?.trim() || '';
}

function parsePastorWhitelist(): Set<string> {
  const raw = import.meta.env.VITE_PASTOR_REFERENCE_COLUMNS as string | undefined;
  if (!raw?.trim()) return new Set();
  return new Set(
    raw.split(',').map((t) => normalizeTitle(t.trim())).filter(Boolean),
  );
}

const pastorWhitelist = parsePastorWhitelist();

function isCrmColumn(title: string): boolean {
  return CRM_EXCLUDED_TITLES.has(normalizeTitle(title));
}

function isSkippedType(type: string): boolean {
  return SKIP_COLUMN_TYPES.has(type);
}

function formatColumnAnswer(col: MondayColumnValue): string {
  const text = col.text?.trim();
  if (text) return text;

  if (!col.value) return '';

  try {
    const parsed = JSON.parse(col.value) as Record<string, unknown>;

    if (typeof parsed.text === 'string' && parsed.text.trim()) {
      return parsed.text.trim();
    }

    if (typeof parsed.label === 'string' && parsed.label.trim()) {
      return parsed.label.trim();
    }

    if (Array.isArray(parsed.labels) && parsed.labels.length > 0) {
      return parsed.labels.map(String).join(', ');
    }

    if (typeof parsed.email === 'string') {
      return parsed.email;
    }

    if (parsed.date) {
      return String(parsed.date);
    }

    if (Array.isArray(parsed.files) && parsed.files.length > 0) {
      return parsed.files
        .map((f) => {
          const file = f as Record<string, unknown>;
          return String(file.name ?? file.url ?? 'File');
        })
        .join(', ');
    }

    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed
        .map((entry) => {
          const item = entry as Record<string, unknown>;
          return String(item.name ?? item.url ?? entry);
        })
        .join(', ');
    }
  } catch {
    // use raw value below
  }

  const raw = col.value.trim();
  if (raw.startsWith('{') || raw.startsWith('[')) return '';

  return raw;
}

function hasAnswer(answer: string): boolean {
  return answer.trim().length > 0;
}

function buildFields(
  columnValues: MondayColumnValue[],
  includePredicate: (col: MondayColumnValue, title: string) => boolean,
): ApplicationFormField[] {
  const fields: ApplicationFormField[] = [];

  for (const col of columnValues) {
    const title = columnTitle(col);
    if (!title) continue;
    if (isSkippedType(col.type)) continue;
    if (!includePredicate(col, title)) continue;

    const answer = formatColumnAnswer(col);
    if (!hasAnswer(answer)) continue;

    fields.push({
      id: col.id,
      question: title,
      answer,
      columnType: col.type,
    });
  }

  return fields;
}

function isPastorReferenceColumn(_col: MondayColumnValue, title: string): boolean {
  const normalized = normalizeTitle(title);
  if (normalized === PASTOR_REFERENCE_STATUS_TITLE) return false;
  if (isCrmColumn(title)) return false;
  if (pastorWhitelist.has(normalized)) return true;
  return normalized.includes('pastor') || normalized.includes('reference');
}

export function buildApplicationFormFields(
  columnValues: MondayColumnValue[],
): ApplicationFormField[] {
  return buildFields(
    columnValues,
    (_col, title) => !isCrmColumn(title),
  );
}

export function buildPastorReferenceFormFields(
  columnValues: MondayColumnValue[],
): ApplicationFormField[] {
  return buildFields(columnValues, isPastorReferenceColumn);
}
