import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  CONTACT_SECTION_ORDER,
  applicationSectionOrder,
  contactSectionOrder,
  defaultLandingPageForFocus,
  effectiveWorkFocus,
  orderSectionEntries,
  termSectionOrder,
} from './workFocus.ts';

describe('effectiveWorkFocus', () => {
  it('defaults to general without override', () => {
    assert.equal(effectiveWorkFocus(null), 'general');
    assert.equal(effectiveWorkFocus(undefined), 'general');
    assert.equal(effectiveWorkFocus('not-a-focus'), 'general');
  });

  it('honors a valid local override', () => {
    assert.equal(effectiveWorkFocus('hr'), 'hr');
    assert.equal(effectiveWorkFocus('finance'), 'finance');
  });
});

describe('defaultLandingPageForFocus', () => {
  it('seeds focus-shaped landing pages', () => {
    assert.equal(defaultLandingPageForFocus('hr'), 'applications');
    assert.equal(defaultLandingPageForFocus('finance'), 'contacts');
    assert.equal(defaultLandingPageForFocus('communications'), 'email-templates');
    assert.equal(defaultLandingPageForFocus('general'), 'contacts');
  });
});

describe('section orders', () => {
  it('keeps profile first on contacts for every focus', () => {
    for (const focus of Object.keys(CONTACT_SECTION_ORDER) as Array<
      keyof typeof CONTACT_SECTION_ORDER
    >) {
      assert.equal(contactSectionOrder(focus)[0], 'contact.profile');
    }
  });

  it('puts donations and billing early for finance', () => {
    const order = contactSectionOrder('finance');
    assert.ok(order.indexOf('contact.donations') < order.indexOf('contact.church'));
    assert.ok(order.indexOf('contact.billing') < order.indexOf('contact.files'));
  });

  it('puts current application and terms early for HR', () => {
    const order = contactSectionOrder('hr');
    assert.ok(
      order.indexOf('contact.current_application') <
        order.indexOf('contact.internal_notes'),
    );
    assert.ok(
      order.indexOf('contact.terms') < order.indexOf('contact.email_history'),
    );
  });

  it('promotes invoice for finance applications', () => {
    const order = applicationSectionOrder('finance');
    assert.ok(
      order.indexOf('application.invoice') <
        order.indexOf('application.onboarding'),
    );
  });

  it('promotes term invoice for finance', () => {
    const order = termSectionOrder('finance');
    assert.equal(order[0], 'contact.term_invoice');
  });

  it('orderSectionEntries follows focus order and drops missing keys', () => {
    const ordered = orderSectionEntries('finance', contactSectionOrder('finance'), {
      'contact.profile': 'profile',
      'contact.donations': 'donations',
      'contact.billing': 'billing',
      'contact.files': 'files',
    });
    assert.deepEqual(ordered, ['profile', 'donations', 'billing', 'files']);
  });
});
