import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_ROLE_PERMISSIONS } from './defaults.ts';
import {
  hasPermission,
  resolveEffectivePermissions,
} from './resolveEffectivePermissions.ts';

describe('resolveEffectivePermissions', () => {
  it('unions permissions across assigned roles', () => {
    const perms = resolveEffectivePermissions(['BASIC', 'HR', 'FINANCE']);
    assert.equal(hasPermission(perms, 'contacts.view'), true);
    assert.equal(hasPermission(perms, 'hr.applications.view'), true);
    assert.equal(hasPermission(perms, 'finance.donations.view'), true);
    assert.equal(hasPermission(perms, 'settings.view'), false);
  });

  it('defaults empty roles to BASIC', () => {
    const perms = resolveEffectivePermissions([]);
    assert.equal(hasPermission(perms, 'contacts.view'), true);
    assert.equal(hasPermission(perms, 'hr.view'), false);
    assert.equal(hasPermission(perms, 'users.view'), false);
  });

  it('DEV always receives every catalog permission', () => {
    const perms = resolveEffectivePermissions(['DEV'], {
      ...DEFAULT_ROLE_PERMISSIONS,
      DEV: ['contacts.view'],
    });
    assert.equal(hasPermission(perms, 'settings.permissions.manage'), true);
    assert.equal(hasPermission(perms, 'settings.logs.view'), true);
    assert.equal(hasPermission(perms, 'users.assign_roles'), true);
  });

  it('ADMIN does not receive settings.* by default', () => {
    const perms = resolveEffectivePermissions(['ADMIN']);
    assert.equal(hasPermission(perms, 'users.view'), true);
    assert.equal(hasPermission(perms, 'settings.view'), false);
    assert.equal(hasPermission(perms, 'settings.permissions.manage'), false);
  });

  it('domain view expands to full domain access (except contacts)', () => {
    const hrOnlyView = resolveEffectivePermissions(['BASIC'], {
      ...DEFAULT_ROLE_PERMISSIONS,
      BASIC: ['contacts.view', 'hr.view'],
    });
    assert.equal(hasPermission(hrOnlyView, 'hr.documents.delete'), true);
    assert.equal(hasPermission(hrOnlyView, 'hr.confidential_notes.edit'), true);
    // contacts.view must not grant contacts.delete
    assert.equal(hasPermission(hrOnlyView, 'contacts.delete'), false);
  });
});
