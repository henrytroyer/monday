import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  assertCanAssignRoles,
  assertCanDeactivateOperator,
  CrmPermissionError,
  rolesAssignableByActor,
} from './devGuards.ts';

describe('devGuards', () => {
  it('ADMIN cannot assign DEV', () => {
    assert.throws(
      () =>
        assertCanAssignRoles({
          actorRoles: ['BASIC', 'ADMIN'],
          targetRolesBefore: ['BASIC'],
          targetRolesAfter: ['BASIC', 'DEV'],
          activeDevEmails: ['henry@i58global.org'],
          targetEmail: 'shane@i58global.org',
          actorEmail: 'admin@i58global.org',
        }),
      CrmPermissionError,
    );
  });

  it('ADMIN cannot edit an existing DEV account', () => {
    assert.throws(
      () =>
        assertCanAssignRoles({
          actorRoles: ['BASIC', 'ADMIN'],
          targetRolesBefore: ['BASIC', 'DEV'],
          targetRolesAfter: ['BASIC', 'DEV', 'HR'],
          activeDevEmails: ['henry@i58global.org'],
          targetEmail: 'henry@i58global.org',
          actorEmail: 'admin@i58global.org',
        }),
      CrmPermissionError,
    );
  });

  it('protects the last active DEV', () => {
    assert.throws(
      () =>
        assertCanAssignRoles({
          actorRoles: ['BASIC', 'DEV'],
          targetRolesBefore: ['BASIC', 'DEV'],
          targetRolesAfter: ['BASIC'],
          activeDevEmails: ['henry@i58global.org'],
          targetEmail: 'henry@i58global.org',
          actorEmail: 'henry@i58global.org',
        }),
      /last active developer/i,
    );
  });

  it('allows DEV to revoke DEV when another remains', () => {
    assert.doesNotThrow(() =>
      assertCanAssignRoles({
        actorRoles: ['BASIC', 'DEV'],
        targetRolesBefore: ['BASIC', 'DEV'],
        targetRolesAfter: ['BASIC'],
        activeDevEmails: ['henry@i58global.org', 'lesvos@i58global.org'],
        targetEmail: 'henry@i58global.org',
        actorEmail: 'lesvos@i58global.org',
      }),
    );
  });

  it('cannot deactivate the last DEV', () => {
    assert.throws(
      () =>
        assertCanDeactivateOperator({
          actorRoles: ['BASIC', 'DEV'],
          targetRoles: ['BASIC', 'DEV'],
          targetEmail: 'henry@i58global.org',
          activeDevEmails: ['henry@i58global.org'],
        }),
      /last active developer/i,
    );
  });

  it('rolesAssignableByActor hides DEV from ADMIN', () => {
    assert.equal(rolesAssignableByActor(['ADMIN']).includes('DEV'), false);
    assert.equal(rolesAssignableByActor(['DEV']).includes('DEV'), true);
  });
});
