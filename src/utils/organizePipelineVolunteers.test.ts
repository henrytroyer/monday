import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { Volunteer } from '../types/volunteer';
import { organizePipelineVolunteers } from './organizePipelineVolunteers';

function volunteer(
  partial: Pick<Volunteer, 'id' | 'name' | 'location'> & Partial<Volunteer>,
): Volunteer {
  return {
    locationPreference: 'Other',
    status: 'Approved',
    timelineId: 't1',
    ...partial,
  };
}

describe('organizePipelineVolunteers', () => {
  it('groups by location', () => {
    const groups = organizePipelineVolunteers(
      [
        volunteer({ id: '1', name: 'Zoe', location: 'Lesvos' }),
        volunteer({ id: '2', name: 'Amy', location: 'Athens' }),
      ],
      'location',
    );
    assert.deepEqual(
      groups.map((g) => g.label),
      ['Athens', 'Lesvos'],
    );
  });

  it('sorts by confirmed dates (term start)', () => {
    const groups = organizePipelineVolunteers(
      [
        volunteer({
          id: '1',
          name: 'Late',
          location: 'Lesvos',
          termStart: '2026-07-01',
        }),
        volunteer({
          id: '2',
          name: 'Early',
          location: 'Athens',
          termStart: '2026-06-01',
        }),
      ],
      'confirmed-dates',
    );
    assert.equal(groups[0]?.label, '');
    assert.deepEqual(
      groups[0]!.volunteers.map((v) => v.name),
      ['Early', 'Late'],
    );
  });

  it('sorts by application date newest first', () => {
    const groups = organizePipelineVolunteers(
      [
        volunteer({
          id: '1',
          name: 'Older',
          location: 'Lesvos',
          itemCreatedAt: '2026-01-01T00:00:00Z',
        }),
        volunteer({
          id: '2',
          name: 'Newer',
          location: 'Athens',
          itemCreatedAt: '2026-03-01T00:00:00Z',
        }),
      ],
      'application-date',
    );
    assert.deepEqual(
      groups[0]!.volunteers.map((v) => v.name),
      ['Newer', 'Older'],
    );
  });
});
