import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  formatContactAddress,
  mergeContactAndApplicationDemographics,
  parseFilloutAddress,
} from '../utils/formatContactAddress';

describe('parseFilloutAddress', () => {
  it('parses three-line fillout address', () => {
    const parsed = parseFilloutAddress(
      '6063 stocksdale rd\nUnion city , Ohio 45390\nUnited States',
    );

    assert.equal(parsed.address, '6063 stocksdale rd');
    assert.equal(parsed.city, 'Union city');
    assert.equal(parsed.state, 'Ohio');
    assert.equal(parsed.zip, '45390');
    assert.equal(parsed.country, 'United States');
  });

  it('formats parsed fillout for the profile address block', () => {
    const demographics = parseFilloutAddress(
      '497 Thistle St\nPenn Yan, New York 14527\nUnited States',
    );

    assert.equal(
      formatContactAddress(demographics),
      '497 Thistle St\nPenn Yan, New York 14527\nUnited States',
    );
  });
});

describe('mergeContactAndApplicationDemographics', () => {
  it('fills missing contact address from application demographics', () => {
    const merged = mergeContactAndApplicationDemographics(
      { address: '', city: '', country: '' },
      {
        address: '497 Thistle St',
        city: 'Penn Yan',
        state: 'New York',
        zip: '14527',
        country: 'United States',
      },
    );

    assert.equal(
      formatContactAddress(merged ?? {}),
      '497 Thistle St\nPenn Yan, New York 14527\nUnited States',
    );
  });
});
