import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  dateOfBirthToInputValue,
  formatDateOfBirth,
  normalizeDateOfBirth,
} from './formatDateOfBirth';

describe('formatDateOfBirth', () => {
  it('formats ISO dates as month, day, year', () => {
    assert.equal(formatDateOfBirth('1990-03-14'), 'March 14, 1990');
  });

  it('keeps already formatted values readable', () => {
    assert.equal(formatDateOfBirth('March 14, 1990'), 'March 14, 1990');
  });

  it('converts to date input value', () => {
    assert.equal(dateOfBirthToInputValue('March 14, 1990'), '1990-03-14');
  });

  it('normalizes stored values', () => {
    assert.equal(normalizeDateOfBirth('1990-03-14'), 'March 14, 1990');
  });
});
