import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  mergeRichestDemographics,
  normalizeContactDemographics,
  parseSingleLineMailingAddress,
} from './contactDemographicsMerge';

describe('parseSingleLineMailingAddress', () => {
  it('splits a full US mailing line into street/city/state/zip/country', () => {
    const parsed = parseSingleLineMailingAddress(
      '123 Oak Street, Portland, OR 97201, United States',
    );
    assert.equal(parsed.address, '123 Oak Street');
    assert.equal(parsed.city, 'Portland');
    assert.equal(parsed.state, 'OR');
    assert.equal(parsed.zip, '97201');
    assert.equal(parsed.country, 'United States');
  });
});

describe('normalizeContactDemographics', () => {
  it('promotes a street stuffed into the city field', () => {
    const normalized = normalizeContactDemographics({
      city: '497 Thistle St, Penn Yan, New York 14527',
    });
    assert.equal(normalized?.address, '497 Thistle St');
    assert.equal(normalized?.city, 'Penn Yan');
    assert.equal(normalized?.zip, '14527');
  });
});

describe('mergeRichestDemographics', () => {
  it('prefers a real street over a city-only blob', () => {
    const merged = mergeRichestDemographics(
      { city: 'Portland', state: 'OR' },
      {
        address: '123 Oak Street',
        city: 'Portland',
        state: 'OR',
        zip: '97201',
        country: 'United States',
      },
    );
    assert.equal(merged?.address, '123 Oak Street');
    assert.equal(merged?.zip, '97201');
  });
});
