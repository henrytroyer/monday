import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { JANE_MILLER, previewStatusForNewAccount } from '../mock/fixtures.ts';
import { ONBOARDING_STEP_DEFAULTS } from '../contract/volunteerApi.ts';
import {
  applicationIsSubmitted,
  nextOnboardingStep,
  onboardingFillPercent,
  onboardingWaterTone,
  previewDepartureProgress,
  processCompletionPercent,
  processCompletionSegments,
  resolveOnboardingSteps,
  revealOnboarding,
} from './onboarding.ts';

function submitted(): typeof JANE_MILLER {
  return {
    ...JANE_MILLER,
    steps: JANE_MILLER.steps.map((step) =>
      step.id === 'guidelines'
        ? { ...step, status: 'complete' as const, youDo: null }
        : step,
    ),
  };
}

describe('post-submit onboarding', () => {
  it('treats a completed guidelines step as submitted until the arrow is clicked', () => {
    const me = submitted();
    assert.equal(applicationIsSubmitted(JANE_MILLER), false);
    assert.equal(applicationIsSubmitted(me), true);
    assert.equal(me.onboardingRevealed, undefined);
  });

  it('names Application received as the current step', () => {
    const next = nextOnboardingStep(submitted());
    assert.equal(next?.title, 'Application received');
    assert.equal(next?.status, 'not_started');
    assert.equal(onboardingFillPercent(next!), 0);
    assert.deepEqual(
      resolveOnboardingSteps(submitted()).map((step) => step.title),
      [
        'Application received',
        'Pastor reference sent',
        'Pastor reference received',
        'Background check',
        'Acceptance',
        'Safeguarding certificate',
        'Chat groups',
        'Flights',
        'Team Training',
        'Final check-list',
      ],
    );
  });

  it('fills a received step and moves the current step to the next one', () => {
    const steps = resolveOnboardingSteps(submitted());
    const received = { ...steps[0], status: 'received' as const };
    assert.equal(onboardingFillPercent(received), 100);
    const me = revealOnboarding({
      ...submitted(),
      onboardingSteps: steps.map((step, index) =>
        index === 0 ? received : step,
      ),
    });
    assert.equal(me.onboardingRevealed, true);
    assert.equal(me.onboardingSteps?.[0]?.status, 'received');
    assert.equal(nextOnboardingStep(me)?.title, 'Pastor reference sent');
  });

  it('averages the application and preparation into one departure percent', () => {
    const fresh = previewStatusForNewAccount({ name: 'Ada', email: 'ada@example.com' });
    assert.equal(processCompletionPercent(fresh), 0);

    const half = {
      ...fresh,
      gettingStarted: {
        fullName: 'Ada Lovelace',
        firstName: 'Ada',
        email: '',
        previousVolunteer: '' as const,
      },
    };
    assert.equal(processCompletionPercent(half), 3);

    const received = {
      ...fresh,
      onboardingSteps: ONBOARDING_STEP_DEFAULTS.map((step, index) => ({
        ...step,
        status: index === 0 ? ('received' as const) : ('not_started' as const),
      })),
    };
    assert.equal(processCompletionPercent(received), 5);

    const applicationDone = {
      ...fresh,
      steps: fresh.steps.map((step) => ({ ...step, status: 'complete' as const })),
    };
    assert.equal(processCompletionPercent(applicationDone), 50);

    const departed = {
      ...applicationDone,
      onboardingSteps: ONBOARDING_STEP_DEFAULTS.map((step) => ({
        ...step,
        status: 'complete' as const,
      })),
    };
    assert.equal(processCompletionPercent(departed), 100);
  });

  it('places a green slice on Acceptance and orange on the steps after it', () => {
    const fresh = previewStatusForNewAccount({ name: 'Ada', email: 'ada@example.com' });
    const acceptanceOnly = {
      ...fresh,
      onboardingSteps: ONBOARDING_STEP_DEFAULTS.map((step) => ({
        ...step,
        status: step.id === 'acceptance' ? ('complete' as const) : ('not_started' as const),
      })),
    };
    assert.deepEqual(processCompletionSegments(acceptanceOnly), [
      { tone: 'green', start: 70, length: 5 },
    ]);

    const later = {
      ...acceptanceOnly,
      onboardingSteps: acceptanceOnly.onboardingSteps?.map((step) =>
        step.id === 'safeguarding_certificate' ? { ...step, status: 'complete' as const } : step,
      ),
    };
    assert.deepEqual(processCompletionSegments(later), [
      { tone: 'green', start: 70, length: 5 },
      { tone: 'orange', start: 75, length: 5 },
    ]);
  });

  it('fills the departure preview through Flights at 90 percent', () => {
    const mock = previewDepartureProgress(
      previewStatusForNewAccount({ name: 'Ada', email: 'ada@example.com' }),
    );
    assert.equal(applicationIsSubmitted(mock), true);
    assert.equal(mock.onboardingRevealed, true);
    assert.equal(nextOnboardingStep(mock)?.title, 'Team Training');
    assert.equal(processCompletionPercent(mock), 90);
    assert.deepEqual(processCompletionSegments(mock), [
      { tone: 'blue', start: 0, length: 70 },
      { tone: 'green', start: 70, length: 5 },
      { tone: 'orange', start: 75, length: 15 },
    ]);
  });

  it('colors Acceptance green, earlier steps blue, and later steps orange', () => {
    assert.equal(onboardingWaterTone('application_received_post'), 'blue');
    assert.equal(onboardingWaterTone('background_check_sent'), 'blue');
    assert.equal(onboardingWaterTone('acceptance'), 'green');
    assert.equal(onboardingWaterTone('safeguarding_certificate'), 'orange');
    assert.equal(onboardingWaterTone('final_checklist'), 'orange');
  });
});
