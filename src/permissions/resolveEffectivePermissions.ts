/**
 * resolveEffectivePermissions.ts — Union permissions across assigned CRM roles.
 */

import { DEFAULT_ROLE_PERMISSIONS } from './defaults';
import {
  isPermissionKey,
  type PermissionKey,
} from './permissionKeys';
import { normalizeCrmRoles, type CrmRole } from './roles';

export function resolveEffectivePermissions(
  roles: string[] | undefined | null,
  rolePermissions: Partial<Record<CrmRole, string[]>> = DEFAULT_ROLE_PERMISSIONS,
): Set<PermissionKey> {
  const normalized = normalizeCrmRoles(roles);
  const effective = new Set<PermissionKey>();

  for (const role of normalized) {
    const keys = rolePermissions[role] ?? DEFAULT_ROLE_PERMISSIONS[role] ?? [];
    for (const key of keys) {
      if (isPermissionKey(key)) effective.add(key);
    }
  }

  // DEV always has everything, even if matrix was tampered.
  if (normalized.includes('DEV')) {
    for (const key of DEFAULT_ROLE_PERMISSIONS.DEV) effective.add(key);
  }

  return effective;
}

export function hasPermission(
  effective: Set<PermissionKey> | PermissionKey[],
  permission: PermissionKey,
): boolean {
  if (effective instanceof Set) return effective.has(permission);
  return effective.includes(permission);
}

export function hasAnyPermission(
  effective: Set<PermissionKey>,
  permissions: PermissionKey[],
): boolean {
  return permissions.some((p) => effective.has(p));
}

export function hasRole(
  roles: string[] | undefined | null,
  role: CrmRole,
): boolean {
  return normalizeCrmRoles(roles).includes(role);
}
