/**
 * applicationGantt.ts — Build timeline rows for the applications Gantt view.
 * Chart UI shows ~3 months at a time; the full term range is horizontally scrollable.
 */

import type { Volunteer } from '../types/volunteer';
import {
  displayConfirmedLocation,
  displayLocationPreferenceOnly,
  hasConfirmedLocation,
} from './volunteerLocation';
import {
  displayConfirmedTerm,
  resolveVolunteerTermDateRange,
} from './volunteerTerm';

export interface ApplicationGanttRow {
  id: string;
  name: string;
  locationLabel: string;
  termLabel: string;
  startMs: number;
  endMs: number;
  volunteer: Volunteer;
}

export interface ApplicationGanttMonth {
  key: string;
  label: string;
  leftPct: number;
  widthPct: number;
  startMs: number;
}

export interface ApplicationGanttModel {
  rows: ApplicationGanttRow[];
  /** Alias of rows (kept for callers that used window clipping). */
  allRows: ApplicationGanttRow[];
  skippedWithoutDates: number;
  /** Always 0 for the scrollable full-range model. */
  hiddenOutsideWindow: number;
  rangeStartMs: number;
  rangeEndMs: number;
  months: ApplicationGanttMonth[];
}

/** How many months fit in the visible viewport (scroll to see more). */
export const GANTT_WINDOW_MONTHS = 3;

const DAY_MS = 24 * 60 * 60 * 1000;

export function ganttDisplayName(volunteer: Volunteer): string {
  return volunteer.couplePreview?.displayName?.trim() || volunteer.name;
}

/** Location used for Gantt coloring and the dedicated location filter. */
export function ganttLocationLabel(volunteer: Volunteer): string {
  const fieldLocation = (
    volunteer as Volunteer & { fieldLocation?: string }
  ).fieldLocation?.trim();
  if (fieldLocation) return fieldLocation;

  if (hasConfirmedLocation(volunteer)) {
    return displayConfirmedLocation(volunteer);
  }
  return displayLocationPreferenceOnly(volunteer);
}

export function matchesGanttLocation(
  volunteer: Volunteer,
  locations: string[],
): boolean {
  if (locations.length === 0) return true;
  const label = ganttLocationLabel(volunteer).toLowerCase();
  const preference = displayLocationPreferenceOnly(volunteer).toLowerCase();
  return locations.some((loc) => {
    const needle = loc.toLowerCase();
    return label.includes(needle) || preference.includes(needle);
  });
}

export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1, 12);
}

export function addMonths(date: Date, count: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + count, 1, 12);
}

function monthLabel(date: Date): string {
  return date.toLocaleString('en-US', { month: 'short', year: 'numeric' });
}

export function buildDatedGanttRows(volunteers: Volunteer[]): {
  rows: ApplicationGanttRow[];
  skippedWithoutDates: number;
} {
  const rows: ApplicationGanttRow[] = [];
  let skippedWithoutDates = 0;

  for (const volunteer of volunteers) {
    const range = resolveVolunteerTermDateRange(volunteer);
    if (!range) {
      skippedWithoutDates += 1;
      continue;
    }
    rows.push({
      id: volunteer.id,
      name: ganttDisplayName(volunteer),
      locationLabel: ganttLocationLabel(volunteer),
      termLabel: displayConfirmedTerm(volunteer),
      startMs: range.start.getTime(),
      endMs: range.end.getTime(),
      volunteer,
    });
  }

  rows.sort((a, b) => a.startMs - b.startMs || a.name.localeCompare(b.name));
  return { rows, skippedWithoutDates };
}

/**
 * Default scroll anchor: current month if any terms overlap the next 3 months,
 * otherwise the month of the earliest term.
 */
export function resolveGanttWindowStart(
  rows: ApplicationGanttRow[],
  preferredStartMs?: number,
): number {
  if (preferredStartMs != null && Number.isFinite(preferredStartMs)) {
    return startOfMonth(new Date(preferredStartMs)).getTime();
  }

  if (rows.length === 0) {
    return startOfMonth(new Date()).getTime();
  }

  const todayMonth = startOfMonth(new Date()).getTime();
  const todayWindowEnd = addMonths(
    new Date(todayMonth),
    GANTT_WINDOW_MONTHS,
  ).getTime();
  const overlapsTodayWindow = rows.some(
    (row) => row.startMs < todayWindowEnd && row.endMs > todayMonth,
  );
  if (overlapsTodayWindow) return todayMonth;

  return startOfMonth(new Date(Math.min(...rows.map((row) => row.startMs)))).getTime();
}

function buildMonthColumns(
  rangeStartMs: number,
  rangeEndMs: number,
): ApplicationGanttMonth[] {
  const span = Math.max(rangeEndMs - rangeStartMs, DAY_MS);
  const months: ApplicationGanttMonth[] = [];
  let cursor = startOfMonth(new Date(rangeStartMs));
  while (cursor.getTime() < rangeEndMs) {
    const next = addMonths(cursor, 1);
    const left = cursor.getTime() - rangeStartMs;
    const width = next.getTime() - cursor.getTime();
    months.push({
      key: `${cursor.getFullYear()}-${cursor.getMonth()}`,
      label: monthLabel(cursor),
      leftPct: (left / span) * 100,
      widthPct: (width / span) * 100,
      startMs: cursor.getTime(),
    });
    cursor = next;
  }
  return months;
}

/**
 * Build a full scrollable timeline covering all term dates (min 3 months wide).
 * The UI shows ~3 months in the viewport and scrolls horizontally for the rest.
 */
export function buildApplicationGanttModel(
  volunteers: Volunteer[],
  _options?: { windowStartMs?: number },
): ApplicationGanttModel {
  const { rows, skippedWithoutDates } = buildDatedGanttRows(volunteers);

  if (rows.length === 0) {
    const rangeStartMs = startOfMonth(new Date()).getTime();
    const rangeEndMs = addMonths(
      new Date(rangeStartMs),
      GANTT_WINDOW_MONTHS,
    ).getTime();
    return {
      rows: [],
      allRows: [],
      skippedWithoutDates,
      hiddenOutsideWindow: 0,
      rangeStartMs,
      rangeEndMs,
      months: buildMonthColumns(rangeStartMs, rangeEndMs),
    };
  }

  const minStart = Math.min(...rows.map((row) => row.startMs));
  const maxEnd = Math.max(...rows.map((row) => row.endMs));
  const rangeStartMs = startOfMonth(new Date(minStart)).getTime();
  let rangeEndMs = addMonths(startOfMonth(new Date(maxEnd)), 1).getTime();
  const minEnd = addMonths(new Date(rangeStartMs), GANTT_WINDOW_MONTHS).getTime();
  if (rangeEndMs < minEnd) rangeEndMs = minEnd;

  return {
    rows,
    allRows: rows,
    skippedWithoutDates,
    hiddenOutsideWindow: 0,
    rangeStartMs,
    rangeEndMs,
    months: buildMonthColumns(rangeStartMs, rangeEndMs),
  };
}

/** CSS width of the scrollable timeline so ~3 months fill the viewport. */
export function ganttTimelineWidthPercent(monthCount: number): string {
  const count = Math.max(monthCount, GANTT_WINDOW_MONTHS);
  return `${(count / GANTT_WINDOW_MONTHS) * 100}%`;
}

/** Month-index based scroll ratio (stable; avoids day-length drift). */
export function ganttScrollRatioByMonthIndex(
  windowStartMs: number,
  months: ApplicationGanttMonth[],
): number {
  if (months.length <= GANTT_WINDOW_MONTHS) return 0;
  const target = startOfMonth(new Date(windowStartMs)).getTime();
  const exact = months.findIndex((month) => month.startMs === target);
  let index = exact;
  if (index < 0) {
    index = months.findIndex((month) => month.startMs >= target);
  }
  if (index < 0) index = months.length - 1;
  const maxIndex = months.length - GANTT_WINDOW_MONTHS;
  return Math.min(1, Math.max(0, index / maxIndex));
}

/** Pixel scrollLeft so `windowStartMs` sits at the left edge of the viewport. */
export function ganttScrollLeftForWindowStart(
  windowStartMs: number,
  months: ApplicationGanttMonth[],
  scrollWidth: number,
  clientWidth: number,
): number {
  const maxScroll = Math.max(scrollWidth - clientWidth, 0);
  if (maxScroll === 0 || months.length === 0) return 0;
  return ganttScrollRatioByMonthIndex(windowStartMs, months) * maxScroll;
}

/** Visible window label from scroll position (left edge month → +2 months). */
export function formatGanttWindowLabelFromScroll(
  scrollRatio: number,
  months: ApplicationGanttMonth[],
): string {
  if (months.length === 0) return '';
  const maxIndex = Math.max(months.length - GANTT_WINDOW_MONTHS, 0);
  const startIndex = Math.round(scrollRatio * maxIndex);
  const start = months[startIndex];
  const end =
    months[Math.min(startIndex + GANTT_WINDOW_MONTHS - 1, months.length - 1)];
  if (!start || !end) return '';
  return start.label === end.label
    ? start.label
    : `${start.label} – ${end.label}`;
}

/** Bar position on the full scrollable timeline. */
export function ganttBarStyle(
  row: ApplicationGanttRow,
  rangeStartMs: number,
  rangeEndMs: number,
): { left: string; width: string } | null {
  const clippedStart = Math.max(row.startMs, rangeStartMs);
  const clippedEnd = Math.min(row.endMs, rangeEndMs);
  if (clippedEnd <= clippedStart) return null;

  const span = Math.max(rangeEndMs - rangeStartMs, DAY_MS);
  const leftPct = ((clippedStart - rangeStartMs) / span) * 100;
  const widthPct = Math.max(((clippedEnd - clippedStart) / span) * 100, 0.4);
  return {
    left: `${leftPct}%`,
    width: `${widthPct}%`,
  };
}

export function collectGanttLocationOptions(volunteers: Volunteer[]): string[] {
  const set = new Set<string>();
  for (const volunteer of volunteers) {
    const label = ganttLocationLabel(volunteer).trim();
    if (label) set.add(label);
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}

export function formatGanttWindowLabel(
  rangeStartMs: number,
  rangeEndMs: number,
): string {
  const start = startOfMonth(new Date(rangeStartMs));
  const end = addMonths(new Date(rangeEndMs), -1);
  const startLabel = monthLabel(start);
  const endLabel = monthLabel(end);
  return startLabel === endLabel ? startLabel : `${startLabel} – ${endLabel}`;
}
