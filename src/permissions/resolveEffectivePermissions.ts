/**
 * resolveEffectivePermissions.ts — Union permissions across assigned CRM roles.
 *
 * Domain view = full access: holding `hr.view` grants every `hr.*` key
 * (same for contacts / finance / communications / users / settings / history).
 */

import { DEFAULT_ROLE_PERMISSIONS } from './defaults';
import {
  PERMISSION_KEYS,
  isPermissionKey,
  type PermissionKey,
} from './permissionKeys';
import { normalizeCrmRoles, type CrmRole } from './roles';
import {
  VISIBILITY_DOMAIN_META,
  VISIBILITY_DOMAINS,
} from './sectionCatalog';

/**
 * If operator has a domain's view key, grant every permission in that domain.
 * Contacts stays an exception: `contacts.view` is identity-only; create/edit/delete
 * still require those keys (BASIC must not become full contact admin).
 */
export function expandDomainViewToFullAccess(
  effective: Set<PermissionKey>,
): Set<PermissionKey> {
  const next = new Set(effective);
  for (const domain of VISIBILITY_DOMAINS) {
    if (domain === 'contacts') continue;
    const viewKey = VISIBILITY_DOMAIN_META[domain].viewPermission;
    if (!next.has(viewKey)) continue;
    const prefix = `${domain}.`;
    for (const key of PERMISSION_KEYS) {
      if (key === viewKey || key.startsWith(prefix)) next.add(key);
    }
  }
  return next;
}

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

  return expandDomainViewToFullAccess(effective);
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
