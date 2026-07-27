import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  addressQueryFromDemographics,
  buildGeocodeQueries,
  hasStreetAddress,
} from './geocodeAddress';
import { normalizeGeocodeCacheKey } from './geocodeCache';

describe('addressQueryFromDemographics', () => {
  it('returns null for empty demographics', () => {
    assert.equal(addressQueryFromDemographics(undefined), null);
    assert.equal(addressQueryFromDemographics({}), null);
  });

  it('returns null when there is no street line (city-only is not enough)', () => {
    assert.equal(
      addressQueryFromDemographics({
        city: 'Portland',
        state: 'OR',
        zip: '97201',
        country: 'United States',
      }),
      null,
    );
  });

  it('formats a single-line full mailing address for geocoding', () => {
    assert.equal(
      addressQueryFromDemographics({
        address: '123 Oak Street',
        city: 'Portland',
        state: 'OR',
        zip: '97201',
        country: 'United States',
      }),
      '123 Oak Street, Portland, OR 97201, United States',
    );
  });
});

describe('buildGeocodeQueries', () => {
  it('returns only the full mailing address (no city-only fallbacks)', () => {
    const queries = buildGeocodeQueries({
      address: '123 Oak Street',
      city: 'Portland',
      state: 'OR',
      zip: '97201',
      country: 'United States',
    });
    assert.deepEqual(queries, [
      '123 Oak Street, Portland, OR 97201, United States',
    ]);
  });

  it('returns empty when street is missing', () => {
    assert.deepEqual(
      buildGeocodeQueries({ city: 'Portland', state: 'OR' }),
      [],
    );
  });
});

describe('hasStreetAddress', () => {
  it('is true only when a street line is present', () => {
    assert.equal(hasStreetAddress({ city: 'Portland' }), false);
    assert.equal(
      hasStreetAddress({ address: '123 Oak Street', city: 'Portland' }),
      true,
    );
  });
});

describe('normalizeGeocodeCacheKey', () => {
  it('normalizes whitespace and case', () => {
    assert.equal(
      normalizeGeocodeCacheKey('  123 Oak Street,  Portland  '),
      '123 oak street, portland',
    );
  });
});
