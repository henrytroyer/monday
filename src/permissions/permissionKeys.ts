/**
 * permissionKeys.ts — CRM permission catalog (resource.action).
 */

export const PERMISSION_CATEGORIES = [
  'contacts',
  'hr',
  'finance',
  'communications',
  'users',
  'settings',
  'applications',
  'recruitment',
  'history',
] as const;

export type PermissionCategory = (typeof PERMISSION_CATEGORIES)[number];

export const PERMISSION_KEYS = [
  'contacts.view',
  'contacts.create',
  'contacts.edit',
  'contacts.delete',
  'contacts.export',
  'contacts.merge',
  'contacts.profile.self_edit',

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

  'communications.view',
  'communications.email.view',
  'communications.email.send',
  'communications.email.templates.manage',
  'communications.campaigns.view',
  'communications.campaigns.create',
  'communications.campaigns.send',
  'communications.sms.send',

  'users.view',
  'users.create',
  'users.edit',
  'users.deactivate',
  'users.assign_roles',

  'settings.view',
  'settings.permissions.manage',
  'settings.integrations.manage',
  'settings.security.manage',
  'settings.api_keys.manage',
  'settings.logs.view',

  'history.view',
] as const;

export type PermissionKey = (typeof PERMISSION_KEYS)[number];

export interface PermissionDef {
  key: PermissionKey;
  displayName: string;
  description: string;
  category: PermissionCategory;
}

function def(
  key: PermissionKey,
  displayName: string,
  description: string,
  category: PermissionCategory,
): PermissionDef {
  return { key, displayName, description, category };
}

export const PERMISSION_CATALOG: PermissionDef[] = [
  def('contacts.view', 'View contacts', 'View basic contact profiles', 'contacts'),
  def('contacts.create', 'Create contacts', 'Create contact records', 'contacts'),
  def('contacts.edit', 'Edit contacts', 'Edit contact fields', 'contacts'),
  def('contacts.delete', 'Delete contacts', 'Delete contact records', 'contacts'),
  def('contacts.export', 'Export contacts', 'Export contact lists', 'contacts'),
  def('contacts.merge', 'Merge contacts', 'Merge duplicate contacts', 'contacts'),
  def(
    'contacts.profile.self_edit',
    'Edit own profile',
    'Update the signed-in operator profile',
    'contacts',
  ),

  def('hr.view', 'View HR', 'Access HR areas', 'hr'),
  def('hr.edit', 'Edit HR', 'Edit HR records', 'hr'),
  def('hr.references.view', 'View references', 'View pastor/employer references', 'hr'),
  def('hr.references.edit', 'Edit references', 'Manage references', 'hr'),
  def(
    'hr.confidential_notes.view',
    'View confidential notes',
    'View confidential HR notes',
    'hr',
  ),
  def(
    'hr.confidential_notes.edit',
    'Edit confidential notes',
    'Create/edit confidential HR notes',
    'hr',
  ),
  def('hr.documents.view', 'View HR documents', 'View personnel documents', 'hr'),
  def('hr.documents.upload', 'Upload HR documents', 'Upload personnel documents', 'hr'),
  def('hr.documents.delete', 'Delete HR documents', 'Delete personnel documents', 'hr'),
  def('hr.applications.view', 'View applications', 'View short-term applications', 'hr'),
  def('hr.applications.edit', 'Edit applications', 'Edit short-term applications', 'hr'),
  def('hr.recruitment.view', 'View recruitment', 'View recruitment prospects', 'hr'),
  def('hr.recruitment.edit', 'Edit recruitment', 'Manage recruitment prospects', 'hr'),
  def('hr.longterm.view', 'View long-term apps', 'View long-term applications', 'hr'),
  def('hr.longterm.edit', 'Edit long-term apps', 'Edit long-term applications', 'hr'),

  def('finance.view', 'View finance', 'Access finance areas', 'finance'),
  def('finance.donations.view', 'View donations', 'View donation records', 'finance'),
  def('finance.donations.create', 'Create donations', 'Create donation records', 'finance'),
  def('finance.donations.edit', 'Edit donations', 'Edit donation records', 'finance'),
  def('finance.donations.delete', 'Delete donations', 'Delete donation records', 'finance'),
  def('finance.invoices.view', 'View invoices', 'View invoices', 'finance'),
  def('finance.invoices.create', 'Create invoices', 'Create invoices', 'finance'),
  def('finance.invoices.edit', 'Edit invoices', 'Edit invoices', 'finance'),
  def('finance.invoices.delete', 'Delete invoices', 'Delete invoices', 'finance'),
  def('finance.reports.view', 'View finance reports', 'View financial reports', 'finance'),
  def('finance.export', 'Export finance', 'Export financial data', 'finance'),

  def('communications.view', 'View communications', 'Access communications', 'communications'),
  def('communications.email.view', 'View email', 'View email threads', 'communications'),
  def('communications.email.send', 'Send email', 'Send CRM email', 'communications'),
  def(
    'communications.email.templates.manage',
    'Manage email templates',
    'Create/edit email templates',
    'communications',
  ),
  def('communications.campaigns.view', 'View campaigns', 'View campaigns', 'communications'),
  def(
    'communications.campaigns.create',
    'Create campaigns',
    'Create campaigns',
    'communications',
  ),
  def('communications.campaigns.send', 'Send campaigns', 'Send campaigns', 'communications'),
  def('communications.sms.send', 'Send SMS', 'Send SMS messages', 'communications'),

  def('users.view', 'View users', 'View CRM operators', 'users'),
  def('users.create', 'Create users', 'Create CRM operators', 'users'),
  def('users.edit', 'Edit users', 'Edit CRM operators', 'users'),
  def('users.deactivate', 'Deactivate users', 'Activate/deactivate operators', 'users'),
  def('users.assign_roles', 'Assign roles', 'Assign non-DEV role tags', 'users'),

  def('settings.view', 'View Settings', 'Open Settings (DEV)', 'settings'),
  def(
    'settings.permissions.manage',
    'Manage permissions',
    'Edit role permission matrix',
    'settings',
  ),
  def(
    'settings.integrations.manage',
    'Manage integrations',
    'Manage system integrations',
    'settings',
  ),
  def('settings.security.manage', 'Manage security', 'Change security settings', 'settings'),
  def('settings.api_keys.manage', 'Manage API keys', 'Manage API keys/secrets', 'settings'),
  def('settings.logs.view', 'View audit logs', 'View technical audit logs', 'settings'),

  def('history.view', 'View history', 'View board activity history', 'history'),
];

export function isPermissionKey(value: string): value is PermissionKey {
  return (PERMISSION_KEYS as readonly string[]).includes(value);
}

export function categoryForPermission(key: PermissionKey): PermissionCategory {
  return (
    PERMISSION_CATALOG.find((p) => p.key === key)?.category ??
    (key.split('.')[0] as PermissionCategory)
  );
}
