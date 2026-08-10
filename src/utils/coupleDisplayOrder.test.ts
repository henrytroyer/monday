/**
 * coupleDisplayOrder.test.ts — Jack & Jane ordering (not existence order).
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  formatCoupleConnectedLabel,
  normalizeCoupleGender,
  orderCoupleDisplayNames,
} from './coupleDisplayOrder';

describe('coupleDisplayOrder', () => {
  it('normalizes gender labels', () => {
    assert.equal(normalizeCoupleGender('Male'), 'male');
    assert.equal(normalizeCoupleGender('Female'), 'female');
    assert.equal(normalizeCoupleGender(''), 'unknown');
  });

  it('orders male then female (Jack & Jane)', () => {
    assert.deepEqual(
      orderCoupleDisplayNames(
        { name: 'Jane Smith', gender: 'female' },
        { name: 'Jack Smith', gender: 'male' },
      ),
      ['Jack Smith', 'Jane Smith'],
    );
    assert.equal(
      formatCoupleConnectedLabel(
        { name: 'Jane Smith', gender: 'Female' },
        { name: 'Jack Smith', gender: 'Male' },
      ),
      'Couple: Jack Smith & Jane Smith',
    );
  });

  it('when only Jane is known female, puts unknown spouse first (Jack)', () => {
    assert.deepEqual(
      orderCoupleDisplayNames(
        { name: 'Jane Smith', gender: 'female' },
        { name: 'Jack Smith', gender: 'unknown' },
      ),
      ['Jack Smith', 'Jane Smith'],
    );
  });

  it('does not prefer who existed first when genders are known', () => {
    // Jane is "primary" in the form; Jack is spouse — still Jack first.
    assert.deepEqual(
      orderCoupleDisplayNames(
        { name: 'Jane Smith', gender: 'female' },
        { name: 'Jack Smith', gender: 'male' },
      ),
      ['Jack Smith', 'Jane Smith'],
    );
  });
});
