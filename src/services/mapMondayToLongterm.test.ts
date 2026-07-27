import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { MondayBoardItem } from './mapMondayToCrm';
import {
  buildLongtermReferenceSlotsFromColumns,
  mapItemToLongtermVolunteer,
  resolveLongtermPlacement,
  shouldIncludeLongtermItem,
} from './mapMondayToLongterm';

function makeItem(
  overrides: Partial<MondayBoardItem> & Pick<MondayBoardItem, 'id' | 'name'>,
): MondayBoardItem {
  return {
    column_values: [],
    ...overrides,
  };
}

describe('resolveLongtermPlacement', () => {
  it('marks Lesvos Team volunteers as on-field with Lesvos location', () => {
    const item = makeItem({
      id: '1',
      name: 'Alex Volunteer',
      group: { title: 'Lesvos Team' },
      column_values: [
        {
          id: 'status',
          type: 'status',
          text: 'approved',
          column: { title: 'Status' },
        },
      ],
    });

    const placement = resolveLongtermPlacement(item);

    assert.equal(placement.onField, true);
    assert.equal(placement.fieldLocation, 'Lesvos');
    assert.equal(placement.status, 'approved');
  });

  it('maps New Applications group to New status when status column is empty', () => {
    const item = makeItem({
      id: '2',
      name: 'Jordan Applicant',
      group: { title: 'New Applications' },
      column_values: [],
    });

    const placement = resolveLongtermPlacement(item);

    assert.equal(placement.onField, false);
    assert.equal(placement.status, 'New');
  });

  it('normalizes Preparation group to prepartation status label', () => {
    const item = makeItem({
      id: '3',
      name: 'Sam Prep',
      group: { title: 'Preparation' },
      column_values: [
        {
          id: 'status',
          type: 'status',
          text: 'Preparation',
          column: { title: 'Status' },
        },
      ],
    });

    const placement = resolveLongtermPlacement(item);

    assert.equal(placement.onField, false);
    assert.equal(placement.status, 'prepartation');
  });
});

describe('shouldIncludeLongtermItem', () => {
  it('excludes Archive and Term Ended groups', () => {
    assert.equal(
      shouldIncludeLongtermItem(
        makeItem({ id: 'a', name: 'A', group: { title: 'Archive' } }),
      ),
      false,
    );
    assert.equal(
      shouldIncludeLongtermItem(
        makeItem({ id: 'b', name: 'B', group: { title: 'Term Ended' } }),
      ),
      false,
    );
    assert.equal(
      shouldIncludeLongtermItem(
        makeItem({ id: 'c', name: 'C', group: { title: 'Approved' } }),
      ),
      true,
    );
  });
});

describe('mapItemToLongtermVolunteer', () => {
  it('maps location preference and on-field flags from Monday columns', () => {
    const item = makeItem({
      id: '99',
      name: 'Taylor Field',
      group: { title: 'Giessen Team' },
      column_values: [
        {
          id: 'pref',
          type: 'dropdown',
          text: 'Germany',
          column: {
            title: 'Where would you be interested in serving?',
          },
        },
        {
          id: 'loc',
          type: 'text',
          text: 'Giessen',
          column: { title: 'Current Location' },
        },
        {
          id: 'status',
          type: 'status',
          text: 'approved',
          column: { title: 'Status' },
        },
      ],
    });

    const volunteer = mapItemToLongtermVolunteer(item);

    assert.equal(volunteer.id, '99');
    assert.equal(volunteer.name, 'Taylor Field');
    assert.equal(volunteer.locationPreference, 'Germany');
    assert.equal(volunteer.onField, true);
    assert.equal(volunteer.fieldLocation, 'Giessen');
    assert.equal(volunteer.status, 'approved');
  });
});

describe('buildLongtermReferenceSlotsFromColumns', () => {
  it('marks slots with contact info as received', () => {
    const slots = buildLongtermReferenceSlotsFromColumns([
      {
        id: 'friend-name',
        type: 'text',
        text: 'Chris Friend',
        column: { title: 'Reference (Friend)' },
      },
      {
        id: 'friend-email',
        type: 'email',
        text: 'chris@example.com',
        column: { title: 'Reference (Friend)' },
      },
      {
        id: 'pastor-name',
        type: 'text',
        text: 'Rev. Smith',
        column: { title: 'Reference (Pastor)' },
      },
      {
        id: 'pastor-email',
        type: 'email',
        text: 'pastor@church.org',
        column: { title: 'Reference (Pastor)' },
      },
    ]);

    assert.equal(slots[0]?.status, 'received');
    assert.equal(slots[0]?.refereeName, 'Chris Friend');
    assert.equal(slots[0]?.refereeEmail, 'chris@example.com');
    assert.equal(slots[2]?.status, 'received');
    assert.equal(slots[2]?.refereeName, 'Rev. Smith');
    assert.equal(slots[1]?.status, 'pending');
  });
});
