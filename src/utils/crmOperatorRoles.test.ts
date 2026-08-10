/**
 * crmOperatorRoles.test.ts — Rank comparisons for hierarchical private notes.
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  crmRoleRank,
  isCrmRoleAbove,
  normalizeCrmRole,
} from './crmOperatorRoles';

describe('crmOperatorRoles', () => {
  it('normalizes role strings', () => {
    assert.equal(normalizeCrmRole(' Super_Admin '), 'super_admin');
    assert.equal(normalizeCrmRole(null), '');
  });

  it('ranks known roles with ceo above admin', () => {
    assert.ok(crmRoleRank('ceo') > crmRoleRank('admin'));
    assert.ok(crmRoleRank('field_director') > crmRoleRank('pr'));
    assert.equal(crmRoleRank('unknown-role'), crmRoleRank('user'));
  });

  it('isCrmRoleAbove is strict (peers cannot read each other)', () => {
    assert.equal(isCrmRoleAbove('ceo', 'admin'), true);
    assert.equal(isCrmRoleAbove('admin', 'ceo'), false);
    assert.equal(isCrmRoleAbove('admin', 'admin'), false);
    assert.equal(isCrmRoleAbove('pr', 'admin'), false);
  });
});
