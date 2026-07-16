import type { ItineraryLeg } from '../types/itinerary';
import { itineraryLegHasData } from '../types/itinerary';
import { formatDisplayDate } from './formatDateOfBirth';

function formatLegDate(date: string): string {
  const trimmed = date.trim();
  if (!trimmed) return '';
  return formatDisplayDate(trimmed) ?? trimmed;
}

/** Compact single-line summary for a leg (date · time · airport). */
export function formatItineraryLegSummary(leg: ItineraryLeg): string | null {
  if (!itineraryLegHasData(leg)) return null;

  const parts: string[] = [];
  const date = formatLegDate(leg.date);
  if (date) parts.push(date);
  if (leg.time.trim()) parts.push(leg.time.trim());
  if (leg.airport.trim()) parts.push(leg.airport.trim());

  return parts.length > 0 ? parts.join(' · ') : null;
}
