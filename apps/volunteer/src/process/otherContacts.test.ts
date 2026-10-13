import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { SHORT_TERM_STEP_DEFAULTS } from '../contract/volunteerApi.ts';
import {
  CHURCH_NAME_LABEL,
  EMERGENCY_RELATION_OPTIONS,
  emptyOtherContacts,
  isOtherContactsComplete,
  OTHER_CONTACTS_BANNER,
} from './otherContacts.ts';

function completeDraft(
  overrides: Partial<ReturnType<typeof emptyOtherContacts>> = {},
) {
  return {
    ...emptyOtherContacts(),
    churchName: 'Hope Church',
    pastorName: 'James Smith',
    pastorEmail: 'pastor@example.com',
    pastorPhone: '5551112222',
    parentsNames: 'Frank and Mary',
    parentEmail: 'parents@example.com',
    parentPhone: '5553334444',
    emergencyName: 'Pat Miller',
    emergencyEmail: 'pat@example.com',
    emergencyPhone: '5555556666',
    emergencyRelation: ['Friend'],
    accountableName: 'Frank and Mary',
    accountableEmail: 'accountable@example.com',
    accountablePhone: '5557778888',
    fieldContact: 'no' as const,
    ...overrides,
  };
}

describe('other contacts copy', () => {
  it('renames the ninth process step', () => {
    const ninth = SHORT_TERM_STEP_DEFAULTS[8];
    assert.equal(ninth?.id, 'sent_to_field');
    assert.equal(ninth?.title, 'Other Contacts');
    assert.equal(ninth?.audience, 'volunteer');
  });

  it('includes the labels from the source form', () => {
    assert.equal(OTHER_CONTACTS_BANNER, 'Other Contacts');
    assert.equal(CHURCH_NAME_LABEL, 'Church Name');
    assert.deepEqual(
      [...EMERGENCY_RELATION_OPTIONS],
      ['Friend', 'Other Family Member', 'Parent', 'Sibling', 'Volunteer'],
    );
  });
});

describe('other contacts gate', () => {
  it('requires church, parent, emergency, and accountability fields before Next', () => {
    assert.equal(isOtherContactsComplete(emptyOtherContacts()), false);
    assert.equal(isOtherContactsComplete(completeDraft()), true);
  });

  it('requires the field-contact name only when the volunteer is in contact on the field', () => {
    assert.equal(
      isOtherContactsComplete(
        completeDraft({ fieldContact: 'yes', fieldContactName: '' }),
      ),
      false,
    );
    assert.equal(
      isOtherContactsComplete(
        completeDraft({ fieldContact: 'yes', fieldContactName: 'Sam Hostetler' }),
      ),
      true,
    );
  });
});
