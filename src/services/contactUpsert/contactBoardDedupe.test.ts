import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { ContactListItem } from '../../types/contact';
import {
  combineEmails,
  findConnectedVolunteers,
  findEmailDuplicateGroups,
  pickParentSource,
  pickPastorSource,
  pickRichestName,
  pickSurvivor,
  previewMergeContacts,
} from './contactBoardDedupe';

function contact(
  partial: Partial<ContactListItem> & Pick<ContactListItem, 'id' | 'name'>,
): ContactListItem {
  return {
    email: '—',
    tags: [],
    ...partial,
  };
}

describe('contactBoardDedupe', () => {
  it('unions Parents + Pastor tags in merge preview', () => {
    const survivor = contact({
      id: '1',
      name: 'Gary and Becky Wagler',
      email: 'gary@example.com',
      tags: ['parent'],
    });
    const loser = contact({
      id: '2',
      name: 'Gary Wagler',
      email: 'gary.alt@example.com',
      tags: ['pastor'],
    });
    const preview = previewMergeContacts(survivor, [loser]);
    assert.deepEqual(preview.resultingTags.sort(), ['parent', 'pastor']);
    assert.equal(preview.resultingEmail, 'gary@example.com');
    assert.equal(preview.resultingAltEmail, 'gary.alt@example.com');
    assert.equal(preview.resultingName, 'Gary and Becky Wagler');
  });

  it('keeps couple household as survivor over solo pastor duplicate', () => {
    const couple = contact({
      id: '7119657283',
      name: 'Gary and Becky Wagler',
      email: 'garywagler75@gmail.com',
      tags: ['parent'],
      connectedTo: 'Haley Wagler',
      createdAt: '2024-06-02T00:00:00Z',
    });
    const solo = contact({
      id: '7119657242',
      name: 'Gary Wagler',
      email: 'garywagler75@gmail.com',
      altEmail: 'wagler6.bw@gmail.com',
      tags: ['pastor'],
      connectedTo: 'Haley Wagler',
      createdAt: '2024-01-01T00:00:00Z',
    });
    const survivor = pickSurvivor([solo, couple]);
    assert.equal(survivor.id, couple.id);
    assert.equal(pickRichestName([solo, couple]), 'Gary and Becky Wagler');
    assert.equal(pickPastorSource([solo, couple])?.id, solo.id);
    assert.equal(pickParentSource([solo, couple])?.id, couple.id);
  });

  it('previews pastor/parent updates on connected volunteers', () => {
    const couple = contact({
      id: '1',
      name: 'Gary and Becky Wagler',
      email: 'gary@example.com',
      tags: ['parent'],
      connectedTo: 'Haley Wagler',
    });
    const solo = contact({
      id: '2',
      name: 'Gary Wagler',
      email: 'gary.alt@example.com',
      tags: ['pastor'],
      connectedTo: 'Haley Wagler',
    });
    const volunteer = contact({
      id: '3',
      name: 'Haley Wagler',
      email: 'haley@example.com',
      tags: ['volunteer'],
    });
    const preview = previewMergeContacts(couple, [solo], {
      allContacts: [couple, solo, volunteer],
    });
    assert.deepEqual(preview.connectedVolunteerNames, ['Haley Wagler']);
    assert.equal(preview.willUpdatePastor, true);
    assert.equal(preview.willUpdateParents, true);
    assert.equal(
      findConnectedVolunteers([couple, solo], [couple, solo, volunteer])[0]
        ?.id,
      volunteer.id,
    );
  });

  it('keeps both emails via Alt Email', () => {
    const combined = combineEmails(
      contact({
        id: '1',
        name: 'A',
        email: 'a@example.com',
        altEmail: 'old@example.com',
      }),
      [
        contact({
          id: '2',
          name: 'A',
          email: 'b@example.com',
        }),
      ],
    );
    assert.equal(combined.primary, 'a@example.com');
    assert.ok(combined.altEmail?.includes('b@example.com'));
    assert.ok(combined.altEmail?.includes('old@example.com'));
  });

  it('finds email duplicate groups', () => {
    const groups = findEmailDuplicateGroups([
      contact({
        id: '1',
        name: 'Gary and Becky',
        email: 'gary@example.com',
        tags: ['parent'],
      }),
      contact({
        id: '2',
        name: 'Gary',
        email: 'Gary@example.com',
        tags: ['pastor'],
      }),
      contact({
        id: '3',
        name: 'Solo',
        email: 'solo@example.com',
        tags: ['donor'],
      }),
    ]);
    assert.equal(groups.length, 1);
    assert.equal(groups[0]!.contacts.length, 2);
    assert.equal(pickSurvivor(groups[0]!.contacts).id, groups[0]!.suggestedSurvivorId);
    assert.equal(groups[0]!.suggestedSurvivorId, '1');
  });
});
