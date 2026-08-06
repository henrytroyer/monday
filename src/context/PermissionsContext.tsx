/**
 * PermissionsContext.tsx — Effective CRM permissions for the signed-in operator.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useCurrentUser } from './CurrentUserContext';
import { DEFAULT_ROLE_PERMISSIONS } from '../permissions/defaults';
import {
  hasPermission as hasPerm,
  resolveEffectivePermissions,
} from '../permissions/resolveEffectivePermissions';
import type { PermissionKey } from '../permissions/permissionKeys';
import type { CrmRole } from '../permissions/roles';
import { normalizeCrmRoles } from '../permissions/roles';
import type { CrmOperatorRecord, RolePermissionsPayload } from '../permissions/types';
import { setCrmPermissionsRuntime } from '../permissions/crmPermissionsRuntime';
import { showPermissionDenied } from '../permissions/PermissionDeniedToast';
import { setOperatorProfileOverlay } from '../services/crmOperatorProfile';
import {
  ensureOperatorForEmail,
  loadRolePermissionsPayload,
} from '../services/crmRbacBoard';
import { CrmPermissionError } from '../permissions/devGuards';

interface PermissionsContextValue {
  ready: boolean;
  operator: CrmOperatorRecord | null;
  roles: CrmRole[];
  permissions: Set<PermissionKey>;
  rolePermissions: RolePermissionsPayload;
  hasPermission: (key: PermissionKey) => boolean;
  hasRole: (role: CrmRole) => boolean;
  requirePermission: (key: PermissionKey) => void;
  refresh: () => Promise<void>;
}

const PermissionsContext = createContext<PermissionsContextValue | null>(null);

export function PermissionsProvider({ children }: { children: ReactNode }) {
  const { user } = useCurrentUser();
  const [ready, setReady] = useState(false);
  const [operator, setOperator] = useState<CrmOperatorRecord | null>(null);
  const [rolePermissions, setRolePermissions] = useState<RolePermissionsPayload>(
    {
      version: 1,
      roles: [],
      permissions: [],
      rolePermissions: DEFAULT_ROLE_PERMISSIONS,
    },
  );

  const refresh = useCallback(async () => {
    // Keep prior permissions on screen — never flash "Checking permissions…".
    try {
      const matrix = await loadRolePermissionsPayload();
      setRolePermissions(matrix);
      const email = user?.email?.trim();
      if (!email) {
        setOperator({
          email: 'anonymous',
          displayName: user?.name || 'Coordinator',
          roles: ['BASIC'],
          status: 'active',
        });
        return;
      }
      const op = await ensureOperatorForEmail(email, user?.name);
      setOperator(op);
      if (op.displayName || op.photoUrl) {
        setOperatorProfileOverlay({
          email: op.email,
          displayName: op.displayName,
          photoUrl: op.photoUrl,
        });
      }
    } catch (err) {
      console.warn(
        'CRM permissions load failed:',
        err instanceof Error ? err.message : err,
      );
      setOperator((prev) =>
        prev ?? {
          email: user?.email || 'anonymous',
          displayName: user?.name || 'Coordinator',
          roles: ['BASIC'],
          status: 'active',
        },
      );
    } finally {
      setReady(true);
    }
  }, [user?.email, user?.name]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const roles = useMemo(
    () => normalizeCrmRoles(operator?.roles),
    [operator?.roles],
  );

  const permissions = useMemo(
    () =>
      resolveEffectivePermissions(roles, rolePermissions.rolePermissions),
    [roles, rolePermissions.rolePermissions],
  );

  useEffect(() => {
    setCrmPermissionsRuntime({
      ready,
      email: operator?.email ?? user?.email ?? null,
      roles,
      permissions,
    });
  }, [ready, operator?.email, user?.email, roles, permissions]);

  const value = useMemo<PermissionsContextValue>(
    () => ({
      ready,
      operator,
      roles,
      permissions,
      rolePermissions,
      hasPermission: (key) => hasPerm(permissions, key),
      hasRole: (role) => roles.includes(role),
      requirePermission: (key) => {
        if (!hasPerm(permissions, key)) {
          showPermissionDenied();
          throw new CrmPermissionError();
        }
      },
      refresh,
    }),
    [ready, operator, roles, permissions, rolePermissions, refresh],
  );

  return (
    <PermissionsContext.Provider value={value}>
      {children}
    </PermissionsContext.Provider>
  );
}

export function usePermissions(): PermissionsContextValue {
  const ctx = useContext(PermissionsContext);
  if (!ctx) {
    throw new Error('usePermissions must be used within PermissionsProvider');
  }
  return ctx;
}

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
