/**
 * permissionsContextBase.ts — Shared context object (no components / no hooks).
 * Kept separate so PermissionsProvider can Fast Refresh without invalidating.
 */

import { createContext } from 'react';
import type { PermissionKey } from '../permissions/permissionKeys';
import type { CrmRole } from '../permissions/roles';
import type { SectionId, SectionVisibilityOverrides } from '../permissions/sectionCatalog';
import type { CrmOperatorRecord, RolePermissionsPayload } from '../permissions/types';

export interface PermissionsContextValue {
  ready: boolean;
  operator: CrmOperatorRecord | null;
  roles: CrmRole[];
  permissions: Set<PermissionKey>;
  rolePermissions: RolePermissionsPayload;
  sectionVisibilityOverrides: SectionVisibilityOverrides;
  hasPermission: (key: PermissionKey) => boolean;
  hasRole: (role: CrmRole) => boolean;
  canViewSection: (sectionId: SectionId) => boolean;
  requirePermission: (key: PermissionKey) => void;
  refresh: () => Promise<void>;
}

export const PermissionsContext = createContext<PermissionsContextValue | null>(
  null,
);
