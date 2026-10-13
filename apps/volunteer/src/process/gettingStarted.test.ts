import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { SHORT_TERM_STEP_DEFAULTS } from '../contract/volunteerApi.ts';
import {
  EMAIL_LABEL,
  FIRST_NAME_LABEL,
  FULL_NAME_LABEL,
  GETTING_STARTED_BANNER,
  PREVIOUS_VOLUNTEER_LABEL,
  canContinueNoPath,
  isGettingStartedComplete,
} from './gettingStarted.ts';

describe('getting started copy', () => {
  it('uses Getting Started as the first process step title', () => {
    assert.equal(SHORT_TERM_STEP_DEFAULTS[0]?.title, 'Getting Started');
  });

  it('includes the start form labels from the source screen', () => {
    assert.equal(GETTING_STARTED_BANNER, 'A few things to get started...');
    assert.match(FULL_NAME_LABEL, /Full Name/);
    assert.match(FIRST_NAME_LABEL, /First Name Only/);
    assert.equal(EMAIL_LABEL, 'Your Email');
    assert.match(PREVIOUS_VOLUNTEER_LABEL, /volunteered with i58 previously/);
  });
});

describe('getting started gate', () => {
  const filled = {
    fullName: 'Sam Hostetler',
    firstName: 'Sam',
    email: 'sam@example.com',
    previousVolunteer: '' as const,
  };

  it('is incomplete until Yes or No is chosen', () => {
    assert.equal(isGettingStartedComplete(filled), false);
    assert.equal(canContinueNoPath(filled), false);
  });

  it('allows Next only on the No path when the form is complete', () => {
    const no = { ...filled, previousVolunteer: 'no' as const };
    const yes = { ...filled, previousVolunteer: 'yes' as const };
    assert.equal(isGettingStartedComplete(no), true);
    assert.equal(canContinueNoPath(no), true);
    assert.equal(isGettingStartedComplete(yes), true);
    assert.equal(canContinueNoPath(yes), false);
  });
});
