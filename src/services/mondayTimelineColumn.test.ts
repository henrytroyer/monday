import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { MondayColumnValue } from './mapMondayToCrm';
import {
  getArrivalDepartureTimelineRange,
  getMappedColumnText,
  parseMondayTimelineColumn,
} from './mondayTimelineColumn';

function timelineColumn(from: string, to: string): MondayColumnValue {
  return {
    id: 'timeline4',
    type: 'timeline',
    text: `${from} - ${to}`,
    value: JSON.stringify({ from, to }),
    column: { title: 'Arrival/Departure Date' },
  };
}

describe('parseMondayTimelineColumn', () => {
  it('reads from and to from JSON value', () => {
    const range = parseMondayTimelineColumn(
      timelineColumn('2026-08-24', '2026-11-14'),
    );
    assert.deepEqual(range, {
      from: '2026-08-24',
      to: '2026-11-14',
    });
  });
});

describe('getArrivalDepartureTimelineRange', () => {
  it('finds the Arrival/Departure Date timeline column', () => {
    const range = getArrivalDepartureTimelineRange([
      timelineColumn('2026-08-24', '2026-11-14'),
    ]);
    assert.equal(range?.from, '2026-08-24');
    assert.equal(range?.to, '2026-11-14');
  });

  it('parses Gloria Hershberger timeline dates', () => {
    const range = getArrivalDepartureTimelineRange([
      timelineColumn('2026-06-01', '2026-08-22'),
    ]);
    assert.equal(range?.from, '2026-06-01');
    assert.equal(range?.to, '2026-08-22');
  });

  it('reads preferred itinerary airport column', () => {
    const airport = getMappedColumnText(
      [
        {
          id: 'text70',
          type: 'text',
          text: 'Hartsfield-Jackson Atlanta International Airport (ATL)',
          value: JSON.stringify(
            'Hartsfield-Jackson Atlanta International Airport (ATL)',
          ),
          column: {
            title:
              'Preferred nearby airport for international departure/arrival',
          },
        },
      ],
      'preferredItineraryAirport',
    );
    assert.match(airport, /ATL/);
  });
});
