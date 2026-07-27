import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { formatItineraryLegSummary } from './formatItinerary';

describe('formatItineraryLegSummary', () => {
  it('joins date, time, and airport', () => {
    assert.equal(
      formatItineraryLegSummary({
        date: '2026-06-08',
        time: '2:30 PM',
        airport: 'ATH',
      }),
      'June 8, 2026 · 2:30 PM · ATH',
    );
  });
});
