import { columnMap } from '../config/columnMap';
import type { ItineraryLeg, VolunteerItinerary } from '../types/itinerary';
import { emptyItinerary, emptyItineraryLeg } from '../types/itinerary';
import {
  getArrivalDepartureTimelineRange,
  getMappedColumnDateText,
  getMappedColumnText,
} from './mondayTimelineColumn';
import type { MondayColumnValue } from './mondayTimelineColumn';

function legFromParts(
  date: string,
  time: string,
  airport: string,
  flightNumber?: string,
): ItineraryLeg {
  const leg: ItineraryLeg = {
    date: date.trim(),
    time: time.trim(),
    airport: airport.trim(),
  };
  const flight = flightNumber?.trim();
  if (flight) leg.flightNumber = flight;
  return leg;
}

function parseLegFromObject(
  raw: Record<string, unknown> | undefined,
): ItineraryLeg | null {
  if (!raw || typeof raw !== 'object') return null;
  const date = String(raw.date ?? raw.Date ?? '').trim();
  const time = String(raw.time ?? raw.Time ?? '').trim();
  const airport = String(
    raw.airport ?? raw.Airport ?? raw.airportCode ?? '',
  ).trim();
  const flightNumber = String(
    raw.flightNumber ?? raw.flight ?? raw.FlightNumber ?? '',
  ).trim();
  if (!date && !time && !airport) return null;
  return legFromParts(date, time, airport, flightNumber || undefined);
}

function parseItineraryJson(text: string): VolunteerItinerary | null {
  try {
    const data = JSON.parse(text) as Record<string, unknown>;
    const arrival = parseLegFromObject(
      (data.arrival ?? data.Arrival) as Record<string, unknown> | undefined,
    );
    const departure = parseLegFromObject(
      (data.departure ?? data.Departure) as Record<string, unknown> | undefined,
    );
    if (!arrival && !departure) return null;
    const result = emptyItinerary();
    if (arrival) result.arrival = arrival;
    if (departure) result.departure = departure;
    return result;
  } catch {
    return null;
  }
}

function parseLabeledLine(
  text: string,
  label: string,
): ItineraryLeg | null {
  const pattern = new RegExp(
    `${label}\\s*[:\\-]\\s*(.+)$`,
    'im',
  );
  const match = text.match(pattern);
  if (!match?.[1]) return null;
  return parseLegLine(match[1].trim());
}

/** e.g. "June 8, 2026 at 2:30 PM — ATH" or "2026-06-08 14:30 ATH" */
function parseLegLine(line: string): ItineraryLeg {
  const atSplit = line.split(/\s+at\s+/i);
  if (atSplit.length >= 2) {
    const tail = atSplit.slice(1).join(' at ');
    const airportMatch = tail.match(
      /(?:—|–|-)\s*([A-Za-z0-9\s().]+)$|([A-Z]{3,4})\s*$/,
    );
    let time = tail;
    let airport = '';
    if (airportMatch) {
      airport = (airportMatch[1] ?? airportMatch[2] ?? '').trim();
      time = tail
        .replace(/(?:—|–|-)\s*[A-Za-z0-9\s().]+$/, '')
        .replace(/\s+[A-Z]{3,4}\s*$/, '')
        .trim();
    }
    return legFromParts(atSplit[0].trim(), time, airport);
  }

  const dashSplit = line.split(/\s*(?:—|–)\s*/);
  if (dashSplit.length >= 2) {
    const left = dashSplit[0].trim();
    const airport = dashSplit[dashSplit.length - 1].trim();
    const timeMatch = left.match(
      /(\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM)?)\s*$/i,
    );
    if (timeMatch) {
      const date = left.slice(0, timeMatch.index).trim();
      return legFromParts(date, timeMatch[1].trim(), airport);
    }
    return legFromParts(left, '', airport);
  }

  const tokens = line.trim().split(/\s+/);
  const last = tokens[tokens.length - 1] ?? '';
  if (/^[A-Z]{3,4}$/.test(last) && tokens.length > 1) {
    return legFromParts(
      tokens.slice(0, -1).join(' '),
      '',
      last,
    );
  }

  return legFromParts(line, '', '');
}

const INTELE_TRAVEL_LEG_PATTERN =
  /(Arrive|Depart)\s+([A-Za-z]+\s+\d{1,2},\s+\d{4})\s+(\d{1,2}:\d{2}\s+(?:AM|PM))[^\n]*?\b([A-Z]{3})\b/gi;

export type InteleTravelLegEntry = {
  kind: 'arrive' | 'depart';
  leg: ItineraryLeg;
  /** Character offset of this match in the source text. */
  index: number;
};

export type AssembleDestinationOptions = {
  /** Field / destination IATA from confirmed location (e.g. MJT for Lesvos). */
  fieldAirport?: string;
};

function normalizeFlightNumber(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ').toUpperCase();
}

/** Pull a flight number from text near an Arrive/Depart match. */
export function extractFlightNumberNear(
  text: string,
  matchIndex: number,
  matchLength: number,
): string | undefined {
  const windowStart = Math.max(0, matchIndex - 40);
  const windowEnd = Math.min(text.length, matchIndex + matchLength + 160);
  const window = text.slice(windowStart, windowEnd);

  const labeled = window.match(/\bFlight\s*([A-Z]{1,3}\s*\d{2,4})\b/i);
  if (labeled?.[1]) return normalizeFlightNumber(labeled[1]);

  const airlineDigit = window.match(/\b([A-Z]{2}\s?\d{2,4})\b/);
  if (airlineDigit?.[1]) return normalizeFlightNumber(airlineDigit[1]);

  const letterDigit = window.match(/\b([A-Z]\d\s?\d{2,4})\b/);
  if (letterDigit?.[1]) return normalizeFlightNumber(letterDigit[1]);

  return undefined;
}

function legFromInteleTravelMatch(
  match: RegExpExecArray,
  sourceText: string,
): ItineraryLeg {
  const flightNumber = extractFlightNumberNear(
    sourceText,
    match.index,
    match[0].length,
  );
  return legFromParts(match[2], match[3], match[4], flightNumber);
}

/** Extract every Arrive/Depart leg from InteleTravel-style receipt text. */
export function extractAllInteleTravelLegs(text: string): InteleTravelLegEntry[] {
  const legs: InteleTravelLegEntry[] = [];
  let match: RegExpExecArray | null;
  const pattern = new RegExp(
    INTELE_TRAVEL_LEG_PATTERN.source,
    INTELE_TRAVEL_LEG_PATTERN.flags,
  );
  while ((match = pattern.exec(text)) !== null) {
    legs.push({
      kind: match[1].toLowerCase() === 'arrive' ? 'arrive' : 'depart',
      leg: legFromInteleTravelMatch(match, text),
      index: match.index,
    });
  }
  return legs;
}

/** Pull a 3-letter IATA code from airport text (e.g. "Athens (ATH)"). */
export function extractIataCode(airportText: string): string | undefined {
  const trimmed = airportText.trim();
  if (!trimmed) return undefined;
  const paren = trimmed.match(/\b([A-Z]{3})\b/);
  if (paren?.[1]) return paren[1];
  if (/^[A-Z]{3}$/.test(trimmed)) return trimmed;
  return undefined;
}

/** Parse leg date+time to epoch ms for chronological sorting / stay length. */
export function parseLegTimestamp(leg: ItineraryLeg): number | null {
  const date = leg.date.trim();
  const time = leg.time.trim();
  if (!date) return null;

  if (time) {
    const combined = Date.parse(`${date} ${time}`);
    if (!Number.isNaN(combined)) return combined;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    const iso = Date.parse(`${date}T12:00:00`);
    return Number.isNaN(iso) ? null : iso;
  }

  const dateOnly = Date.parse(date);
  return Number.isNaN(dateOnly) ? null : dateOnly;
}

function sortLegsChronologically(
  legs: InteleTravelLegEntry[],
): InteleTravelLegEntry[] {
  return [...legs].sort((a, b) => {
    const aMs = parseLegTimestamp(a.leg);
    const bMs = parseLegTimestamp(b.leg);
    if (aMs != null && bMs != null && aMs !== bMs) return aMs - bMs;
    if (aMs != null && bMs == null) return -1;
    if (aMs == null && bMs != null) return 1;
    return a.index - b.index;
  });
}

type FieldStay = {
  airport: string;
  arrival: InteleTravelLegEntry;
  departure: InteleTravelLegEntry;
  durationMs: number;
};

/** Pair each Arrive with the next later Depart at the same IATA. */
export function findAirportStays(legs: InteleTravelLegEntry[]): FieldStay[] {
  const sorted = sortLegsChronologically(legs);
  const stays: FieldStay[] = [];

  for (let i = 0; i < sorted.length; i++) {
    const arrive = sorted[i]!;
    if (arrive.kind !== 'arrive') continue;
    const iata = extractIataCode(arrive.leg.airport);
    if (!iata) continue;

    const arriveMs = parseLegTimestamp(arrive.leg);
    if (arriveMs == null) continue;

    for (let j = i + 1; j < sorted.length; j++) {
      const depart = sorted[j]!;
      if (depart.kind !== 'depart') continue;
      if (extractIataCode(depart.leg.airport) !== iata) continue;

      const departMs = parseLegTimestamp(depart.leg);
      if (departMs == null || departMs <= arriveMs) continue;

      stays.push({
        airport: iata,
        arrival: arrive,
        departure: depart,
        durationMs: departMs - arriveMs,
      });
      break;
    }
  }

  return stays;
}

function pickLongestStay(stays: FieldStay[]): FieldStay | null {
  if (stays.length === 0) return null;
  return stays.reduce((best, stay) =>
    stay.durationMs > best.durationMs ? stay : best,
  );
}

/** Ignore connection layovers when picking longest on-field stay. */
const MIN_FIELD_STAY_MS = 6 * 60 * 60 * 1000;

function itineraryFromStay(stay: FieldStay): VolunteerItinerary {
  const result = emptyItinerary();
  result.arrival = { ...stay.arrival.leg };
  result.departure = { ...stay.departure.leg };
  return result;
}

/**
 * When a confirmed field airport appears in the PDF but there is no paired
 * return (outbound-only receipt), use Arrive/Depart at that airport
 * independently — never fall back to a connection layover elsewhere.
 */
function itineraryFromFieldAirportLegs(
  legs: InteleTravelLegEntry[],
  fieldIata: string,
): VolunteerItinerary | null {
  const sorted = sortLegsChronologically(legs);
  const fieldArrivals = sorted.filter(
    (entry) =>
      entry.kind === 'arrive' &&
      extractIataCode(entry.leg.airport) === fieldIata,
  );
  const fieldDepartures = sorted.filter(
    (entry) =>
      entry.kind === 'depart' &&
      extractIataCode(entry.leg.airport) === fieldIata,
  );

  // Last arrival into the field; first departure leaving the field.
  const arrival = fieldArrivals.at(-1)?.leg;
  const departure = fieldDepartures[0]?.leg;
  if (!arrival && !departure) return null;

  const result = emptyItinerary();
  if (arrival) result.arrival = { ...arrival };
  if (departure) result.departure = { ...departure };
  return result;
}

/**
 * Pick destination arrival/departure using longest on-field stay.
 * When fieldAirport is set and appears in legs, prefer that airport
 * (stay pair, or outbound-only / inbound-only legs).
 */
export function pickDestinationFromLegs(
  legs: InteleTravelLegEntry[],
  options?: { fieldAirport?: string; preferredAirport?: string },
): VolunteerItinerary | null {
  if (legs.length === 0) return null;

  const fieldIata =
    extractIataCode(options?.fieldAirport ?? '') ??
    extractIataCode(options?.preferredAirport ?? '');

  const stays = findAirportStays(legs);

  if (fieldIata) {
    const fieldStay = pickLongestStay(
      stays.filter((stay) => stay.airport === fieldIata),
    );
    if (fieldStay) return itineraryFromStay(fieldStay);

    const fromFieldLegs = itineraryFromFieldAirportLegs(legs, fieldIata);
    if (fromFieldLegs) return fromFieldLegs;
  }

  const longStays = stays.filter(
    (stay) => stay.durationMs >= MIN_FIELD_STAY_MS,
  );
  const chosen = pickLongestStay(longStays);
  if (chosen) return itineraryFromStay(chosen);

  // No real field stay — prefer final Arrive (destination), do not invent a
  // Depart from an outbound first-leg airport or a short connection.
  const sorted = sortLegsChronologically(legs);
  const arrival = [...sorted].reverse().find((entry) => entry.kind === 'arrive')
    ?.leg;

  if (!arrival) return null;

  const result = emptyItinerary();
  result.arrival = { ...arrival };
  return result;
}

/** Parse InteleTravel / airline traveler receipt PDFs (e.g. Gloria Hershberger). */
export function parseInteleTravelReceiptText(
  text: string,
  fieldAirport?: string,
): VolunteerItinerary | null {
  if (!/traveler\s+receipt|inteletravel|booking information/i.test(text)) {
    return null;
  }

  const legs = extractAllInteleTravelLegs(text);
  if (legs.length === 0) return null;

  return pickDestinationFromLegs(legs, { fieldAirport });
}

/**
 * Assemble destination arrival/departure from one or more itinerary texts
 * (e.g. international + domestic field PDFs). Uses longest field stay.
 */
export function assembleDestinationItinerary(
  texts: string[],
  options?: string | AssembleDestinationOptions,
): VolunteerItinerary | null {
  const nonEmpty = texts.map((t) => t.trim()).filter(Boolean);
  if (nonEmpty.length === 0) return null;

  const fieldAirport =
    typeof options === 'string' ? options : options?.fieldAirport;

  const combined = nonEmpty.join('\n\n');
  const allLegs = extractAllInteleTravelLegs(combined);
  if (allLegs.length > 0) {
    const fromLegs = pickDestinationFromLegs(allLegs, { fieldAirport });
    if (fromLegs) return fromLegs;
  }

  const fromReceipt = parseInteleTravelReceiptText(combined, fieldAirport);
  if (fromReceipt) return fromReceipt;

  let merged: VolunteerItinerary | null = null;
  for (const text of nonEmpty) {
    const parsed = parseItineraryFreeText(text);
    if (!parsed) continue;
    merged = merged ? mergeVolunteerItinerary(merged, parsed) : parsed;
  }
  return merged;
}

export function parseItineraryFreeText(text: string): VolunteerItinerary | null {
  const trimmed = text.trim();
  if (!trimmed) return null;

  const fromReceipt = parseInteleTravelReceiptText(trimmed);
  if (fromReceipt) return fromReceipt;

  const fromJson = parseItineraryJson(trimmed);
  if (fromJson) return fromJson;

  const result = emptyItinerary();
  const arrival =
    parseLabeledLine(trimmed, 'Arrival') ??
    parseLabeledLine(trimmed, 'Arrive');
  const departure =
    parseLabeledLine(trimmed, 'Departure') ??
    parseLabeledLine(trimmed, 'Depart');

  if (arrival) result.arrival = arrival;
  if (departure) result.departure = departure;
  if (arrival || departure) return result;

  const lines = trimmed
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length >= 1) {
    result.arrival = parseLegLine(lines[0]);
  }
  if (lines.length >= 2) {
    result.departure = parseLegLine(lines[1]);
  }
  if (lines.length >= 1) return result;

  return null;
}

function readLegColumns(
  columnValues: MondayColumnValue[],
  dateKey: keyof typeof columnMap,
  timeKey: keyof typeof columnMap,
  airportKey: keyof typeof columnMap,
): ItineraryLeg | null {
  const date = getMappedColumnDateText(columnValues, dateKey);
  const time = getMappedColumnText(columnValues, timeKey);
  const airport = getMappedColumnText(columnValues, airportKey);
  if (!date && !time && !airport) return null;
  return legFromParts(date, time, airport);
}

function mergeLegFields(
  ...sources: Array<ItineraryLeg | null | undefined>
): ItineraryLeg {
  const result = emptyItineraryLeg();
  for (const source of sources) {
    if (!source) continue;
    if (!result.date.trim() && source.date.trim()) {
      result.date = source.date.trim();
    }
    if (!result.time.trim() && source.time.trim()) {
      result.time = source.time.trim();
    }
    if (!result.airport.trim() && source.airport.trim()) {
      result.airport = source.airport.trim();
    }
    if (!result.flightNumber?.trim() && source.flightNumber?.trim()) {
      result.flightNumber = source.flightNumber.trim();
    }
  }
  return result;
}

export function mergeVolunteerItinerary(
  ...sources: Array<VolunteerItinerary | null | undefined>
): VolunteerItinerary {
  return {
    arrival: mergeLegFields(...sources.map((source) => source?.arrival)),
    departure: mergeLegFields(...sources.map((source) => source?.departure)),
  };
}

function itineraryFromTimelineColumn(
  columnValues: MondayColumnValue[],
): VolunteerItinerary | null {
  const range = getArrivalDepartureTimelineRange(columnValues);
  if (!range) return null;

  // Dates only — never use Preferred nearby airport as flight info.
  // Destination airports come from uploaded itinerary PDFs.
  const result = emptyItinerary();
  result.arrival = legFromParts(range.from, '', '');
  result.departure = legFromParts(range.to, '', '');
  return result;
}

export function parseItineraryFromColumns(
  columnValues: MondayColumnValue[],
): VolunteerItinerary {
  const arrivalCols = readLegColumns(
    columnValues,
    'arrivalDate',
    'arrivalTime',
    'arrivalAirport',
  );
  const departureCols = readLegColumns(
    columnValues,
    'departureDate',
    'departureTime',
    'departureAirport',
  );

  const fromTimeline = itineraryFromTimelineColumn(columnValues);

  const itineraryText = getMappedColumnText(columnValues, 'itinerary');
  const fromItineraryText = itineraryText
    ? parseItineraryFreeText(itineraryText)
    : null;

  const legacyArrival = getMappedColumnText(columnValues, 'arrival');
  const legacyArrivalLeg = legacyArrival ? parseLegLine(legacyArrival) : null;

  return {
    arrival: mergeLegFields(
      arrivalCols,
      fromTimeline?.arrival,
      fromItineraryText?.arrival,
      legacyArrivalLeg,
    ),
    departure: mergeLegFields(
      departureCols,
      fromTimeline?.departure,
      fromItineraryText?.departure,
    ),
  };
}

export { mergeLegFields };
