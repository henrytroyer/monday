import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { JANE_MILLER } from '../mock/fixtures.ts';
import { resolveOnboardingSteps } from './onboarding.ts';
import {
  FIELD_ARRIVAL_NOTICE,
  fieldPortalOpensAt,
  hasLandedInEurope,
  showFieldArrivalNotice,
} from './fieldArrival.ts';

function withTrainingFilled(filled: boolean) {
  return {
    ...JANE_MILLER,
    onboardingSteps: resolveOnboardingSteps(JANE_MILLER).map((step) =>
      step.id === 'team_training'
        ? {
            ...step,
            status: filled ? ('complete' as const) : ('not_started' as const),
            progress: filled ? 100 : 0,
          }
        : step,
    ),
  };
}

describe('field arrival', () => {
  const opens = new Date('2026-06-06T00:00:00.000Z');

  it('opens Jane’s field portal the day after she leaves home', () => {
    assert.equal(fieldPortalOpensAt(JANE_MILLER)?.toISOString(), opens.toISOString());
    assert.equal(hasLandedInEurope(JANE_MILLER, new Date(opens.getTime() - 60_000)), false);
    assert.equal(hasLandedInEurope(JANE_MILLER, opens), true);
  });

  it('leaves a term with no itinerary on the ground', () => {
    const other = { ...JANE_MILLER, term: 'Fall 2027' };
    assert.equal(fieldPortalOpensAt(other), null);
    assert.equal(hasLandedInEurope(other, opens), false);
  });

  it('shows the departure notice once Team Training is filled', () => {
    assert.equal(showFieldArrivalNotice(withTrainingFilled(false)), false);
    assert.equal(showFieldArrivalNotice(withTrainingFilled(true)), true);
    assert.equal(
      showFieldArrivalNotice({ ...withTrainingFilled(true), arrivedInEurope: true }),
      false,
    );
    assert.equal(
      FIELD_ARRIVAL_NOTICE,
      'The On-Field Volunteer Page will appear the day after you depart.',
    );
  });
});
