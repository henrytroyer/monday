import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { SHORT_TERM_STEP_DEFAULTS } from '../contract/volunteerApi.ts';
import {
  emptyGeneralInformation,
  isGeneralInformationComplete,
  MAILING_ADDRESS_BANNER,
  VOLUNTEER_INFO_BANNER,
} from './generalInformation.ts';

describe('general information copy', () => {
  it('renames the second process step', () => {
    const second = SHORT_TERM_STEP_DEFAULTS[1];
    assert.equal(second?.id, 'pastor_reference');
    assert.equal(second?.title, 'General Information');
  });

  it('includes the section banners from the source form', () => {
    assert.equal(VOLUNTEER_INFO_BANNER, 'Volunteer Information');
    assert.equal(MAILING_ADDRESS_BANNER, 'Mailing Address');
  });
});

describe('general information gate', () => {
  it('requires volunteer info and mailing address before Next', () => {
    const empty = emptyGeneralInformation();
    assert.equal(isGeneralInformationComplete(empty), false);
    const filled = {
      ...empty,
      gender: 'female' as const,
      birthdate: '2000-01-15',
      phone: '5551234567',
      street: '123 Main St',
      city: 'Springfield',
      state: 'IL',
      postalCode: '62701',
      country: 'USA',
    };
    assert.equal(isGeneralInformationComplete(filled), true);
  });
});
