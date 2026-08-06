/**
 * Can.tsx — Conditional render by CRM permission.
 */

import type { ReactNode } from 'react';
import { usePermissions } from '../context/usePermissions';
import type { PermissionKey } from './permissionKeys';

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
