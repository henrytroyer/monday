import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { MondayColumnValue } from './mondayTimelineColumn';
import { parseItineraryFromColumns, parseInteleTravelReceiptText } from './itinerary';

function column(
  title: string,
  type: string,
  text: string,
  value?: string,
): MondayColumnValue {
  return {
    id: title.toLowerCase().replace(/\W+/g, ''),
    type,
    text,
    value: value ?? JSON.stringify(text),
    column: { title },
  };
}

function timelineColumn(from: string, to: string): MondayColumnValue {
  return {
    id: 'timeline4',
    type: 'timeline',
    text: `${from} - ${to}`,
    value: JSON.stringify({ from, to }),
    column: { title: 'Arrival/Departure Date' },
  };
}

describe('parseItineraryFromColumns', () => {
  it('merges timeline dates with separate arrival and departure time columns', () => {
    const itinerary = parseItineraryFromColumns([
      timelineColumn('2026-06-01', '2026-08-22'),
      column('Arrival Time', 'text', '2:30 PM'),
      column('Departure Time', 'text', '10:15 AM'),
      column(
        'Preferred nearby airport for international departure/arrival',
        'text',
        'BWI',
      ),
    ]);

    assert.equal(itinerary.arrival.date, '2026-06-01');
    assert.equal(itinerary.arrival.time, '2:30 PM');
    assert.equal(itinerary.arrival.airport, 'BWI');
    assert.equal(itinerary.departure.date, '2026-08-22');
    assert.equal(itinerary.departure.time, '10:15 AM');
    assert.equal(itinerary.departure.airport, 'BWI');
  });

  it('merges timeline dates with times from itinerary notes text', () => {
    const itinerary = parseItineraryFromColumns([
      timelineColumn('2026-06-08', '2026-07-19'),
      column(
        'Itinerary Notes',
        'long_text',
        [
          'Arrival: June 8, 2026 at 2:30 PM — Athens (ATH)',
          'Departure: July 19, 2026 at 10:15 AM — Athens (ATH)',
        ].join('\n'),
      ),
    ]);

    assert.equal(itinerary.arrival.date, '2026-06-08');
    assert.equal(itinerary.arrival.time, '2:30 PM');
    assert.equal(itinerary.arrival.airport, 'Athens (ATH)');
    assert.equal(itinerary.departure.date, '2026-07-19');
    assert.equal(itinerary.departure.time, '10:15 AM');
    assert.equal(itinerary.departure.airport, 'Athens (ATH)');
  });

  it('prefers dedicated date columns over timeline dates', () => {
    const itinerary = parseItineraryFromColumns([
      timelineColumn('2026-06-01', '2026-08-22'),
      column('Arrival Date', 'date', '2026-06-10', JSON.stringify({ date: '2026-06-10' })),
      column('Departure Date', 'date', '2026-08-15', JSON.stringify({ date: '2026-08-15' })),
      column('Arrival Time', 'text', '3:00 PM'),
      column('Departure Time', 'text', '8:00 AM'),
    ]);

    assert.equal(itinerary.arrival.date, '2026-06-10');
    assert.equal(itinerary.departure.date, '2026-08-15');
    assert.equal(itinerary.arrival.time, '3:00 PM');
    assert.equal(itinerary.departure.time, '8:00 AM');
  });

  it('reads dedicated columns when no timeline is present', () => {
    const itinerary = parseItineraryFromColumns([
      column('Arrival Date', 'date', '2026-06-08', JSON.stringify({ date: '2026-06-08' })),
      column('Arrival Time', 'text', '2:30 PM'),
      column('Arrival Airport', 'text', 'ATH'),
      column('Departure Date', 'date', '2026-07-19', JSON.stringify({ date: '2026-07-19' })),
      column('Departure Time', 'text', '10:15 AM'),
      column('Departure Airport', 'text', 'ATH'),
    ]);

    assert.equal(itinerary.arrival.date, '2026-06-08');
    assert.equal(itinerary.arrival.time, '2:30 PM');
    assert.equal(itinerary.arrival.airport, 'ATH');
    assert.equal(itinerary.departure.date, '2026-07-19');
    assert.equal(itinerary.departure.time, '10:15 AM');
    assert.equal(itinerary.departure.airport, 'ATH');
  });

  it('parses Gloria Hershberger timeline and preferred airport from live board shape', () => {
    const itinerary = parseItineraryFromColumns([
      timelineColumn('2026-06-01', '2026-08-22'),
      column(
        'Preferred nearby airport for international departure/arrival',
        'text',
        'BWI',
      ),
    ]);

    assert.equal(itinerary.arrival.date, '2026-06-01');
    assert.equal(itinerary.departure.date, '2026-08-22');
    assert.equal(itinerary.arrival.airport, 'BWI');
    assert.equal(itinerary.departure.airport, 'BWI');
  });
});

describe('parseInteleTravelReceiptText', () => {
  const gloriaReceipt = `
Booking Information
Traveler Receipt
Outbound
Depart May 31, 2026 06:40 PM Newark Liberty International Airport EWR
Arrive Jun 01, 2026 01:25 PM Athens Eleftherios Venizelos International Airport ATH
Inbound
Depart Aug 22, 2026 12:10 PM Athens Eleftherios Venizelos International Airport ATH
Arrive Aug 22, 2026 05:57 PM Newark Liberty International Airport EWR
`;

  it('extracts ATH arrival and departure from InteleTravel receipts', () => {
    const itinerary = parseInteleTravelReceiptText(gloriaReceipt);
    assert.ok(itinerary);
    assert.equal(itinerary?.arrival.date, 'Jun 01, 2026');
    assert.equal(itinerary?.arrival.time, '01:25 PM');
    assert.equal(itinerary?.arrival.airport, 'ATH');
    assert.equal(itinerary?.departure.date, 'Aug 22, 2026');
    assert.equal(itinerary?.departure.time, '12:10 PM');
    assert.equal(itinerary?.departure.airport, 'ATH');
  });
});
