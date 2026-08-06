/**
 * PermissionGate.tsx — Page allow/deny wrapper.
 * When CRM RBAC is disabled, always renders children.
 */

import type { ReactNode } from 'react';
import { usePermissions } from '../../context/usePermissions';
import { CRM_PERMISSIONS_DISABLED } from '../../permissions/crmPermissionsDisabled';
import type { PermissionKey } from '../../permissions/permissionKeys';
import AccessDeniedPage from './AccessDeniedPage';

export default function PermissionGate({
  permission,
  anyOf,
  children,
}: {
  permission?: PermissionKey;
  anyOf?: PermissionKey[];
  children: ReactNode;
}) {
  const { ready, hasPermission } = usePermissions();

  if (CRM_PERMISSIONS_DISABLED) {
    return <>{children}</>;
  }

  if (!ready) return null;

  const allowed = permission
    ? hasPermission(permission)
    : (anyOf ?? []).some((key) => hasPermission(key));

  if (!allowed) return <AccessDeniedPage />;
  return <>{children}</>;
}
