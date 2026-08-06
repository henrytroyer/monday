/**
 * PermissionGate.tsx — Block page content until permissions resolve; deny if missing.
 */

import type { ReactNode } from 'react';
import { usePermissions } from '../../context/PermissionsContext';
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

  if (!ready) {
    return (
      <div className="flex h-full min-h-[240px] items-center justify-center text-sm text-crm-slate">
        Checking permissions…
      </div>
    );
  }

  const allowed = permission
    ? hasPermission(permission)
    : (anyOf ?? []).some((key) => hasPermission(key));

  if (!allowed) return <AccessDeniedPage />;
  return <>{children}</>;
}
