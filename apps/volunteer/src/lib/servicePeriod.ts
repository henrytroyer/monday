import type { VolunteerApplicationStatus } from '../contract/volunteerApi';
import { assignedTeamDates, daysBetween, formatTeamDate } from './teamDates';

/** Almost every short-term volunteer serves for three months. */
export const SHORT_TERM_SERVICE_MONTHS = 3;

/**
 * Days after arrival the preview timeline counts as served.
 * Arrival and departure still come from each volunteer's dates.
 */
const PREVIEW_DAYS_SERVED = 34;

export type ServicePeriod = {
  months: number;
  /** Calendar days from arrival through the day before departure. */
  days: number;
  /** Days already served: 0 before arrival, `days` once the period is over. */
  served: number;
  start: Date | null;
  end: Date | null;
  /** 0 before the period, 100 after it, otherwise how far today is between the two. */
  progress: number;
};

export function serviceMonths(me: VolunteerApplicationStatus): number {
  if (me.termOfService?.lengthOfTerm === 'other') {
    const match = me.termOfService.otherTerm.match(/(\d+(?:\.\d+)?)/);
    const months = match ? Number(match[1]) : SHORT_TERM_SERVICE_MONTHS;
    if (Number.isFinite(months) && months > 0) return months;
  }
  return SHORT_TERM_SERVICE_MONTHS;
}

/** Share of the service period that today has reached, from 0 to 100. */
export function serviceProgress(start: Date, end: Date, now: Date): number {
  const from = start.getTime();
  const to = end.getTime();
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  if (to <= from || today <= from) return 0;
  if (today >= to) return 100;
  return Math.round(((today - from) / (to - from)) * 100);
}

export function servicePeriodLabel(period: ServicePeriod): string | null {
  if (!period.start || !period.end) return null;
  return `${formatTeamDate(period.start)} – ${formatTeamDate(period.end)}`;
}

export function serviceDayLabel(days: number): string {
  return days === 1 ? '1 day' : `${days} days`;
}

export function serviceLengthLabel(period: ServicePeriod): string | null {
  if (!period.start || !period.end || period.days <= 0) return null;
  return serviceDayLabel(period.days);
}

/** Percent of the term already served: days served divided by the full term. */
export function serviceDayPercent(period: ServicePeriod): number {
  if (period.days <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((period.served / period.days) * 100)));
}

/** Days served over the full term, with the percent that ratio produces. */
export function serviceRatioLabel(period: ServicePeriod): string | null {
  if (period.days <= 0) return null;
  return `${serviceDayLabel(period.served)} / ${serviceDayLabel(period.days)} = ${serviceDayPercent(period)}%`;
}

export function servicePeriodFor(
  me: VolunteerApplicationStatus,
  now = new Date(),
): ServicePeriod {
  const months = serviceMonths(me);
  const { arrivesField, departsField } = assignedTeamDates(me);
  if (!arrivesField || !departsField) {
    return { months, days: 0, served: 0, start: arrivesField, end: departsField, progress: 0 };
  }
  const today = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const days = daysBetween(arrivesField, departsField);
  return {
    months,
    days,
    served: daysServed(arrivesField, departsField, today, days),
    start: arrivesField,
    end: departsField,
    progress: serviceProgress(arrivesField, departsField, today),
  };
}

/** Preview stand-in for "today" until Monday supplies the live service date. */
export function previewServicePeriod(me: VolunteerApplicationStatus): ServicePeriod {
  const { arrivesField } = assignedTeamDates(me);
  if (!arrivesField) return servicePeriodFor(me);
  const asOf = new Date(
    arrivesField.getUTCFullYear(),
    arrivesField.getUTCMonth(),
    arrivesField.getUTCDate() + PREVIEW_DAYS_SERVED,
  );
  return servicePeriodFor(me, asOf);
}

function daysServed(start: Date, end: Date, today: Date, total: number): number {
  const now = today.getTime();
  if (total <= 0 || now <= start.getTime()) return 0;
  if (now >= end.getTime()) return total;
  return daysBetween(start, today);
}
