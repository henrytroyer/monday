/**
 * usePermissions.ts — Hook for PermissionsContext (separate file for Fast Refresh).
 */

import { useContext } from 'react';
import {
  PermissionsContext,
  type PermissionsContextValue,
} from './permissionsContextBase';

export type { PermissionsContextValue };

export function usePermissions(): PermissionsContextValue {
  const ctx = useContext(PermissionsContext);
  if (!ctx) {
    throw new Error('usePermissions must be used within PermissionsProvider');
  }
  return ctx;
}
