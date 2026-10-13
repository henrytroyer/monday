import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  canOpenProcessStep,
  PREVIEW_OPEN_ANY_STEP,
  previewViewForStep,
} from './previewAccess.ts';

describe('preview process-step access', () => {
  it('maps volunteer form steps to screens', () => {
    assert.equal(previewViewForStep('application_received'), 'advice');
    assert.equal(previewViewForStep('pastor_reference'), 'general-information');
    assert.equal(previewViewForStep('in_review'), 'passport-details');
    assert.equal(previewViewForStep('background_check'), 'profile-photo');
    assert.equal(previewViewForStep('child_safeguarding'), 'history-skills-languages');
    assert.equal(previewViewForStep('approved'), 'family-status');
    assert.equal(previewViewForStep('flight_info'), 'spouse-application');
    assert.equal(previewViewForStep('invoice'), 'term-of-service');
    assert.equal(previewViewForStep('sent_to_field'), 'other-contacts');
    assert.equal(previewViewForStep('guidelines'), 'guidelines');
  });

  it('unlocks every volunteer form step while the preview flag is on', () => {
    assert.equal(PREVIEW_OPEN_ANY_STEP, true);
    assert.equal(canOpenProcessStep('application_received', true), true);
    assert.equal(canOpenProcessStep('pastor_reference', true), true);
    assert.equal(canOpenProcessStep('in_review', true), true);
    assert.equal(canOpenProcessStep('background_check', true), true);
    assert.equal(canOpenProcessStep('child_safeguarding', true), true);
    assert.equal(canOpenProcessStep('approved', true), true);
    assert.equal(canOpenProcessStep('flight_info', true), true);
    assert.equal(canOpenProcessStep('invoice', true), true);
    assert.equal(canOpenProcessStep('sent_to_field', true), true);
    assert.equal(canOpenProcessStep('guidelines', true), true);
  });

  it('restores Getting Started-only list access when the flag is off', () => {
    assert.equal(canOpenProcessStep('application_received', false), true);
    assert.equal(canOpenProcessStep('pastor_reference', false), false);
    assert.equal(canOpenProcessStep('in_review', false), false);
    assert.equal(canOpenProcessStep('background_check', false), false);
    assert.equal(canOpenProcessStep('child_safeguarding', false), false);
    assert.equal(canOpenProcessStep('approved', false), false);
    assert.equal(canOpenProcessStep('flight_info', false), false);
    assert.equal(canOpenProcessStep('invoice', false), false);
    assert.equal(canOpenProcessStep('sent_to_field', false), false);
    assert.equal(canOpenProcessStep('guidelines', false), false);
  });
});
