/**
 * SectionGate.tsx — Render children only when the operator may view a CRM section.
 * When CRM RBAC is disabled, always renders children.
 */

import type { ReactNode } from 'react';
import { usePermissions } from '../context/usePermissions';
import { CRM_PERMISSIONS_DISABLED } from './crmPermissionsDisabled';
import type { SectionId } from './sectionCatalog';

export default function SectionGate({
  id,
  children,
  fallback = null,
}: {
  id: SectionId;
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const { ready, canViewSection } = usePermissions();
  if (CRM_PERMISSIONS_DISABLED) return <>{children}</>;
  if (!ready) return null;
  if (!canViewSection(id)) return <>{fallback}</>;
  return <>{children}</>;
}
