import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { PermissionKey } from './permissionKeys.ts';
import {
  canViewSection,
  getDomainForSection,
  getRequiredPermissionForSection,
  sanitizeSectionVisibilityOverrides,
} from './resolveSectionPermission.ts';

describe('resolveSectionPermission', () => {
  it('uses catalog domain defaults', () => {
    assert.equal(getDomainForSection('contact.donations'), 'finance');
    assert.equal(getDomainForSection('contact.profile'), 'contacts');
    assert.equal(
      getRequiredPermissionForSection('contact.donations'),
      'finance.view',
    );
  });

  it('prefers DEV domain overrides', () => {
    assert.equal(
      getDomainForSection('contact.email_history', {
        'contact.email_history': 'hr',
      }),
      'hr',
    );
    assert.equal(
      getRequiredPermissionForSection('contact.email_history', {
        'contact.email_history': 'hr',
      }),
      'hr.view',
    );
  });

  it('gates visibility by domain view permission', () => {
    const finance = new Set<PermissionKey>(['contacts.view', 'finance.view']);
    assert.equal(canViewSection('contact.profile', finance), true);
    assert.equal(canViewSection('contact.donations', finance), true);
    assert.equal(canViewSection('contact.files', finance), false);
  });

  it('sanitizes overrides and migrates legacy permission keys', () => {
    const cleaned = sanitizeSectionVisibilityOverrides({
      'contact.donations': 'hr',
      'contact.profile': 'contacts',
      'contact.files': 'hr.documents.view',
      'not.a.section': 'finance',
      'contact.terms': 'not-a-domain',
    });
    assert.deepEqual(cleaned, {
      'contact.donations': 'hr',
      // contact.files default is already hr — legacy key maps to hr → omitted
    });
  });
});
