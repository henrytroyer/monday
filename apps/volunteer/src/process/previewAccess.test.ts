import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { JANE_MILLER, previewStatusForNewAccount } from '../mock/fixtures.ts';
import { canOpenProcessStep, previewViewForStep } from './previewAccess.ts';

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

  it('opens only Getting Started on a new application', () => {
    const steps = previewStatusForNewAccount({
      name: 'Sam Rivera',
      email: 'sam@example.com',
    }).steps;
    assert.equal(canOpenProcessStep('application_received', steps), true);
    assert.equal(canOpenProcessStep('pastor_reference', steps), false);
    assert.equal(canOpenProcessStep('in_review', steps), false);
    assert.equal(canOpenProcessStep('guidelines', steps), false);
  });

  it('opens the next step only after the previous one is finished', () => {
    const steps = JANE_MILLER.steps;
    assert.equal(canOpenProcessStep('application_received', steps), true);
    assert.equal(canOpenProcessStep('pastor_reference', steps), true);
    assert.equal(canOpenProcessStep('in_review', steps), true);
    assert.equal(canOpenProcessStep('background_check', steps), true);
    assert.equal(canOpenProcessStep('child_safeguarding', steps), false);
    assert.equal(canOpenProcessStep('approved', steps), false);
    assert.equal(canOpenProcessStep('flight_info', steps), false);
    assert.equal(canOpenProcessStep('invoice', steps), false);
    assert.equal(canOpenProcessStep('sent_to_field', steps), false);
    assert.equal(canOpenProcessStep('guidelines', steps), false);
  });
});
