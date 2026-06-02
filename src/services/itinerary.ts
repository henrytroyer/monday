import { columnMap } from '../config/columnMap';
import type { ItineraryLeg, VolunteerItinerary } from '../types/itinerary';
import { emptyItinerary } from '../types/itinerary';
import { getColumnText, type MondayColumnValue } from './mapMondayToCrm';

function legFromParts(
  date: string,
  time: string,
  airport: string,
): ItineraryLeg {
  return {
    date: date.trim(),
    time: time.trim(),
    airport: airport.trim(),
  };
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
  if (!date && !time && !airport) return null;
  return legFromParts(date, time, airport);
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

function parseItineraryFreeText(text: string): VolunteerItinerary | null {
  const trimmed = text.trim();
  if (!trimmed) return null;

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
  const date = getColumnText(columnValues, dateKey);
  const time = getColumnText(columnValues, timeKey);
  const airport = getColumnText(columnValues, airportKey);
  if (!date && !time && !airport) return null;
  return legFromParts(date, time, airport);
}

export function parseItineraryFromColumns(
  columnValues: MondayColumnValue[],
): VolunteerItinerary {
  const fromColumns = emptyItinerary();
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
  if (arrivalCols) fromColumns.arrival = arrivalCols;
  if (departureCols) fromColumns.departure = departureCols;

  if (
    fromColumns.arrival.date ||
    fromColumns.arrival.time ||
    fromColumns.arrival.airport ||
    fromColumns.departure.date ||
    fromColumns.departure.time ||
    fromColumns.departure.airport
  ) {
    return fromColumns;
  }

  const itineraryText = getColumnText(columnValues, 'itinerary');
  if (itineraryText) {
    const parsed = parseItineraryFreeText(itineraryText);
    if (parsed) return parsed;
  }

  const legacyArrival = getColumnText(columnValues, 'arrival');
  if (legacyArrival) {
    fromColumns.arrival = parseLegLine(legacyArrival);
    return fromColumns;
  }

  return emptyItinerary();
}
