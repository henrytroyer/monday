import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { JANE_MILLER } from '../mock/fixtures.ts';
import {
  FINAL_CHECKLIST_ITEMS,
  arriveInEurope,
  finalChecklistIsComplete,
  showArrivalButton,
  toggleFinalChecklistItem,
  withFinalChecklist,
} from './finalChecklist.ts';
import { resolveOnboardingSteps } from './onboarding.ts';

function prepared() {
  const steps = resolveOnboardingSteps(JANE_MILLER).map((step, index) =>
    index === 0 ? { ...step, status: 'received' as const } : step,
  );
  return { ...JANE_MILLER, onboardingSteps: steps };
}

function allButLast(): string[] {
  return FINAL_CHECKLIST_ITEMS.slice(0, -1).map((item) => item.id);
}

describe('final checklist', () => {
  it('keeps the step unfinished and hides the button while one item is left', () => {
    const me = withFinalChecklist(prepared(), allButLast());
    const checklist = me.onboardingSteps?.find((step) => step.id === 'final_checklist');
    assert.equal(finalChecklistIsComplete(me.finalChecklistChecked), false);
    assert.equal(checklist?.status, 'not_started');
    assert.equal(showArrivalButton(me), false);
    assert.equal(me.onboardingSteps?.[0]?.status, 'received');
  });

  it('finishes the step and shows the button when the last item is checked', () => {
    const me = withFinalChecklist(
      prepared(),
      FINAL_CHECKLIST_ITEMS.map((item) => item.id),
    );
    const checklist = me.onboardingSteps?.find((step) => step.id === 'final_checklist');
    assert.equal(checklist?.status, 'complete');
    assert.equal(showArrivalButton(me), true);
    assert.equal(me.onboardingSteps?.[0]?.status, 'received');
  });

  it('reverses the finished step when an item is cleared', () => {
    const finished = withFinalChecklist(
      prepared(),
      FINAL_CHECKLIST_ITEMS.map((item) => item.id),
    );
    const cleared = toggleFinalChecklistItem(finished, 'passport');
    const checklist = cleared.onboardingSteps?.find(
      (step) => step.id === 'final_checklist',
    );
    assert.equal(checklist?.status, 'not_started');
    assert.equal(showArrivalButton(cleared), false);
    assert.equal(cleared.onboardingSteps?.[0]?.status, 'received');
  });

  it('keeps arrival separate from a finished checklist', () => {
    const finished = withFinalChecklist(
      prepared(),
      FINAL_CHECKLIST_ITEMS.map((item) => item.id),
    );
    const arrived = arriveInEurope(finished);
    assert.equal(arrived.arrivedInEurope, true);
    assert.equal(finalChecklistIsComplete(arrived.finalChecklistChecked), true);
    assert.equal(showArrivalButton(arrived), false);
    assert.equal(
      arrived.onboardingSteps?.find((step) => step.id === 'final_checklist')?.status,
      'complete',
    );
  });
});
