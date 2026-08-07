import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  matchPastorReferenceItemsForContact,
  mergePastorReferenceWithMatches,
  pastorReferenceApplicantNamesMatch,
  type PastorReferenceBoardItem,
} from './matchPastorReferences.ts';

function item(
  id: string,
  name: string,
  columns: PastorReferenceBoardItem['column_values'],
): PastorReferenceBoardItem {
  return { id, name, column_values: columns };
}

describe('matchPastorReferences', () => {
  it('matches by Pas Ref Contact board_relation', () => {
    const matched = matchPastorReferenceItemsForContact(
      [
        item('ref-1', 'Someone Else', [
          {
            id: 'connect_boards4',
            text: '',
            type: 'board_relation',
            value: null,
            linked_item_ids: ['contact-1'],
            column: { title: 'Pas Ref Contact (2.0)' },
          },
        ]),
        item('ref-2', 'Other', []),
      ],
      { contactId: 'contact-1', contactName: 'Jane Doe' },
    );
    assert.deepEqual(
      matched.map((m) => m.id),
      ['ref-1'],
    );
  });

  it('matches by Application board_relation', () => {
    const matched = matchPastorReferenceItemsForContact(
      [
        item('ref-app', 'Volunteer', [
          {
            id: 'link_to_volunteer_service___short_term',
            text: '',
            type: 'board_relation',
            value: null,
            linked_item_ids: ['app-9'],
            column: { title: 'Application' },
          },
        ]),
      ],
      {
        contactId: 'contact-x',
        contactName: 'Volunteer',
        applicationItemIds: ['app-9'],
      },
    );
    assert.equal(matched[0]?.id, 'ref-app');
  });

  it('matches by applicant item name', () => {
    assert.equal(
      pastorReferenceApplicantNamesMatch('Cailey Martin', 'Cailey Martin'),
      true,
    );
    const matched = matchPastorReferenceItemsForContact(
      [item('ref-name', 'Cailey Martin', [])],
      { contactId: 'c1', contactName: 'Cailey Martin' },
    );
    assert.equal(matched[0]?.id, 'ref-name');
  });

  it('fills empty pastor fields and unions linked ids', () => {
    const merged = mergePastorReferenceWithMatches(
      { name: 'Existing Pastor', linkedItemIds: ['already'] },
      [
        item('new-ref', 'Volunteer', [
          {
            id: 'text',
            text: 'Rev. New',
            type: 'text',
            value: null,
            column: { title: 'Person completing reference' },
          },
          {
            id: 'email5',
            text: 'pastor@example.com',
            type: 'email',
            value: null,
            column: {
              title: 'Person completing reference email address',
            },
          },
        ]),
      ],
    );
    assert.equal(merged?.name, 'Existing Pastor');
    assert.equal(merged?.email, 'pastor@example.com');
    assert.deepEqual(merged?.linkedItemIds, ['already', 'new-ref']);
  });
});
