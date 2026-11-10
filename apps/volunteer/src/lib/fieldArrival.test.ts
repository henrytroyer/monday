import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { JANE_MILLER } from '../mock/fixtures.ts';
import { resolveOnboardingSteps } from './onboarding.ts';
import {
  FIELD_ARRIVAL_NOTICE,
  fieldLandingAt,
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
  const landing = new Date('2026-06-06T15:00:00.000Z');

  it('lands Jane in Mytilene at 6:00 PM Greece time on 6 June 2026', () => {
    assert.equal(fieldLandingAt(JANE_MILLER)?.toISOString(), landing.toISOString());
    assert.equal(
      hasLandedInEurope(JANE_MILLER, new Date(landing.getTime() - 60_000)),
      false,
    );
    assert.equal(hasLandedInEurope(JANE_MILLER, landing), true);
  });

  it('leaves a term with no itinerary on the ground', () => {
    const other = { ...JANE_MILLER, term: 'Fall 2027' };
    assert.equal(fieldLandingAt(other), null);
    assert.equal(hasLandedInEurope(other, landing), false);
  });

  it('shows the landing notice once Team Training is filled', () => {
    assert.equal(showFieldArrivalNotice(withTrainingFilled(false)), false);
    assert.equal(showFieldArrivalNotice(withTrainingFilled(true)), true);
    assert.equal(
      showFieldArrivalNotice({ ...withTrainingFilled(true), arrivedInEurope: true }),
      false,
    );
    assert.equal(
      FIELD_ARRIVAL_NOTICE,
      "The On-Field Volunteer Page will appear when you've landed in Europe.",
    );
  });
});
