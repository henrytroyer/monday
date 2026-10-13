import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { SHORT_TERM_STEP_DEFAULTS } from '../contract/volunteerApi.ts';
import {
  emptyPassportDetails,
  isPassportDetailsComplete,
  PASSPORT_DETAILS_BANNER,
  PASSPORT_EXPIRATION_LABEL,
  PASSPORT_NUMBER_LABEL,
  PASSPORT_PHOTO_HINT,
  PASSPORT_PHOTO_LABEL,
} from './passportDetails.ts';

describe('passport details copy', () => {
  it('renames the third process step', () => {
    const third = SHORT_TERM_STEP_DEFAULTS[2];
    assert.equal(third?.id, 'in_review');
    assert.equal(third?.title, 'Passport Details');
    assert.equal(third?.audience, 'volunteer');
  });

  it('includes the labels from the source form', () => {
    assert.equal(PASSPORT_DETAILS_BANNER, 'Passport Details');
    assert.equal(PASSPORT_PHOTO_LABEL, 'Passport Photo');
    assert.equal(PASSPORT_PHOTO_HINT, 'Please ensure a clear photo');
    assert.equal(PASSPORT_NUMBER_LABEL, 'Passport Number');
    assert.equal(PASSPORT_EXPIRATION_LABEL, 'Passport Expiration Date');
  });
});

describe('passport details gate', () => {
  it('requires photo, number, and expiration before Next', () => {
    const empty = emptyPassportDetails();
    assert.equal(isPassportDetailsComplete(empty), false);
    assert.equal(
      isPassportDetailsComplete({
        ...empty,
        passportNumber: 'E00007730',
        expirationDate: '2030-10-14',
      }),
      false,
    );
    assert.equal(
      isPassportDetailsComplete({
        photoFileName: 'passport.jpg',
        passportNumber: 'E00007730',
        expirationDate: '2030-10-14',
      }),
      true,
    );
  });
});
