import type { VolunteerApplicationStatus } from '../contract/volunteerApi';
import { flightItineraryFor } from './flightItinerary';

/** Sterling Volunteers opens this many months before the volunteer leaves home. */
export const BACKGROUND_CHECK_LEAD_MONTHS = 3;

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

export type AssignedTeamDates = {
  /** Day the volunteer leaves home. */
  departsHome: Date | null;
  /** Day the volunteer arrives on the field. */
  arrivesField: Date | null;
  /** Day the volunteer leaves the field. */
  departsField: Date | null;
};

const EMPTY_DATES: AssignedTeamDates = {
  departsHome: null,
  arrivesField: null,
  departsField: null,
};

/**
 * Monday team dates when they are on the record.
 * Otherwise the preview itinerary for this term.
 */
export function assignedTeamDates(me: VolunteerApplicationStatus): AssignedTeamDates {
  const flight = flightDates(me);
  const assigned = me.teamDates;
  return {
    departsHome: parseIsoDate(assigned?.departsHome) ?? flight.departsHome,
    arrivesField: parseIsoDate(assigned?.arrivesField) ?? flight.arrivesField,
    departsField: parseIsoDate(assigned?.departsField) ?? flight.departsField,
  };
}

export function formatTeamDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

export function backgroundCheckAvailability(
  me: VolunteerApplicationStatus,
  now = new Date(),
): { open: boolean; note: string } {
  const { departsHome } = assignedTeamDates(me);
  if (!departsHome) {
    return {
      open: false,
      note: 'Sterling Volunteers opens three months before you depart. Your departure date is not on file yet.',
    };
  }
  const opens = addMonthsUtc(departsHome, -BACKGROUND_CHECK_LEAD_MONTHS);
  if (localDay(now).getTime() >= opens.getTime()) {
    return { open: true, note: '' };
  }
  return {
    open: false,
    note: `Sterling Volunteers opens on ${formatTeamDate(opens)}.`,
  };
}

/** On-field access opens at the start of the day after the volunteer leaves home. */
export function fieldPortalOpensAt(me: VolunteerApplicationStatus): Date | null {
  const { departsHome } = assignedTeamDates(me);
  if (!departsHome) return null;
  return addDaysUtc(departsHome, 1);
}

export function daysBetween(start: Date, end: Date): number {
  const ms = end.getTime() - start.getTime();
  if (ms <= 0) return 0;
  return Math.round(ms / 86_400_000);
}

function flightDates(me: VolunteerApplicationStatus): AssignedTeamDates {
  const term = me.term.trim();
  if (!term) return EMPTY_DATES;
  const itinerary = flightItineraryFor(me.name);
  if (itinerary.term !== term) return EMPTY_DATES;
  const inbound = itinerary.directions.find((direction) => direction.id === 'to-field');
  const home = itinerary.directions.find((direction) => direction.id === 'home');
  const first = inbound?.legs[0];
  const landing = inbound?.legs.at(-1);
  const leave = home?.legs[0];
  return {
    departsHome: first ? parseLongDate(first.date) : null,
    arrivesField: landing ? parseLongDate(landing.date) : null,
    departsField: leave ? parseLongDate(leave.date) : null,
  };
}

function parseIsoDate(value: string | undefined): Date | null {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return new Date(Date.UTC(year, month - 1, day));
}

function parseLongDate(value: string): Date | null {
  const match = value.match(/(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/);
  if (!match) return null;
  const month = MONTHS.findIndex((name) => name.toLowerCase() === match[2]!.toLowerCase());
  if (month < 0) return null;
  return new Date(Date.UTC(Number(match[3]), month, Number(match[1])));
}

function localDay(now: Date): Date {
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
}

function addDaysUtc(date: Date, days: number): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + days));
}

function addMonthsUtc(date: Date, months: number): Date {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + months;
  const day = date.getUTCDate();
  const first = new Date(Date.UTC(year, month, 1));
  const last = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
  return new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth(), Math.min(day, last)));
}
