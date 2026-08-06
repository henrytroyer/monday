/**
 * PermissionsContext.tsx — Effective CRM permissions for the signed-in operator.
 *
 * When CRM_PERMISSIONS_DISABLED: no Portal Things RBAC fetch; every operator
 * gets full access immediately after identity resolves.
 *
 * Context object lives in permissionsContextBase (usePermissions reads it).
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useCurrentUser } from './useCurrentUser';
import {
  PermissionsContext,
  type PermissionsContextValue,
} from './permissionsContextBase';
import { DEFAULT_ROLE_PERMISSIONS } from '../permissions/defaults';
import { CRM_PERMISSIONS_DISABLED } from '../permissions/crmPermissionsDisabled';
import { hasPermission as hasPerm } from '../permissions/resolveEffectivePermissions';
import {
  PERMISSION_KEYS,
  type PermissionKey,
} from '../permissions/permissionKeys';
import { normalizeCrmRoles } from '../permissions/roles';
import { canViewSection as canViewSectionResolved } from '../permissions/resolveSectionPermission';
import type { CrmOperatorRecord, RolePermissionsPayload } from '../permissions/types';
import { setCrmPermissionsRuntime } from '../permissions/crmPermissionsRuntime';
import { showPermissionDenied } from '../permissions/PermissionDeniedToast';
import { CrmPermissionError } from '../permissions/devGuards';
import { usePermissions } from './usePermissions';

export type { PermissionsContextValue };

const OPEN_MATRIX: RolePermissionsPayload = {
  version: 1,
  roles: [],
  permissions: [],
  rolePermissions: DEFAULT_ROLE_PERMISSIONS,
  sectionVisibilityOverrides: {},
};

const ALL_PERMISSIONS = new Set<PermissionKey>(PERMISSION_KEYS);

export function PermissionsProvider({ children }: { children: ReactNode }) {
  const { user, isLoading: userLoading } = useCurrentUser();
  const [ready, setReady] = useState(false);
  const [operator, setOperator] = useState<CrmOperatorRecord | null>(null);

  const applyOpenAccess = useCallback(() => {
    const email = user?.email?.trim() || 'anonymous';
    const op: CrmOperatorRecord = {
      email,
      displayName: user?.name?.trim() || 'Coordinator',
      roles: ['DEV'],
      status: 'active',
    };
    setCrmPermissionsRuntime({
      ready: true,
      email: email === 'anonymous' ? null : email,
      roles: ['DEV'],
      permissions: ALL_PERMISSIONS,
      sectionVisibilityOverrides: {},
    });
    setReady(true);
    return op;
  }, [user?.email, user?.name]);

  const refresh = useCallback(async () => {
    setOperator(applyOpenAccess());
  }, [applyOpenAccess]);

  useEffect(() => {
    if (userLoading) {
      setReady(false);
      return;
    }
    setOperator(applyOpenAccess());
  }, [userLoading, applyOpenAccess]);

  const roles = useMemo(
    () => normalizeCrmRoles(operator?.roles ?? ['DEV']),
    [operator?.roles],
  );

  const sectionVisibilityOverrides = useMemo(
    () => OPEN_MATRIX.sectionVisibilityOverrides ?? {},
    [],
  );

  const readyForUser = !userLoading && ready;

  const value = useMemo<PermissionsContextValue>(
    () => ({
      ready: readyForUser,
      operator,
      roles,
      permissions: ALL_PERMISSIONS,
      rolePermissions: OPEN_MATRIX,
      sectionVisibilityOverrides,
      hasPermission: (key) =>
        CRM_PERMISSIONS_DISABLED ? true : hasPerm(ALL_PERMISSIONS, key),
      hasRole: (role) =>
        CRM_PERMISSIONS_DISABLED ? true : roles.includes(role),
      canViewSection: (sectionId) =>
        CRM_PERMISSIONS_DISABLED
          ? true
          : canViewSectionResolved(
              sectionId,
              ALL_PERMISSIONS,
              sectionVisibilityOverrides,
            ),
      requirePermission: (key) => {
        if (CRM_PERMISSIONS_DISABLED) return;
        if (!hasPerm(ALL_PERMISSIONS, key)) {
          showPermissionDenied();
          throw new CrmPermissionError();
        }
      },
      refresh,
    }),
    [
      readyForUser,
      operator,
      roles,
      sectionVisibilityOverrides,
      refresh,
    ],
  );

  return (
    <PermissionsContext.Provider value={value}>
      {children}
    </PermissionsContext.Provider>
  );
}

export { usePermissions };

export function Can({
  permission,
  children,
  fallback = null,
}: {
  permission: PermissionKey;
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const { ready, hasPermission } = usePermissions();
  if (!ready) return null;
  if (!hasPermission(permission)) return <>{fallback}</>;
  return <>{children}</>;
}
