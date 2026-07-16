import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { Volunteer } from '../types/volunteer';
import { resolveTermProgressSnapshot } from './termProgress';
import { resolveVolunteerTermDateRange } from './volunteerTerm';

function baseVolunteer(overrides: Partial<Volunteer> = {}): Volunteer {
  return {
    id: 'test-1',
    name: 'Test Volunteer',
    locationPreference: 'Lesvos',
    location: 'Lesvos',
    status: 'Active',
    timelineId: 'unknown',
    ...overrides,
  };
}

describe('resolveVolunteerTermDateRange', () => {
  it('uses signup timeline catalog when timelineId is known', () => {
    const range = resolveVolunteerTermDateRange(
      baseVolunteer({ timelineId: 'summer-2026-a' }),
    );
    assert.ok(range);
    assert.equal(range.start.toISOString().slice(0, 10), '2026-06-08');
    assert.equal(range.end.toISOString().slice(0, 10), '2026-07-19');
  });

  it('parses date ranges embedded in confirmed timeline labels', () => {
    const range = resolveVolunteerTermDateRange(
      baseVolunteer({
        timelineId: 'raw:Summer 2026 — Team A (Jun 8 – Jul 19)',
        preferredDates: 'Summer 2026 — Team A (Jun 8 – Jul 19)',
      }),
    );
    assert.ok(range);
    assert.equal(range.start.toISOString().slice(0, 10), '2026-06-08');
    assert.equal(range.end.toISOString().slice(0, 10), '2026-07-19');
  });

  it('uses arrival and departure columns when present', () => {
    const range = resolveVolunteerTermDateRange(
      baseVolunteer({
        termStart: '2026-09-15',
        termEnd: '2026-11-01',
      }),
    );
    assert.ok(range);
    assert.equal(range.start.toISOString().slice(0, 10), '2026-09-15');
    assert.equal(range.end.toISOString().slice(0, 10), '2026-11-01');
  });
});

describe('resolveTermProgressSnapshot', () => {
  it('builds an active snapshot from confirmed timeline dates', () => {
    const snapshot = resolveTermProgressSnapshot(
      baseVolunteer({ timelineId: 'summer-2026-a' }),
      new Date('2026-06-20T12:00:00'),
    );
    assert.ok(snapshot);
    assert.equal(snapshot.phase, 'active');
    assert.equal(snapshot.startLabel, 'June 8, 2026');
    assert.equal(snapshot.endLabel, 'July 19, 2026');
    assert.match(snapshot.statusLabel, /Day \d+ of \d+/);
  });
});
