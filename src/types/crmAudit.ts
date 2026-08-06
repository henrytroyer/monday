/**
 * crmAudit.ts — Append-only CRM audit event shapes (Portal Things Audit group).
 */

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
  targetType:
    | 'operator'
    | 'role'
    | 'permission'
    | 'section'
    | 'settings'
    | 'system';
  targetId?: string;
  targetEmail?: string;
  before?: unknown;
  after?: unknown;
  timestamp: string;
  meta?: Record<string, unknown>;
}
