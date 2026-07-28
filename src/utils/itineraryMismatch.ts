/**
 * itineraryMismatch.ts
 * Flag destination itinerary arrival/departure mismatches among volunteers
 * who share the same confirmed date range.
 */
import type { ItineraryLeg, VolunteerItinerary } from '../types/itinerary';
import { itineraryHasData, itineraryLegHasData } from '../types/itinerary';
import type { Volunteer } from '../types/volunteer';
import { resolveVolunteerTermDateRange } from './volunteerTerm';

export interface ItineraryMismatchFlag {
  arrivalConflict: boolean;
  departureConflict: boolean;
  /** Human-readable explanation for tooltip. */
  message: string;
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/** YYYY-MM-DD for cohort keys. */
export function formatCohortDate(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

export function confirmedDateCohortKey(volunteer: Volunteer): string | null {
  const range = resolveVolunteerTermDateRange(volunteer);
  if (!range) return null;
  return `${formatCohortDate(range.start)}|${formatCohortDate(range.end)}`;
}

/** Normalize time strings so "1:25 PM" and "01:25 PM" compare equal. */
export function normalizeItineraryTime(time: string): string {
  const trimmed = time.trim().toUpperCase().replace(/\s+/g, ' ');
  if (!trimmed) return '';

  const match = trimmed.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?$/i);
  if (!match) return trimmed;

  let hours = Number(match[1]);
  const minutes = match[2];
  const seconds = match[3] ?? '00';
  const meridiem = match[4]?.toUpperCase();

  if (meridiem === 'PM' && hours < 12) hours += 12;
  if (meridiem === 'AM' && hours === 12) hours = 0;

  if (meridiem) {
    return `${pad2(hours)}:${minutes}:${seconds}`;
  }

  return `${pad2(hours)}:${minutes}:${seconds}`;
}

/** Normalize date strings for comparison (flexible → YYYY-MM-DD when parseable). */
export function normalizeItineraryDate(date: string): string {
  const trimmed = date.trim();
  if (!trimmed) return '';

  const iso = trimmed.match(/^(\d{4}-\d{2}-\d{2})/);
  if (iso?.[1]) return iso[1];

  const parsed = new Date(trimmed);
  if (!Number.isNaN(parsed.getTime())) {
    return formatCohortDate(parsed);
  }

  return trimmed.toLowerCase().replace(/\s+/g, ' ');
}

export function destinationLegKey(leg: ItineraryLeg): string | null {
  if (!itineraryLegHasData(leg)) return null;
  const date = normalizeItineraryDate(leg.date);
  const time = normalizeItineraryTime(leg.time);
  if (!date && !time) return null;
  return `${date}|${time}`;
}

function formatLegForMessage(leg: ItineraryLeg): string {
  const parts = [leg.date.trim(), leg.time.trim()].filter(Boolean);
  return parts.join(' ') || '—';
}

/**
 * Build a map of volunteer id → mismatch flags for anyone whose destination
 * arrival or departure datetime differs from a peer with the same confirmed dates.
 */
export function flagItineraryMismatches(
  volunteers: Volunteer[],
): Map<string, ItineraryMismatchFlag> {
  const flags = new Map<string, ItineraryMismatchFlag>();

  const withItinerary = volunteers.filter(
    (volunteer) =>
      volunteer.itinerary && itineraryHasData(volunteer.itinerary),
  );

  const cohorts = new Map<string, Volunteer[]>();
  for (const volunteer of withItinerary) {
    const key = confirmedDateCohortKey(volunteer);
    if (!key) continue;
    const list = cohorts.get(key) ?? [];
    list.push(volunteer);
    cohorts.set(key, list);
  }

  for (const cohort of cohorts.values()) {
    if (cohort.length < 2) continue;

    const arrivalKeys = new Map<string, string[]>();
    const departureKeys = new Map<string, string[]>();

    for (const volunteer of cohort) {
      const itinerary = volunteer.itinerary as VolunteerItinerary;
      const arrivalKey = destinationLegKey(itinerary.arrival);
      const departureKey = destinationLegKey(itinerary.departure);
      if (arrivalKey) {
        const ids = arrivalKeys.get(arrivalKey) ?? [];
        ids.push(volunteer.id);
        arrivalKeys.set(arrivalKey, ids);
      }
      if (departureKey) {
        const ids = departureKeys.get(departureKey) ?? [];
        ids.push(volunteer.id);
        departureKeys.set(departureKey, ids);
      }
    }

    const arrivalConflicts = arrivalKeys.size > 1;
    const departureConflicts = departureKeys.size > 1;
    if (!arrivalConflicts && !departureConflicts) continue;

    for (const volunteer of cohort) {
      const itinerary = volunteer.itinerary as VolunteerItinerary;
      const arrivalKey = destinationLegKey(itinerary.arrival);
      const departureKey = destinationLegKey(itinerary.departure);

      let arrivalConflict = false;
      let departureConflict = false;

      if (arrivalConflicts && arrivalKey) {
        // Conflict if this value is not the sole unique value (i.e. peers differ).
        arrivalConflict = true;
      }
      if (departureConflicts && departureKey) {
        departureConflict = true;
      }

      if (!arrivalConflict && !departureConflict) continue;

      const peerParts: string[] = [];
      if (arrivalConflict) {
        const others = cohort
          .filter((peer) => peer.id !== volunteer.id)
          .map((peer) => peer.itinerary?.arrival)
          .filter((leg): leg is ItineraryLeg => Boolean(leg && itineraryLegHasData(leg)))
          .map(formatLegForMessage);
        const unique = [...new Set(others)];
        if (unique.length > 0) {
          peerParts.push(
            `arrival ${formatLegForMessage(itinerary.arrival)} vs ${unique.join(', ')}`,
          );
        }
      }
      if (departureConflict) {
        const others = cohort
          .filter((peer) => peer.id !== volunteer.id)
          .map((peer) => peer.itinerary?.departure)
          .filter((leg): leg is ItineraryLeg => Boolean(leg && itineraryLegHasData(leg)))
          .map(formatLegForMessage);
        const unique = [...new Set(others)];
        if (unique.length > 0) {
          peerParts.push(
            `departure ${formatLegForMessage(itinerary.departure)} vs ${unique.join(', ')}`,
          );
        }
      }

      flags.set(volunteer.id, {
        arrivalConflict,
        departureConflict,
        message:
          peerParts.length > 0
            ? `Same confirmed dates, different destination flights: ${peerParts.join('; ')}`
            : 'Same confirmed dates, different destination flights',
      });
    }
  }

  return flags;
}
