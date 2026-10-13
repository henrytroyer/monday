import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { SHORT_TERM_STEP_DEFAULTS } from '../contract/volunteerApi.ts';
import {
  emptyTermOfService,
  isTermOfServiceComplete,
  LENGTH_OF_TERM_OPTIONS,
  LOCATION_PREFERENCE_LABEL,
  TERM_OF_SERVICE_BANNER,
} from './termOfService.ts';

describe('term of service copy', () => {
  it('renames the eighth process step', () => {
    const eighth = SHORT_TERM_STEP_DEFAULTS[7];
    assert.equal(eighth?.id, 'invoice');
    assert.equal(eighth?.title, 'Term of Service');
    assert.equal(eighth?.audience, 'volunteer');
  });

  it('includes the labels from the source form', () => {
    assert.equal(TERM_OF_SERVICE_BANNER, 'Term of Service');
    assert.equal(LOCATION_PREFERENCE_LABEL, 'i58 Location Preference');
    assert.deepEqual(
      LENGTH_OF_TERM_OPTIONS.map((option) => option.label),
      ['3 months', 'Other'],
    );
  });
});

describe('term of service gate', () => {
  it('requires location, term length, dates, and airport before Next', () => {
    assert.equal(isTermOfServiceComplete(emptyTermOfService()), false);
    assert.equal(
      isTermOfServiceComplete({
        locationPreferences: ['Lesvos Greece'],
        lengthOfTerm: '3-months',
        otherTerm: '',
        preferredDates: 'Summer 2026',
        nearbyAirport: 'PHL',
      }),
      true,
    );
  });

  it('requires the Other term description when Other is selected', () => {
    assert.equal(
      isTermOfServiceComplete({
        locationPreferences: ['Germany'],
        lengthOfTerm: 'other',
        otherTerm: '',
        preferredDates: 'Fall 2026',
        nearbyAirport: 'PHL',
      }),
      false,
    );
    assert.equal(
      isTermOfServiceComplete({
        locationPreferences: ['Germany'],
        lengthOfTerm: 'other',
        otherTerm: '6 weeks',
        preferredDates: 'Fall 2026',
        nearbyAirport: 'PHL',
      }),
      true,
    );
  });
});
