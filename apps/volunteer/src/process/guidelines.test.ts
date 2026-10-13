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
  isCopyEmailValid,
  PERSONAL_CONDUCT_BULLETS,
  PERSONAL_CONDUCT_HEADING,
  THANK_YOU_SUBTITLE,
  THANK_YOU_TITLE,
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
  it('matches the confirmation screenshot', () => {
    assert.equal(THANK_YOU_TITLE, 'Thank you!');
    assert.equal(THANK_YOU_SUBTITLE, 'Your application has been sent.');
  });

  it('requires a valid email before sending a copy', () => {
    assert.equal(isCopyEmailValid(''), false);
    assert.equal(isCopyEmailValid('you@company'), false);
    assert.equal(isCopyEmailValid('you@company.com'), true);
  });
});
