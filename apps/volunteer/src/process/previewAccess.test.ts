import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { JANE_MILLER, previewStatusForNewAccount } from '../mock/fixtures.ts';
import {
  applicationStepBackLabel,
  PREVIEW_OPEN_ANY_STEP,
  canOpenProcessStep,
  previewViewForStep,
  type VolunteerFormView,
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

  it('labels only Getting Started as Back', () => {
    const views: VolunteerFormView[] = [
      'advice',
      'getting-started',
      'general-information',
      'passport-details',
      'profile-photo',
      'history-skills-languages',
      'family-status',
      'spouse-application',
      'term-of-service',
      'other-contacts',
      'guidelines',
    ];
    for (const view of views) {
      assert.equal(applicationStepBackLabel(view), view === 'getting-started' ? 'Back' : 'Home');
    }
  });

  it('opens only Getting Started on a new application', () => {
    const steps = previewStatusForNewAccount({
      name: 'Sam Rivera',
      email: 'sam@example.com',
    }).steps;
    assert.equal(canOpenProcessStep('application_received', steps, false), true);
    assert.equal(canOpenProcessStep('pastor_reference', steps, false), false);
    assert.equal(canOpenProcessStep('in_review', steps, false), false);
    assert.equal(canOpenProcessStep('guidelines', steps, false), false);
  });

  it('opens the next step only after the previous one is finished', () => {
    const steps = JANE_MILLER.steps;
    assert.equal(canOpenProcessStep('application_received', steps, false), true);
    assert.equal(canOpenProcessStep('pastor_reference', steps, false), true);
    assert.equal(canOpenProcessStep('in_review', steps, false), true);
    assert.equal(canOpenProcessStep('background_check', steps, false), true);
    assert.equal(canOpenProcessStep('child_safeguarding', steps, false), false);
    assert.equal(canOpenProcessStep('approved', steps, false), false);
    assert.equal(canOpenProcessStep('flight_info', steps, false), false);
    assert.equal(canOpenProcessStep('invoice', steps, false), false);
    assert.equal(canOpenProcessStep('sent_to_field', steps, false), false);
    assert.equal(canOpenProcessStep('guidelines', steps, false), false);
  });

  it('opens every form step while the mock flag is on', () => {
    assert.equal(PREVIEW_OPEN_ANY_STEP, true);
    const steps = previewStatusForNewAccount({
      name: 'Sam Rivera',
      email: 'sam@example.com',
    }).steps;
    assert.equal(canOpenProcessStep('application_received', steps), true);
    assert.equal(canOpenProcessStep('pastor_reference', steps), true);
    assert.equal(canOpenProcessStep('guidelines', steps), true);
  });
});
