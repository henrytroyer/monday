import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { MondayColumnValue } from './mondayTimelineColumn';
import {
  assembleDestinationItinerary,
  parseItineraryFromColumns,
  parseInteleTravelReceiptText,
} from './itinerary';

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
    // Preferred airport is never used as flight destination.
    assert.equal(itinerary.arrival.airport, '');
    assert.equal(itinerary.departure.date, '2026-08-22');
    assert.equal(itinerary.departure.time, '10:15 AM');
    assert.equal(itinerary.departure.airport, '');
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

  it('ignores preferred nearby airport on timeline-only rows', () => {
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
    assert.equal(itinerary.arrival.airport, '');
    assert.equal(itinerary.departure.airport, '');
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

  it('extracts destination arrival and departure from InteleTravel receipts', () => {
    const itinerary = parseInteleTravelReceiptText(gloriaReceipt);
    assert.ok(itinerary);
    assert.equal(itinerary?.arrival.date, 'Jun 01, 2026');
    assert.equal(itinerary?.arrival.time, '01:25 PM');
    assert.equal(itinerary?.arrival.airport, 'ATH');
    assert.equal(itinerary?.departure.date, 'Aug 22, 2026');
    assert.equal(itinerary?.departure.time, '12:10 PM');
    assert.equal(itinerary?.departure.airport, 'ATH');
  });

  it('extracts MJT destination legs when that is the field airport', () => {
    const receipt = `
Booking Information
Traveler Receipt
Outbound
Depart May 31, 2026 06:40 PM Newark Liberty International Airport EWR
Arrive Jun 01, 2026 09:10 AM Athens Eleftherios Venizelos International Airport ATH
Depart Jun 01, 2026 11:40 AM Athens Eleftherios Venizelos International Airport ATH
Arrive Jun 01, 2026 12:55 PM Mytilene International Airport MJT
Inbound
Depart Aug 22, 2026 10:05 AM Mytilene International Airport MJT
Arrive Aug 22, 2026 11:20 AM Athens Eleftherios Venizelos International Airport ATH
Depart Aug 22, 2026 02:10 PM Athens Eleftherios Venizelos International Airport ATH
Arrive Aug 22, 2026 05:57 PM Newark Liberty International Airport EWR
`;
    const itinerary = parseInteleTravelReceiptText(receipt);
    assert.ok(itinerary);
    assert.equal(itinerary?.arrival.airport, 'MJT');
    assert.equal(itinerary?.arrival.date, 'Jun 01, 2026');
    assert.equal(itinerary?.arrival.time, '12:55 PM');
    assert.equal(itinerary?.departure.airport, 'MJT');
    assert.equal(itinerary?.departure.date, 'Aug 22, 2026');
    assert.equal(itinerary?.departure.time, '10:05 AM');
  });

  it('extracts FRA destination legs', () => {
    const receipt = `
Booking Information
Traveler Receipt
Outbound
Depart Jul 19, 2026 05:00 PM Chicago O'Hare International Airport ORD
Arrive Jul 20, 2026 09:15 AM Frankfurt Airport FRA
Inbound
Depart Aug 30, 2026 11:40 AM Frankfurt Airport FRA
Arrive Aug 30, 2026 02:20 PM Chicago O'Hare International Airport ORD
`;
    const itinerary = parseInteleTravelReceiptText(receipt);
    assert.ok(itinerary);
    assert.equal(itinerary?.arrival.airport, 'FRA');
    assert.equal(itinerary?.departure.airport, 'FRA');
  });

  it('prefers preferred airport when present in legs', () => {
    const receipt = `
Booking Information
Traveler Receipt
Outbound
Depart May 31, 2026 06:40 PM Newark Liberty International Airport EWR
Arrive Jun 01, 2026 09:10 AM Athens Eleftherios Venizelos International Airport ATH
Depart Jun 01, 2026 11:40 AM Athens Eleftherios Venizelos International Airport ATH
Arrive Jun 01, 2026 12:55 PM Mytilene International Airport MJT
Inbound
Depart Aug 22, 2026 10:05 AM Mytilene International Airport MJT
Arrive Aug 22, 2026 11:20 AM Athens Eleftherios Venizelos International Airport ATH
Depart Aug 22, 2026 02:10 PM Athens Eleftherios Venizelos International Airport ATH
Arrive Aug 22, 2026 05:57 PM Newark Liberty International Airport EWR
`;
    const itinerary = parseInteleTravelReceiptText(receipt, 'MJT');
    assert.ok(itinerary);
    assert.equal(itinerary?.arrival.airport, 'MJT');
    assert.equal(itinerary?.departure.airport, 'MJT');
  });
});

describe('assembleDestinationItinerary', () => {
  it('assembles destination from split outbound and inbound PDFs', () => {
    const outbound = `
Booking Information
Traveler Receipt
Outbound
Depart May 31, 2026 06:40 PM Newark Liberty International Airport EWR
Arrive Jun 01, 2026 01:25 PM Athens Eleftherios Venizelos International Airport ATH
`;
    const inbound = `
Booking Information
Traveler Receipt
Inbound
Depart Aug 22, 2026 12:10 PM Athens Eleftherios Venizelos International Airport ATH
Arrive Aug 22, 2026 05:57 PM Newark Liberty International Airport EWR
`;
    const itinerary = assembleDestinationItinerary([outbound, inbound]);
    assert.ok(itinerary);
    assert.equal(itinerary?.arrival.date, 'Jun 01, 2026');
    assert.equal(itinerary?.arrival.time, '01:25 PM');
    assert.equal(itinerary?.arrival.airport, 'ATH');
    assert.equal(itinerary?.departure.date, 'Aug 22, 2026');
    assert.equal(itinerary?.departure.time, '12:10 PM');
    assert.equal(itinerary?.departure.airport, 'ATH');
  });

  it('Camille-style: international + separate ATH-MJT booking picks MJT via longest stay', () => {
    const international = `
Booking Information
Traveler Receipt
Outbound
Depart May 31, 2026 06:40 PM Newark Liberty International Airport EWR
Arrive May 31, 2026 08:10 PM Montreal Trudeau International Airport YUL
Depart May 31, 2026 09:55 PM Montreal Trudeau International Airport YUL
Arrive Jun 01, 2026 01:25 PM Athens Eleftherios Venizelos International Airport ATH
Inbound
Depart Aug 22, 2026 12:10 PM Athens Eleftherios Venizelos International Airport ATH
Arrive Aug 22, 2026 03:40 PM Toronto Pearson International Airport YYZ
Depart Aug 22, 2026 06:15 PM Toronto Pearson International Airport YYZ
Arrive Aug 22, 2026 08:05 PM Indianapolis International Airport IND
`;
    const domesticField = `
Booking Information
Traveler Receipt
Outbound
Depart Jun 01, 2026 04:30 PM Athens Eleftherios Venizelos International Airport ATH Flight A3 612
Arrive Jun 01, 2026 05:40 PM Mytilene International Airport MJT
Inbound
Depart Aug 22, 2026 09:00 AM Mytilene International Airport MJT Flight A3 613
Arrive Aug 22, 2026 10:10 AM Athens Eleftherios Venizelos International Airport ATH
`;

    const byLongestStay = assembleDestinationItinerary([
      international,
      domesticField,
    ]);
    assert.ok(byLongestStay);
    assert.equal(byLongestStay?.arrival.airport, 'MJT');
    assert.equal(byLongestStay?.arrival.date, 'Jun 01, 2026');
    assert.equal(byLongestStay?.arrival.time, '05:40 PM');
    assert.equal(byLongestStay?.departure.airport, 'MJT');
    assert.equal(byLongestStay?.departure.date, 'Aug 22, 2026');
    assert.equal(byLongestStay?.departure.time, '09:00 AM');

    const withFieldAirport = assembleDestinationItinerary(
      [international, domesticField],
      { fieldAirport: 'MJT' },
    );
    assert.equal(withFieldAirport?.arrival.airport, 'MJT');
    assert.equal(withFieldAirport?.departure.airport, 'MJT');
    assert.equal(withFieldAirport?.arrival.flightNumber, 'A3 612');
    assert.equal(withFieldAirport?.departure.flightNumber, 'A3 613');
  });

  it('Alyssa-style: outbound-only with YUL layover picks ATH arrive, not connection', () => {
    const outboundOnly = `
Emma Troyer
InteleTravel
Booking Information
Trip ID 	1-195-003
Reference 	AEY39Q
Travel Dates 	May 31, 2026 - Jun 01, 2026
Cities 	EWR-YUL-ATH
Travelers
Traveler 1 • Adult
Alyssa Schwartz
Itinerary 	Air Canada • Standard
Outbound 	Total 11hr 45m
Air Canada 8499 • Economy • Class T • 1 Bag Included 	1hr 37m
Depart May 31, 2026 	06:40 PM Newark Liberty International Airport 	Newark, NJ • Terminal A 	EWR
Arrive May 31, 2026 	08:17 PM Montreal-Trudeau International Airport 	Montreal, Canada 	YUL
Airline Reference AEY39Q • Miles 286 • Canadair Regional Jet 900
AC8499 is operated by Air Canada Express -
Jazz
1hr 3m connection
Air Canada 922 • Economy • Class T • 1 Bag Included 	9hr 5m
Depart May 31, 2026 	09:20 PM Montreal-Trudeau International Airport 	Montreal, Canada 	YUL
Arrive Jun 01, 2026 	01:25 PM Athens Eleftherios Venizelos International Airport 	Athens, Greece 	ATH
Airline Reference AEY39Q • Miles 4118 • Boeing 777-300ER
`;

    const itinerary = assembleDestinationItinerary([outboundOnly], {
      fieldAirport: 'ATH',
    });
    assert.ok(itinerary);
    assert.equal(itinerary?.arrival.airport, 'ATH');
    assert.equal(itinerary?.arrival.date, 'Jun 01, 2026');
    assert.equal(itinerary?.arrival.time, '01:25 PM');
    // No return booking in PDF — departure left unset (not YUL layover).
    assert.equal(itinerary?.departure.airport, '');
    assert.equal(itinerary?.departure.date, '');
  });
});
