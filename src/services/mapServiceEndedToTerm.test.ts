import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseServiceEndedTermRange } from './mapServiceEndedToTerm.ts';

describe('parseServiceEndedTermRange', () => {
  it('reads full ISO dates from Monday timeline JSON (not year/month fragments)', () => {
    const range = parseServiceEndedTermRange([
      {
        id: 'timerange',
        type: 'timeline',
        text: '2026-06-16 - 2026-09-07',
        value: JSON.stringify({
          from: '2026-06-16',
          to: '2026-09-07',
        }),
        column: { title: 'Arrival/Departure Date' },
      },
    ]);

    assert.deepEqual(range, {
      termStart: '2026-06-16',
      termEnd: '2026-09-07',
    });
  });

  it('parses ISO text without treating inner hyphens as separators', () => {
    const range = parseServiceEndedTermRange([
      {
        id: 'timerange',
        type: 'timeline',
        text: '2024-12-21 - 2025-02-22',
        value: null,
        column: { title: 'Arrival/Departure Date' },
      },
    ]);

    assert.deepEqual(range, {
      termStart: '2024-12-21',
      termEnd: '2025-02-22',
    });
  });
});
