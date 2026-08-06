/**
 * devGuards.ts — Special DEV / last-DEV protections for CRM RBAC.
 */

import { hasRole } from './resolveEffectivePermissions';
import { normalizeCrmRoles, type CrmRole } from './roles';

export class CrmPermissionError extends Error {
  readonly code = 'CRM_PERMISSION_DENIED';
  constructor(message = 'Permission denied. Reach out to the developer.') {
    super(message);
    this.name = 'CrmPermissionError';
  }
}

export function assertCanAssignRoles(options: {
  actorRoles: string[];
  targetRolesBefore: string[];
  targetRolesAfter: string[];
  activeDevEmails: string[];
  targetEmail: string;
  actorEmail: string;
}): void {
  const actor = normalizeCrmRoles(options.actorRoles);
  const before = normalizeCrmRoles(options.targetRolesBefore);
  const after = normalizeCrmRoles(options.targetRolesAfter);
  const actorIsDev = actor.includes('DEV');
  const actorIsAdmin = actor.includes('ADMIN') || actorIsDev;

  if (!actorIsAdmin) {
    throw new CrmPermissionError();
  }

  const addingDev = after.includes('DEV') && !before.includes('DEV');
  const removingDev = before.includes('DEV') && !after.includes('DEV');

  if ((addingDev || removingDev) && !actorIsDev) {
    throw new CrmPermissionError(
      'Permission denied. Reach out to the developer.',
    );
  }

  if (before.includes('DEV') && !actorIsDev) {
    throw new CrmPermissionError(
      'Permission denied. Reach out to the developer.',
    );
  }

  if (removingDev) {
    const remaining = options.activeDevEmails
      .map((e) => e.trim().toLowerCase())
      .filter((e) => e && e !== options.targetEmail.trim().toLowerCase());
    if (remaining.length === 0) {
      throw new CrmPermissionError(
        'Cannot remove DEV from the last active developer.',
      );
    }
    if (
      options.actorEmail.trim().toLowerCase() ===
        options.targetEmail.trim().toLowerCase() &&
      remaining.length === 0
    ) {
      throw new CrmPermissionError(
        'Cannot remove DEV from the last active developer.',
      );
    }
  }
}

export function assertCanDeactivateOperator(options: {
  actorRoles: string[];
  targetRoles: string[];
  targetEmail: string;
  activeDevEmails: string[];
}): void {
  const actorIsDev = hasRole(options.actorRoles, 'DEV');
  const targetIsDev = hasRole(options.targetRoles, 'DEV');

  if (targetIsDev && !actorIsDev) {
    throw new CrmPermissionError();
  }

  if (targetIsDev) {
    const remaining = options.activeDevEmails
      .map((e) => e.trim().toLowerCase())
      .filter((e) => e && e !== options.targetEmail.trim().toLowerCase());
    if (remaining.length === 0) {
      throw new CrmPermissionError(
        'Cannot deactivate the last active developer.',
      );
    }
  }
}

export function rolesAssignableByActor(actorRoles: string[]): CrmRole[] {
  const actor = normalizeCrmRoles(actorRoles);
  if (actor.includes('DEV')) {
    return ['BASIC', 'HR', 'FINANCE', 'COMMUNICATIONS', 'ADMIN', 'DEV'];
  }
  if (actor.includes('ADMIN')) {
    return ['BASIC', 'HR', 'FINANCE', 'COMMUNICATIONS', 'ADMIN'];
  }
  return [];
}
