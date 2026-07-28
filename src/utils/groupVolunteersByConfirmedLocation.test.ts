import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { Volunteer } from '../types/volunteer';
import { groupVolunteersByConfirmedLocation } from './groupVolunteersByConfirmedLocation';

function volunteer(
  partial: Pick<Volunteer, 'id' | 'name' | 'location'> &
    Partial<Volunteer>,
): Volunteer {
  return {
    locationPreference: 'Other',
    status: 'Approved',
    timelineId: 't1',
    ...partial,
  };
}

describe('groupVolunteersByConfirmedLocation', () => {
  it('clusters by confirmed location and sorts locations A–Z', () => {
    const groups = groupVolunteersByConfirmedLocation([
      volunteer({ id: '1', name: 'Zoe', location: 'Lesvos' }),
      volunteer({ id: '2', name: 'Amy', location: 'Athens' }),
      volunteer({ id: '3', name: 'Ben', location: 'Lesvos' }),
      volunteer({ id: '4', name: 'Cal', location: 'Athens' }),
    ]);

    assert.deepEqual(
      groups.map((g) => g.label),
      ['Athens', 'Lesvos'],
    );
    assert.deepEqual(
      groups[0]!.volunteers.map((v) => v.name),
      ['Amy', 'Cal'],
    );
    assert.deepEqual(
      groups[1]!.volunteers.map((v) => v.name),
      ['Ben', 'Zoe'],
    );
  });

  it('puts unconfirmed locations last', () => {
    const groups = groupVolunteersByConfirmedLocation([
      volunteer({ id: '1', name: 'NoLoc', location: '—' }),
      volunteer({ id: '2', name: 'HasLoc', location: 'Lesvos' }),
      volunteer({ id: '3', name: 'Empty', location: '' }),
    ]);

    assert.equal(groups[0]?.label, 'Lesvos');
    assert.equal(groups[1]?.label, 'Location not confirmed');
    assert.deepEqual(
      groups[1]!.volunteers.map((v) => v.name),
      ['Empty', 'NoLoc'],
    );
  });
});
