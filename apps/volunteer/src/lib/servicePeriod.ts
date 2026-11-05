import type { VolunteerApplicationStatus } from '../contract/volunteerApi';
import { flightItineraryFor } from './flightItinerary';

/** Almost every short-term volunteer serves for three months. */
export const SHORT_TERM_SERVICE_MONTHS = 3;

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

export type ServicePeriod = {
  months: number;
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

export function servicePeriodFor(
  me: VolunteerApplicationStatus,
  now = new Date(),
): ServicePeriod {
  const months = serviceMonths(me);
  const start = fieldArrival(me);
  if (!start) return { months, start: null, end: null, progress: 0 };
  const end = addMonths(start, months);
  const today = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  return { months, start, end, progress: serviceProgress(start, end, today) };
}

function fieldArrival(me: VolunteerApplicationStatus): Date | null {
  const term = me.term.trim();
  if (!term) return null;
  const itinerary = flightItineraryFor(me.name);
  if (itinerary.term !== term) return null;
  const inbound = itinerary.directions.find((direction) => direction.id === 'to-field');
  const landing = inbound?.legs.at(-1);
  return landing ? parseLongDate(landing.date) : null;
}

function parseLongDate(value: string): Date | null {
  const match = value.match(/(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/);
  if (!match) return null;
  const month = MONTHS.findIndex((name) => name.toLowerCase() === match[2]!.toLowerCase());
  if (month < 0) return null;
  return new Date(Date.UTC(Number(match[3]), month, Number(match[1])));
}

function addMonths(date: Date, months: number): Date {
  const whole = Math.trunc(months);
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + whole;
  const day = date.getUTCDate();
  const first = new Date(Date.UTC(year, month, 1));
  const last = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
  return new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth(), Math.min(day, last)));
}
