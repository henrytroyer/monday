import type { Volunteer } from '../types/volunteer';
import { formatDisplayDateFromDate } from './formatDateOfBirth';
import { resolveVolunteerTermDateRange } from './volunteerTerm';

export type TermProgressPhase = 'upcoming' | 'active' | 'complete';

export interface TermProgressSnapshot {
  start: Date;
  end: Date;
  percent: number;
  phase: TermProgressPhase;
  startLabel: string;
  endLabel: string;
  statusLabel: string;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function formatShortDate(date: Date): string {
  return formatDisplayDateFromDate(date);
}

function daysBetween(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / MS_PER_DAY);
}

export function resolveTermProgressSnapshot(
  volunteer: Volunteer,
  now = new Date(),
): TermProgressSnapshot | null {
  const range = resolveVolunteerTermDateRange(volunteer);
  if (!range) return null;

  const { start: startDay, end: endDay } = range;
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12);

  const totalMs = endDay.getTime() - startDay.getTime();
  const elapsedMs = today.getTime() - startDay.getTime();

  let phase: TermProgressPhase;
  let percent: number;
  let statusLabel: string;

  if (today.getTime() < startDay.getTime()) {
    phase = 'upcoming';
    percent = 0;
    const daysUntil = daysBetween(today, startDay);
    statusLabel =
      daysUntil === 1 ? 'Starts tomorrow' : `Starts in ${daysUntil} days`;
  } else if (today.getTime() > endDay.getTime()) {
    phase = 'complete';
    percent = 100;
    statusLabel = 'Term complete';
  } else {
    phase = 'active';
    percent = Math.round((elapsedMs / totalMs) * 100);
    const daysLeft = daysBetween(today, endDay);
    const dayNumber = daysBetween(startDay, today) + 1;
    const totalDays = daysBetween(startDay, endDay) + 1;
    statusLabel =
      daysLeft === 0
        ? 'Final day on field'
        : `Day ${dayNumber} of ${totalDays} · ${daysLeft} day${daysLeft === 1 ? '' : 's'} left`;
  }

  return {
    start: startDay,
    end: endDay,
    percent: Math.min(100, Math.max(0, percent)),
    phase,
    startLabel: formatShortDate(startDay),
    endLabel: formatShortDate(endDay),
    statusLabel,
  };
}
