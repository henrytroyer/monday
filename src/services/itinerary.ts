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

const INTELE_TRAVEL_LEG_PATTERN =
  /(Arrive|Depart)\s+([A-Za-z]+\s+\d{1,2},\s+\d{4})\s+(\d{1,2}:\d{2}\s+(?:AM|PM))[^\n]*?\b([A-Z]{3})\b/gi;

function legFromInteleTravelMatch(match: RegExpExecArray): ItineraryLeg {
  return legFromParts(match[2], match[3], match[4]);
}

/** Parse InteleTravel / airline traveler receipt PDFs (e.g. Gloria Hershberger). */
export function parseInteleTravelReceiptText(
  text: string,
): VolunteerItinerary | null {
  if (!/traveler\s+receipt|inteletravel|booking information/i.test(text)) {
    return null;
  }

  const legs: Array<{ kind: 'arrive' | 'depart'; leg: ItineraryLeg }> = [];
  let match: RegExpExecArray | null;
  const pattern = new RegExp(
    INTELE_TRAVEL_LEG_PATTERN.source,
    INTELE_TRAVEL_LEG_PATTERN.flags,
  );
  while ((match = pattern.exec(text)) !== null) {
    legs.push({
      kind: match[1].toLowerCase() === 'arrive' ? 'arrive' : 'depart',
      leg: legFromInteleTravelMatch(match),
    });
  }

  if (legs.length === 0) return null;

  const inboundIdx = text.search(/\bInbound\b/i);

  let arrival =
    legs.find((entry) => entry.kind === 'arrive' && entry.leg.airport === 'ATH')
      ?.leg ?? null;
  let departure =
    legs.find((entry) => entry.kind === 'depart' && entry.leg.airport === 'ATH')
      ?.leg ?? null;

  if (!arrival) {
    const outboundArrives =
      inboundIdx >= 0
        ? legs.filter(
            (entry) =>
              entry.kind === 'arrive' &&
              text.indexOf(entry.leg.date) < inboundIdx,
          )
        : legs.filter((entry) => entry.kind === 'arrive');
    arrival = outboundArrives.at(-1)?.leg ?? null;
  }

  if (!departure) {
    const inboundDeparts =
      inboundIdx >= 0
        ? legs.filter(
            (entry) =>
              entry.kind === 'depart' &&
              text.indexOf(entry.leg.date) >= inboundIdx,
          )
        : legs.filter((entry) => entry.kind === 'depart');
    departure =
      inboundDeparts.find((entry) => entry.leg.airport === 'ATH')?.leg ??
      inboundDeparts[0]?.leg ??
      null;
  }

  if (!arrival && !departure) return null;

  const result = emptyItinerary();
  if (arrival) result.arrival = arrival;
  if (departure) result.departure = departure;
  return result;
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

  const preferredAirport = getMappedColumnText(
    columnValues,
    'preferredItineraryAirport',
  );

  const result = emptyItinerary();
  result.arrival = legFromParts(range.from, '', preferredAirport);
  result.departure = legFromParts(range.to, '', preferredAirport);
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
