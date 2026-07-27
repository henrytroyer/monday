import { columnMap } from '../config/columnMap';
import type { MondayColumnValue } from './mapMondayToCrm';

export type { MondayColumnValue };

export interface MondayTimelineRange {
  from: string;
  to: string;
}

function normalizeTitle(title: string): string {
  return title.trim().toLowerCase();
}

function columnTitle(col: MondayColumnValue): string {
  return col.column?.title?.trim() || '';
}

function findColumn(
  columnValues: MondayColumnValue[],
  fieldKey: keyof typeof columnMap,
): MondayColumnValue | undefined {
  const target = normalizeTitle(columnMap[fieldKey]);
  return columnValues.find(
    (col) => normalizeTitle(columnTitle(col)) === target,
  );
}

export function getMappedColumnText(
  columnValues: MondayColumnValue[],
  fieldKey: keyof typeof columnMap,
): string {
  return findColumn(columnValues, fieldKey)?.text?.trim() || '';
}

export function getMappedColumnDateText(
  columnValues: MondayColumnValue[],
  fieldKey: keyof typeof columnMap,
): string {
  const col = findColumn(columnValues, fieldKey);
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

export function parseMondayTimelineColumn(
  col: MondayColumnValue | undefined,
): MondayTimelineRange | null {
  if (!col) return null;

  if (col.value) {
    try {
      const parsed = JSON.parse(col.value) as { from?: string; to?: string };
      if (parsed.from?.trim() && parsed.to?.trim()) {
        return { from: parsed.from.trim(), to: parsed.to.trim() };
      }
    } catch {
      // fall through
    }
  }

  const text = col.text?.trim();
  if (text) {
    const match = text.match(/(\d{4}-\d{2}-\d{2})\s*-\s*(\d{4}-\d{2}-\d{2})/);
    if (match) {
      return { from: match[1], to: match[2] };
    }
  }

  return null;
}

function findArrivalDepartureTimelineColumn(
  columnValues: MondayColumnValue[],
): MondayColumnValue | undefined {
  const mapped = findColumn(columnValues, 'arrivalDepartureTimeline');
  if (mapped) return mapped;

  return columnValues.find(
    (col) =>
      col.type === 'timeline' &&
      /arrival/i.test(columnTitle(col)) &&
      /depart/i.test(columnTitle(col)),
  );
}

export function getArrivalDepartureTimelineRange(
  columnValues: MondayColumnValue[],
): MondayTimelineRange | null {
  return parseMondayTimelineColumn(
    findArrivalDepartureTimelineColumn(columnValues),
  );
}
