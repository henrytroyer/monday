/**
 * crmPermissionsRuntime.ts — Non-React access to effective CRM permissions.
 *
 * PermissionsProvider syncs this so services/boards helpers can enforce
 * requirePermission without React context.
 */

import { CrmPermissionError } from './devGuards';
import type { PermissionKey } from './permissionKeys';
import { showPermissionDenied } from './PermissionDeniedToast';
import type { CrmRole } from './roles';

interface CrmPermissionsRuntime {
  ready: boolean;
  email: string | null;
  roles: CrmRole[];
  permissions: Set<PermissionKey>;
}

const runtime: CrmPermissionsRuntime = {
  ready: false,
  email: null,
  roles: ['BASIC'],
  permissions: new Set<PermissionKey>(),
};

export function setCrmPermissionsRuntime(
  next: Partial<CrmPermissionsRuntime>,
): void {
  if (next.ready !== undefined) runtime.ready = next.ready;
  if (next.email !== undefined) runtime.email = next.email;
  if (next.roles) runtime.roles = next.roles;
  if (next.permissions) runtime.permissions = next.permissions;
}

export function getCrmPermissionsRuntime(): Readonly<CrmPermissionsRuntime> {
  return runtime;
}

export function crmPermissionsReady(): boolean {
  return runtime.ready;
}

export function hasCrmPermission(key: PermissionKey): boolean {
  if (!runtime.ready) return true; // fail-open until loaded (UI gates block pages)
  return runtime.permissions.has(key);
}

export function requireCrmPermission(key: PermissionKey): void {
  if (!runtime.ready) return;
  if (!runtime.permissions.has(key)) {
    showPermissionDenied();
    throw new CrmPermissionError();
  }
}

/** True when operator may perform any CRM mutation beyond self-profile. */
export function hasAnyCrmWritePermission(): boolean {
  if (!runtime.ready) return true;
  for (const key of runtime.permissions) {
    if (key === 'contacts.view' || key === 'contacts.profile.self_edit') {
      continue;
    }
    if (
      key.endsWith('.edit') ||
      key.endsWith('.create') ||
      key.endsWith('.delete') ||
      key.endsWith('.upload') ||
      key.endsWith('.send') ||
      key.endsWith('.manage') ||
      key.endsWith('.export') ||
      key.endsWith('.merge') ||
      key.endsWith('.deactivate') ||
      key === 'users.assign_roles'
    ) {
      return true;
    }
  }
  return false;
}
