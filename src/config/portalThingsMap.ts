/**
 * portalThingsMap.ts — Column titles / singleton names for the Portal Things board.
 */

function env(key: string): string | undefined {
  try {
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      const value = import.meta.env[key];
      return typeof value === 'string' && value.trim() ? value.trim() : undefined;
    }
  } catch {
    // Node seed scripts may not have import.meta.env
  }
  return undefined;
}

export const PORTAL_THINGS_BOARD_NAME =
  env('VITE_PORTAL_THINGS_BOARD_NAME') || 'Portal Things';

export const portalThingsMap = {
  boardName: PORTAL_THINGS_BOARD_NAME,
  kind: env('VITE_PORTAL_COL_KIND') || 'Kind',
  entityId: env('VITE_PORTAL_COL_ENTITY_ID') || 'Entity ID',
  entityType: env('VITE_PORTAL_COL_ENTITY_TYPE') || 'Entity Type',
  linkedContactId:
    env('VITE_PORTAL_COL_LINKED_CONTACT_ID') || 'Linked Contact ID',
  linkedApplicationId:
    env('VITE_PORTAL_COL_LINKED_APPLICATION_ID') || 'Linked Application ID',
  payloadJson: env('VITE_PORTAL_COL_PAYLOAD_JSON') || 'Payload JSON',
  lastSyncedAt: env('VITE_PORTAL_COL_LAST_SYNCED_AT') || 'Last Synced At',
  email: env('VITE_PORTAL_COL_EMAIL') || 'Email',
  phone: env('VITE_PORTAL_COL_PHONE') || 'Phone',
  assignedTo: env('VITE_PORTAL_COL_ASSIGNED_TO') || 'Assigned To',
  sourceContactId:
    env('VITE_PORTAL_COL_SOURCE_CONTACT_ID') || 'Source Contact ID',
} as const;

export const PORTAL_GROUP_ONBOARDING = 'Onboarding';
export const PORTAL_GROUP_RECRUITMENT = 'Recruitment';
export const PORTAL_GROUP_CONFIG = 'Config';
export const PORTAL_GROUP_AUDIT = 'Audit';

export const PORTAL_KIND = {
  onboarding: 'onboarding',
  prospect: 'prospect',
  noteReviewRegistry: 'note_review_registry',
  emailSignatures: 'email_signatures',
  settings: 'settings',
  auditEvent: 'audit_event',
} as const;

export const PORTAL_ENTITY_TYPE = {
  application: 'application',
  longtermApplication: 'longterm_application',
  prospect: 'prospect',
  config: 'config',
  audit: 'audit',
} as const;

export const PORTAL_CONFIG_ITEM = {
  noteReviewRegistry: 'Note Review Registry',
  emailSignatures: 'Email Signatures',
  portalSettings: 'Portal Settings',
} as const;

export type PortalThingsMapKey = keyof typeof portalThingsMap;
