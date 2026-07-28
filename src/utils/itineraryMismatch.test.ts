import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { Volunteer } from '../types/volunteer';
import {
  confirmedDateCohortKey,
  destinationLegKey,
  flagItineraryMismatches,
  normalizeItineraryTime,
} from './itineraryMismatch';

function volunteer(partial: Partial<Volunteer> & Pick<Volunteer, 'id' | 'name'>): Volunteer {
  return {
    locationPreference: 'Lesvos',
    location: 'Lesvos',
    status: 'Active',
    timelineId: 'summer-2026-a',
    ...partial,
  };
}

describe('normalizeItineraryTime', () => {
  it('normalizes padded and unpadded 12-hour times', () => {
    assert.equal(normalizeItineraryTime('1:25 PM'), normalizeItineraryTime('01:25 PM'));
    assert.equal(normalizeItineraryTime('12:10 PM'), '12:10:00');
    assert.equal(normalizeItineraryTime('12:10 AM'), '00:10:00');
  });
});

describe('destinationLegKey', () => {
  it('keys on normalized date and time', () => {
    assert.equal(
      destinationLegKey({ date: 'Jun 01, 2026', time: '1:25 PM', airport: 'ATH' }),
      destinationLegKey({ date: 'June 1, 2026', time: '01:25 PM', airport: 'MJT' }),
    );
  });
});

describe('flagItineraryMismatches', () => {
  it('flags peers with the same confirmed dates but different destination times', () => {
    const a = volunteer({
      id: 'a',
      name: 'Ashlyn',
      termStart: '2026-06-01',
      termEnd: '2026-08-22',
      itinerary: {
        arrival: { date: 'Jun 01, 2026', time: '01:25 PM', airport: 'ATH' },
        departure: { date: 'Aug 22, 2026', time: '12:10 PM', airport: 'ATH' },
      },
    });
    const b = volunteer({
      id: 'b',
      name: 'Blake',
      termStart: '2026-06-01',
      termEnd: '2026-08-22',
      itinerary: {
        arrival: { date: 'Jun 01, 2026', time: '03:40 PM', airport: 'ATH' },
        departure: { date: 'Aug 22, 2026', time: '12:10 PM', airport: 'ATH' },
      },
    });

    assert.equal(confirmedDateCohortKey(a), confirmedDateCohortKey(b));

    const flags = flagItineraryMismatches([a, b]);
    assert.equal(flags.get('a')?.arrivalConflict, true);
    assert.equal(flags.get('b')?.arrivalConflict, true);
    assert.equal(flags.get('a')?.departureConflict, false);
    assert.match(flags.get('a')?.message ?? '', /arrival/i);
  });

  it('does not flag matching destination datetimes', () => {
    const a = volunteer({
      id: 'a',
      name: 'Ashlyn',
      termStart: '2026-06-01',
      termEnd: '2026-08-22',
      itinerary: {
        arrival: { date: 'Jun 01, 2026', time: '01:25 PM', airport: 'ATH' },
        departure: { date: 'Aug 22, 2026', time: '12:10 PM', airport: 'ATH' },
      },
    });
    const b = volunteer({
      id: 'b',
      name: 'Blake',
      termStart: '2026-06-01',
      termEnd: '2026-08-22',
      itinerary: {
        arrival: { date: 'June 1, 2026', time: '1:25 PM', airport: 'MJT' },
        departure: { date: 'Aug 22, 2026', time: '12:10 PM', airport: 'MJT' },
      },
    });

    const flags = flagItineraryMismatches([a, b]);
    assert.equal(flags.size, 0);
  });

  it('does not flag different confirmed date ranges', () => {
    const a = volunteer({
      id: 'a',
      name: 'Ashlyn',
      termStart: '2026-06-01',
      termEnd: '2026-08-22',
      itinerary: {
        arrival: { date: 'Jun 01, 2026', time: '01:25 PM', airport: 'ATH' },
        departure: { date: 'Aug 22, 2026', time: '12:10 PM', airport: 'ATH' },
      },
    });
    const b = volunteer({
      id: 'b',
      name: 'Blake',
      termStart: '2026-07-01',
      termEnd: '2026-08-22',
      itinerary: {
        arrival: { date: 'Jul 01, 2026', time: '03:40 PM', airport: 'ATH' },
        departure: { date: 'Aug 22, 2026', time: '12:10 PM', airport: 'ATH' },
      },
    });

    const flags = flagItineraryMismatches([a, b]);
    assert.equal(flags.size, 0);
  });
});
