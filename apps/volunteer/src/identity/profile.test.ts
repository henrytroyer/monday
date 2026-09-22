import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { normalizePhoneDigits, splitPersonName, validateProfile } from './profile.ts';

const complete = {
  fullName: 'Jane Miller',
  dateOfBirth: '1994-04-02',
  phone: '(555) 010-1212',
  street: '10 Oak Street',
  city: 'Lancaster',
  state: 'PA',
  zip: '17601',
  country: 'USA',
};

describe('validateProfile', () => {
  it('accepts a complete profile and trims the name', () => {
    const result = validateProfile({ ...complete, fullName: '  Jane   Miller  ' });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.value.fullName, 'Jane Miller');
  });

  it('requires a first and last name', () => {
    const result = validateProfile({ ...complete, fullName: 'Jane' });
    assert.equal(result.ok, false);
  });

  it('rejects a future date of birth', () => {
    const result = validateProfile({ ...complete, dateOfBirth: '2999-01-01' });
    assert.equal(result.ok, false);
  });

  it('rejects a phone number that is too short', () => {
    const result = validateProfile({ ...complete, phone: '555' });
    assert.equal(result.ok, false);
  });
});

describe('phone and name helpers', () => {
  it('keeps the last ten digits of a phone number', () => {
    assert.equal(normalizePhoneDigits('+1 (555) 010-1212'), '5550101212');
  });

  it('reads the last name in lowercase', () => {
    assert.equal(splitPersonName('Jane Anne Miller').last, 'miller');
  });
});
