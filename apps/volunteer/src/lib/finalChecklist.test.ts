import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { JANE_MILLER } from '../mock/fixtures.ts';
import {
  FINAL_CHECKLIST_ITEMS,
  FINAL_CHECKLIST_SEASON_NOTE,
  arriveInEurope,
  finalChecklistIsComplete,
  finalChecklistProgress,
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
  it('keeps the step unfinished while one item is left', () => {
    const me = withFinalChecklist(prepared(), allButLast());
    const checklist = me.onboardingSteps?.find((step) => step.id === 'final_checklist');
    assert.equal(finalChecklistIsComplete(me.finalChecklistChecked), false);
    assert.equal(checklist?.status, 'not_started');
    assert.equal(checklist?.progress, 67);
    assert.equal(finalChecklistProgress(me.finalChecklistChecked), 67);
    assert.equal(me.onboardingSteps?.[0]?.status, 'received');
  });

  it('finishes the step when the last item is checked', () => {
    const me = withFinalChecklist(
      prepared(),
      FINAL_CHECKLIST_ITEMS.map((item) => item.id),
    );
    const checklist = me.onboardingSteps?.find((step) => step.id === 'final_checklist');
    assert.equal(checklist?.status, 'complete');
    assert.equal(checklist?.progress, undefined);
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
    assert.equal(checklist?.progress, 67);
    assert.equal(cleared.onboardingSteps?.[0]?.status, 'received');
  });

  it('fills the step in equal shares as items are checked', () => {
    const one = withFinalChecklist(prepared(), ['passport']);
    const two = withFinalChecklist(prepared(), ['passport', 'payment']);
    assert.equal(
      one.onboardingSteps?.find((step) => step.id === 'final_checklist')?.progress,
      33,
    );
    assert.equal(
      two.onboardingSteps?.find((step) => step.id === 'final_checklist')?.progress,
      67,
    );
    assert.equal(finalChecklistProgress(undefined), 0);
  });

  it('keeps the departure essentials and the season note', () => {
    assert.deepEqual(
      FINAL_CHECKLIST_ITEMS.map((item) => item.label),
      ['Passport', 'Payment method', 'Season-appropriate clothing'],
    );
    assert.equal(FINAL_CHECKLIST_SEASON_NOTE, 'Summer and winter packing differ.');
  });

  it('keeps arrival separate from a finished checklist', () => {
    const finished = withFinalChecklist(
      prepared(),
      FINAL_CHECKLIST_ITEMS.map((item) => item.id),
    );
    const arrived = arriveInEurope(finished);
    assert.equal(arrived.arrivedInEurope, true);
    assert.equal(finalChecklistIsComplete(arrived.finalChecklistChecked), true);
    assert.equal(
      arrived.onboardingSteps?.find((step) => step.id === 'final_checklist')?.status,
      'complete',
    );
  });
});
