import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { JANE_MILLER, previewStatusForNewAccount } from '../mock/fixtures.ts';
import { FINAL_CHECKLIST_ITEMS } from './finalChecklist.ts';
import {
  PREVIEW_HOME_LABELS,
  homeIndexFor,
  previewHomeStatus,
  type PreviewHomeIndex,
} from './previewHomeStepper.ts';

describe('preview home stepper', () => {
  const fresh = previewStatusForNewAccount({
    name: 'Ada Tour',
    email: 'ada.tour@example.com',
  });
  const submitted = {
    ...JANE_MILLER,
    steps: JANE_MILLER.steps.map((step) =>
      step.id === 'guidelines' ? { ...step, status: 'complete' as const } : step,
    ),
  };

  it('maps an account onto the five homes in order', () => {
    assert.deepEqual(PREVIEW_HOME_LABELS, [
      'Welcome',
      'Application',
      'Submitted',
      'Preparation',
      'Arrived',
    ]);
    assert.equal(homeIndexFor(fresh), 0);
    assert.equal(homeIndexFor(JANE_MILLER), 1);
    assert.equal(homeIndexFor(submitted), 2);
    assert.equal(homeIndexFor({ ...submitted, onboardingRevealed: true }), 3);
    assert.equal(
      homeIndexFor({ ...submitted, onboardingRevealed: true, arrivedInEurope: true }),
      4,
    );
  });

  it('builds a display copy that sets only the flags for that home', () => {
    const welcome = previewHomeStatus(JANE_MILLER, 0);
    assert.equal(welcome.applicationStarted, false);
    assert.equal(welcome.arrivedInEurope, false);
    assert.equal(welcome.onboardingRevealed, false);
    assert.ok(welcome.steps.every((step) => step.status === 'not_started'));
    assert.equal(JANE_MILLER.steps[0]?.status, 'complete');

    const application = previewHomeStatus(submitted, 1);
    assert.equal(application.applicationStarted, true);
    assert.equal(application.arrivedInEurope, false);
    assert.equal(application.onboardingRevealed, false);
    assert.ok(application.steps.every((step) => step.status === 'complete'));
    assert.equal(submitted.steps.find((step) => step.id === 'guidelines')?.status, 'complete');
    assert.equal(JANE_MILLER.steps.find((step) => step.id === 'guidelines')?.status, 'not_started');

    const thanks = previewHomeStatus(JANE_MILLER, 2);
    assert.equal(thanks.steps.find((step) => step.id === 'guidelines')?.status, 'complete');
    assert.equal(thanks.onboardingRevealed, false);
    assert.equal(thanks.arrivedInEurope, false);
    assert.equal(thanks.steps.find((step) => step.id === 'application_received')?.status, 'complete');

    const preparation = previewHomeStatus(JANE_MILLER, 3);
    assert.equal(preparation.steps.find((step) => step.id === 'guidelines')?.status, 'complete');
    assert.ok(preparation.steps.every((step) => step.status === 'complete'));
    assert.equal(preparation.onboardingRevealed, true);
    assert.equal(preparation.arrivedInEurope, false);
    assert.deepEqual(
      preparation.onboardingSteps?.map((step) => step.status),
      [
        'complete',
        'complete',
        'complete',
        'received',
        'complete',
        'received',
        'complete',
        'not_started',
        'not_started',
        'not_started',
      ],
    );
    assert.equal(JANE_MILLER.onboardingSteps, undefined);
    assert.equal(
      preparation.onboardingSteps?.find((step) => step.id === 'flights')?.progress,
      40,
    );

    const arrived = previewHomeStatus(JANE_MILLER, 4);
    assert.equal(arrived.arrivedInEurope, true);
    assert.equal(arrived.steps.find((step) => step.id === 'guidelines')?.status, 'not_started');
    assert.equal(JANE_MILLER.arrivedInEurope, undefined);
  });

  it('fills the final check-list bubble from the items that are checked', () => {
    const half = previewHomeStatus(
      {
        ...JANE_MILLER,
        finalChecklistChecked: FINAL_CHECKLIST_ITEMS.slice(0, 5).map((item) => item.id),
      },
      3,
    );
    const partial = half.onboardingSteps?.find((step) => step.id === 'final_checklist');
    assert.equal(partial?.status, 'not_started');
    assert.equal(partial?.progress, 50);
    assert.equal(half.onboardingSteps?.find((step) => step.id === 'flights')?.progress, 40);

    const done = previewHomeStatus(
      {
        ...JANE_MILLER,
        finalChecklistChecked: FINAL_CHECKLIST_ITEMS.map((item) => item.id),
      },
      3,
    );
    assert.equal(
      done.onboardingSteps?.find((step) => step.id === 'final_checklist')?.status,
      'complete',
    );
  });

  it('keeps welcome, submitted, preparation, and arrived on those homes', () => {
    const indexes: PreviewHomeIndex[] = [0, 2, 3, 4];
    for (const index of indexes) {
      const copy = previewHomeStatus(JANE_MILLER, index);
      assert.equal(homeIndexFor(copy), index);
    }
  });
});
