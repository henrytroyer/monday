import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { JANE_MILLER } from '../mock/fixtures.ts';
import { nextVolunteerAction } from './nextAction.ts';

describe('nextVolunteerAction', () => {
  it('skips complete and received steps and returns Jane’s background check', () => {
    const next = nextVolunteerAction(JANE_MILLER);
    assert.equal(next?.id, 'background_check');
    assert.equal(next?.status, 'waiting');
  });

  it('returns null when nothing is left for the volunteer', () => {
    const done = {
      ...JANE_MILLER,
      steps: JANE_MILLER.steps.map((step) => ({
        ...step,
        status: 'complete' as const,
        youDo: null,
      })),
    };
    assert.equal(nextVolunteerAction(done), null);
  });
});
