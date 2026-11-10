import type { VolunteerApplicationStatus } from '../contract/volunteerApi';
import { onboardingFillPercent, resolveOnboardingSteps } from './onboarding';
import { flightItineraryFor } from './flightItinerary';

/** Lesvos and Athens arrivals are on Greece time. */
const EUROPE_ATHENS = 'Europe/Athens';

/** Shown beside the preparation heading once Team Training is filled. */
export const FIELD_ARRIVAL_NOTICE =
  "The On-Field Volunteer Page will appear when you've landed in Europe.";

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

/** setTimeout delays are clamped to a 32-bit signed integer. */
export const MAX_ARRIVAL_WAIT_MS = 2_147_483_647;

/** The inbound landing instant, in Europe. Null when this term has no itinerary. */
export function fieldLandingAt(me: VolunteerApplicationStatus): Date | null {
  const term = me.term.trim();
  if (!term) return null;
  const itinerary = flightItineraryFor(me.name);
  if (itinerary.term !== term) return null;
  const landing = itinerary.directions
    .find((direction) => direction.id === 'to-field')
    ?.legs.at(-1);
  if (!landing) return null;
  return landingInstant(landing.date, landing.arrives, landing.nextDay);
}

export function hasLandedInEurope(
  me: VolunteerApplicationStatus,
  now = new Date(),
): boolean {
  const landing = fieldLandingAt(me);
  if (!landing) return false;
  return now.getTime() >= landing.getTime();
}

/** The notice stays up on the preparation page once Team Training is full. */
export function showFieldArrivalNotice(me: VolunteerApplicationStatus): boolean {
  if (me.arrivedInEurope) return false;
  const training = resolveOnboardingSteps(me).find((step) => step.id === 'team_training');
  return training != null && onboardingFillPercent(training) === 100;
}

export function arrivalWaitMs(landing: Date, now = new Date()): number {
  return Math.min(Math.max(0, landing.getTime() - now.getTime()), MAX_ARRIVAL_WAIT_MS);
}

function landingInstant(date: string, arrives: string, nextDay: boolean): Date | null {
  const parsedDate = date.match(/(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/);
  const parsedTime = arrives.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!parsedDate || !parsedTime) return null;
  const month = MONTHS.findIndex(
    (name) => name.toLowerCase() === parsedDate[2]!.toLowerCase(),
  );
  if (month < 0) return null;
  let hour = Number(parsedTime[1]);
  const minute = Number(parsedTime[2]);
  const meridiem = parsedTime[3]!.toUpperCase();
  if (hour === 12) hour = 0;
  if (meridiem === 'PM') hour += 12;
  const day = Number(parsedDate[1]) + (nextDay ? 1 : 0);
  return zonedDateTime(Number(parsedDate[3]), month, day, hour, minute, EUROPE_ATHENS);
}

function zonedDateTime(
  year: number,
  monthIndex: number,
  day: number,
  hour: number,
  minute: number,
  timeZone: string,
): Date {
  const utc = Date.UTC(year, monthIndex, day, hour, minute);
  const offset = zoneOffsetMs(new Date(utc), timeZone);
  const adjusted = new Date(utc - offset);
  const offsetAfter = zoneOffsetMs(adjusted, timeZone);
  return offsetAfter === offset ? adjusted : new Date(utc - offsetAfter);
}

function zoneOffsetMs(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value);
  let year = value('year');
  let month = value('month');
  let day = value('day');
  let hour = value('hour');
  const minute = value('minute');
  const second = value('second');
  if (hour === 24) {
    hour = 0;
    const next = new Date(Date.UTC(year, month - 1, day + 1));
    year = next.getUTCFullYear();
    month = next.getUTCMonth() + 1;
    day = next.getUTCDate();
  }
  const asUtc = Date.UTC(year, month - 1, day, hour, minute, second);
  return asUtc - date.getTime();
}
