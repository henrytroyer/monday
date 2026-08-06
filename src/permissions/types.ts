/**
 * types.ts — CRM RBAC payload shapes stored on Portal Things.
 */

import type { PermissionDef, PermissionKey } from './permissionKeys';
import type { CrmRole } from './roles';
import type { SectionVisibilityOverrides } from './sectionCatalog';

export type OperatorStatus = 'active' | 'inactive';

export interface CrmOperatorRecord {
  email: string;
  displayName: string;
  roles: CrmRole[];
  status: OperatorStatus;
  photoUrl?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface RolePermissionsPayload {
  version: 1;
  roles: Array<{
    name: CrmRole;
    displayName: string;
    description: string;
    system: true;
  }>;
  permissions: PermissionDef[];
  rolePermissions: Record<CrmRole, PermissionKey[]>;
  /** DEV overrides only — omitted keys use sectionCatalog defaults. */
  sectionVisibilityOverrides?: SectionVisibilityOverrides;
  updatedAt?: string;
}

export type AuditAction =
  | 'ROLE_ASSIGNED'
  | 'ROLE_REMOVED'
  | 'PERMISSION_UPDATED'
  | 'SECTION_VISIBILITY_UPDATED'
  | 'USER_CREATED'
  | 'USER_UPDATED'
  | 'USER_ACTIVATED'
  | 'USER_DEACTIVATED'
  | 'DEV_GRANTED'
  | 'DEV_REVOKED'
  | 'AUTHZ_DENIED'
  | 'SETTINGS_ACCESS'
  | 'SETTINGS_DENIED'
  | 'CONTACT_MERGE'
  | 'CONTACT_MERGE_RUN'
  | 'CONTACT_MERGE_REVERSED';

export interface AuditEventPayload {
  actorEmail: string;
  actorName?: string;
  action: AuditAction;
  targetType: 'operator' | 'role' | 'permission' | 'section' | 'settings' | 'system';
  targetId?: string;
  targetEmail?: string;
  before?: unknown;
  after?: unknown;
  timestamp: string;
  meta?: Record<string, unknown>;
}
