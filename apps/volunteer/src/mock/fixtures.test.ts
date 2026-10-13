import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { SHORT_TERM_STEP_IDS } from '../contract/volunteerApi.ts';
import { previewStatusForNewAccount } from './fixtures.ts';

describe('previewStatusForNewAccount', () => {
  it('starts Getting Started, then General Information, then Passport Details', () => {
    const me = previewStatusForNewAccount({
      name: 'Sam Hostetler',
      email: 'sam@example.com',
    });
    assert.equal(me.email, 'sam@example.com');
    assert.equal(me.name, 'Sam Hostetler');
    assert.deepEqual(
      me.steps.map((step) => step.id),
      [...SHORT_TERM_STEP_IDS],
    );
    const info = me.steps.find((step) => step.id === 'application_received');
    assert.equal(info?.title, 'Getting Started');
    assert.equal(info?.status, 'not_started');
    assert.equal(
      me.steps.find((step) => step.id === 'pastor_reference')?.title,
      'General Information',
    );
    assert.equal(
      me.steps.find((step) => step.id === 'in_review')?.title,
      'Passport Details',
    );
    assert.equal(
      me.steps.find((step) => step.id === 'background_check')?.title,
      'Profile Photo',
    );
    assert.equal(
      me.steps.find((step) => step.id === 'child_safeguarding')?.title,
      'History / Skills / Languages',
    );
    assert.equal(
      me.steps.find((step) => step.id === 'approved')?.title,
      'Family Status',
    );
    assert.equal(
      me.steps.find((step) => step.id === 'flight_info')?.title,
      'Spouse Application',
    );
    assert.equal(
      me.steps.find((step) => step.id === 'invoice')?.title,
      'Term of Service',
    );
    assert.equal(
      me.steps.find((step) => step.id === 'sent_to_field')?.title,
      'Other Contacts',
    );
    assert.equal(
      me.steps.find((step) => step.id === 'guidelines')?.title,
      'Guidelines',
    );
    assert.equal(
      me.steps.find((step) => step.id === 'in_review')?.status,
      'not_started',
    );
  });
});
