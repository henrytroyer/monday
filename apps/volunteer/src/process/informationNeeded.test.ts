import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { SHORT_TERM_STEP_DEFAULTS } from '../contract/volunteerApi.ts';
import {
  CONTACT_INFO_ITEMS,
  CONTACT_INFO_TITLE,
  INFORMATION_NEEDED_HEADING,
  PASSPORT_PHOTO_TITLE,
  PROFILE_PHOTO_TITLE,
} from './informationNeeded.ts';

describe('information needed copy', () => {
  it('renames the first volunteer process step', () => {
    const first = SHORT_TERM_STEP_DEFAULTS[0];
    assert.equal(first?.id, 'application_received');
    assert.equal(first?.title, 'Getting Started');
  });

  it('lists the three advice sections from the source form', () => {
    assert.equal(INFORMATION_NEEDED_HEADING, 'Be advised that you will need:');
    assert.equal(CONTACT_INFO_TITLE, 'Contact Info');
    assert.equal(PASSPORT_PHOTO_TITLE, 'Passport Photo');
    assert.equal(PROFILE_PHOTO_TITLE, 'Profile Photo');
    assert.equal(CONTACT_INFO_ITEMS.length, 4);
  });
});
