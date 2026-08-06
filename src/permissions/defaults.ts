/**
 * defaults.ts — Initial role → permission mapping for CRM RBAC.
 */

import { PERMISSION_KEYS, type PermissionKey } from './permissionKeys';
import type { CrmRole } from './roles';

const BASIC: PermissionKey[] = [
  'contacts.view',
  'contacts.profile.self_edit',
];

const HR: PermissionKey[] = [
  ...BASIC,
  'contacts.create',
  'contacts.edit',
  'hr.view',
  'hr.edit',
  'hr.references.view',
  'hr.references.edit',
  'hr.confidential_notes.view',
  'hr.confidential_notes.edit',
  'hr.documents.view',
  'hr.documents.upload',
  'hr.documents.delete',
  'hr.applications.view',
  'hr.applications.edit',
  'hr.recruitment.view',
  'hr.recruitment.edit',
  'hr.longterm.view',
  'hr.longterm.edit',
  'history.view',
];

const FINANCE: PermissionKey[] = [
  ...BASIC,
  'finance.view',
  'finance.donations.view',
  'finance.donations.create',
  'finance.donations.edit',
  'finance.donations.delete',
  'finance.invoices.view',
  'finance.invoices.create',
  'finance.invoices.edit',
  'finance.invoices.delete',
  'finance.reports.view',
  'finance.export',
  'history.view',
];

const COMMUNICATIONS: PermissionKey[] = [
  ...BASIC,
  'communications.view',
  'communications.email.view',
  'communications.email.send',
  'communications.email.templates.manage',
  'communications.campaigns.view',
  'communications.campaigns.create',
  'communications.campaigns.send',
  'communications.sms.send',
  'history.view',
];

const ADMIN: PermissionKey[] = [
  ...BASIC,
  'contacts.create',
  'contacts.edit',
  'contacts.export',
  'contacts.merge',
  'hr.view',
  'hr.applications.view',
  'hr.recruitment.view',
  'hr.longterm.view',
  'finance.view',
  'finance.donations.view',
  'communications.view',
  'communications.email.view',
  'users.view',
  'users.create',
  'users.edit',
  'users.deactivate',
  'users.assign_roles',
  'history.view',
];

const DEV: PermissionKey[] = [...PERMISSION_KEYS];

export const DEFAULT_ROLE_PERMISSIONS: Record<CrmRole, PermissionKey[]> = {
  BASIC: unique(BASIC),
  HR: unique(HR),
  FINANCE: unique(FINANCE),
  COMMUNICATIONS: unique(COMMUNICATIONS),
  ADMIN: unique(ADMIN),
  DEV: unique(DEV),
};

function unique(keys: PermissionKey[]): PermissionKey[] {
  return [...new Set(keys)];
}
