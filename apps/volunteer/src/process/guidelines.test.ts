import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { SHORT_TERM_STEP_DEFAULTS } from '../contract/volunteerApi.ts';
import {
  AGREEMENT_LABEL,
  emptyGuidelines,
  GUIDELINES_BANNER,
  isGuidelinesComplete,
  DRESS_CODE_GENERAL_BULLETS,
  DRESS_CODE_LADIES_BULLETS,
  DRESS_CODE_MEN_BULLETS,
  PERSONAL_CONDUCT_BULLETS,
  PERSONAL_CONDUCT_HEADING,
  SUBMISSION_THANKS_NOTE,
  SUBMISSION_THANKS_NOTICE,
  SUBMISSION_THANKS_TITLE,
  submissionThanksSecondsLeft,
} from './guidelines.ts';

describe('guidelines copy', () => {
  it('adds a volunteer-only tenth process step', () => {
    const tenth = SHORT_TERM_STEP_DEFAULTS[9];
    assert.equal(tenth?.id, 'guidelines');
    assert.equal(tenth?.title, 'Guidelines');
    assert.equal(tenth?.audience, 'volunteer');
  });

  it('includes the headings from the source form', () => {
    assert.equal(GUIDELINES_BANNER, 'Guidelines');
    assert.equal(PERSONAL_CONDUCT_HEADING, 'Personal Conduct');
    assert.equal(
      AGREEMENT_LABEL,
      'By Toggling, I agree to the i58Global Guidelines and Rules of Conduct',
    );
    assert.equal(PERSONAL_CONDUCT_BULLETS.length, 6);
    assert.equal(DRESS_CODE_LADIES_BULLETS.length, 3);
    assert.equal(DRESS_CODE_MEN_BULLETS.length, 4);
    assert.equal(DRESS_CODE_GENERAL_BULLETS.length, 3);
  });
});

describe('guidelines gate', () => {
  it('requires the agreement toggle before Submit', () => {
    assert.equal(isGuidelinesComplete(emptyGuidelines()), false);
    assert.equal(isGuidelinesComplete({ agreed: true }), true);
  });
});

describe('guidelines thank-you copy', () => {
  it('uses the submit overlay lines', () => {
    assert.equal(
      SUBMISSION_THANKS_TITLE,
      'Thank-you for submitting an application to\ni58 Global!',
    );
    assert.equal(SUBMISSION_THANKS_NOTICE, 'You will be notified when we receive it.');
    assert.equal(SUBMISSION_THANKS_NOTE, 'Next steps coming soon . . .');
  });

  it('counts down from 10 seconds across the overlay pause', () => {
    assert.equal(submissionThanksSecondsLeft(0), 10);
    assert.equal(submissionThanksSecondsLeft(999), 10);
    assert.equal(submissionThanksSecondsLeft(1000), 9);
    assert.equal(submissionThanksSecondsLeft(9000), 1);
    assert.equal(submissionThanksSecondsLeft(9999), 1);
    assert.equal(submissionThanksSecondsLeft(10000), 0);
    assert.equal(submissionThanksSecondsLeft(11000), 0);
  });
});
