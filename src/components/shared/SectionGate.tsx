/**
 * SectionGate.tsx — Passthrough (CRM RBAC removed; all sections visible).
 */

import type { ReactNode } from 'react';

export default function SectionGate({
  children,
}: {
  id?: string;
  children: ReactNode;
  fallback?: ReactNode;
}) {
  return <>{children}</>;
}
