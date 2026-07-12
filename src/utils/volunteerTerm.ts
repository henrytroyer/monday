import { getTimelineById, getTimelineLabel } from '../data/timelines';
import {
  isPostConfirmationPipelineStage,
  isPostConfirmationTermStatus,
} from '../constants/applicationStatuses';
import type { Volunteer } from '../types/volunteer';

export interface VolunteerTermDateRange {
  start: Date;
  end: Date;
}

/** Term of service label (canonical signup timeline). */
export function displayTermOfService(volunteer: Volunteer): string {
  return getTimelineLabel(volunteer.timelineId);
}

/** Raw Preferred Dates column value from monday.com. */
export function displayPreferredDates(volunteer: Volunteer): string {
  const preferred = volunteer.preferredDates?.trim();
  if (preferred && preferred !== '—') return preferred;
  return displayTermOfService(volunteer);
}

export function hasConfirmedTerm(
  volunteer: Volunteer,
  pipelineStageOverride?: string,
): boolean {
  const stage = pipelineStageOverride ?? volunteer.pipelineStage;
  if (stage && isPostConfirmationPipelineStage(stage)) return true;
  if (isPostConfirmationTermStatus(volunteer.status)) return true;

  const start = volunteer.termStart?.trim();
  const end = volunteer.termEnd?.trim();
  if (!start || !end || start === '—' || end === '—') return false;
  return true;
}

export function displayConfirmedTerm(volunteer: Volunteer): string {
  return displayTermOfService(volunteer);
}

/** Whether preferred dates differ from the resolved term-of-service label. */
export function hasDistinctPreferredDates(volunteer: Volunteer): boolean {
  const preferred = displayPreferredDates(volunteer);
  const term = displayTermOfService(volunteer);
  return preferred.toLowerCase() !== term.toLowerCase();
}

function normalizeToNoon(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12);
}

export function parseFlexibleDate(value: string | undefined): Date | null {
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

function inferContextYear(text: string): number | undefined {
  const match = text.match(/\b(20\d{2})\b/);
  return match ? Number(match[1]) : undefined;
}

function parsePartialDate(
  fragment: string,
  contextText: string,
  referenceStart?: Date,
): Date | null {
  const hasExplicitYear = /\b(19|20)\d{2}\b/.test(fragment);
  if (hasExplicitYear) {
    const direct = parseFlexibleDate(fragment);
    if (direct) return normalizeToNoon(direct);
  }

  const contextYear = inferContextYear(contextText);
  const year =
    contextYear ??
    referenceStart?.getFullYear() ??
    new Date().getFullYear();

  const withYear = parseFlexibleDate(`${fragment}, ${year}`);
  if (withYear) return normalizeToNoon(withYear);

  const attempt = Date.parse(`${fragment} ${year}`);
  if (!Number.isNaN(attempt)) return normalizeToNoon(new Date(attempt));

  return null;
}

function parseDateRangeFromText(text: string): VolunteerTermDateRange | null {
  const trimmed = text.trim();
  if (!trimmed || trimmed === '—') return null;

  const parenMatch = trimmed.match(/\(([^)]+)\)/);
  const rangeText = parenMatch?.[1]?.trim() ?? trimmed;
  if (!/[–—-]/.test(rangeText)) return null;

  const parts = rangeText
    .split(/\s*[–—-]\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length < 2) return null;

  const start = parsePartialDate(parts[0], trimmed);
  if (!start) return null;

  let end = parsePartialDate(parts[parts.length - 1], trimmed, start);
  if (!end) return null;

  if (end.getTime() < start.getTime()) {
    const nextYearEnd = parsePartialDate(
      `${parts[parts.length - 1]}, ${start.getFullYear() + 1}`,
      trimmed,
    );
    if (nextYearEnd && nextYearEnd.getTime() > start.getTime()) {
      end = nextYearEnd;
    }
  }

  if (end.getTime() <= start.getTime()) return null;
  return { start, end };
}

/**
 * Resolve concrete start/end dates for a volunteer using the same sources as
 * the confirmed-dates UI: arrival/departure columns, signup timeline catalog,
 * then date ranges embedded in timeline / preferred-date labels.
 */
export function resolveVolunteerTermDateRange(
  volunteer: Volunteer,
): VolunteerTermDateRange | null {
  const startCol = parseFlexibleDate(volunteer.termStart);
  const endCol = parseFlexibleDate(volunteer.termEnd);
  if (startCol && endCol && endCol.getTime() > startCol.getTime()) {
    return {
      start: normalizeToNoon(startCol),
      end: normalizeToNoon(endCol),
    };
  }

  const timeline = getTimelineById(volunteer.timelineId);
  if (timeline) {
    const start = normalizeToNoon(new Date(`${timeline.startDate}T12:00:00`));
    const end = normalizeToNoon(new Date(`${timeline.endDate}T12:00:00`));
    if (end.getTime() > start.getTime()) return { start, end };
  }

  const textSources = [
    volunteer.termStart?.trim() && volunteer.termEnd?.trim()
      ? `${volunteer.termStart.trim()} – ${volunteer.termEnd.trim()}`
      : undefined,
    volunteer.preferredDates,
    displayTermOfService(volunteer),
    getTimelineLabel(volunteer.timelineId),
  ].filter((source): source is string => Boolean(source?.trim()));

  for (const source of textSources) {
    const range = parseDateRangeFromText(source);
    if (range) return range;
  }

  return null;
}
