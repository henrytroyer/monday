/**
 * navItems.ts — Volunteer Portal sidebar navigation (permission-aware sections).
 */

import type { PermissionKey } from '../permissions/permissionKeys';

export const PRIMARY_NAV_ITEMS = [
  ['contacts', 'Contacts', 'contacts.view'],
  ['applications', 'Short-term applications', 'hr.applications.view'],
  ['recruitment', 'Recruitment', 'hr.recruitment.view'],
  ['longterm-applications', 'Long-term applications', 'hr.longterm.view'],
] as const satisfies ReadonlyArray<readonly [string, string, PermissionKey]>;

export const COMMUNICATIONS_NAV_ITEMS = [
  ['email-templates', 'Email templates', 'communications.email.view'],
  ['email-campaigns', 'Email campaigns', 'communications.campaigns.view'],
] as const satisfies ReadonlyArray<readonly [string, string, PermissionKey]>;

export const HISTORY_NAV_ITEMS = [
  ['history', 'History', 'history.view'],
] as const satisfies ReadonlyArray<readonly [string, string, PermissionKey]>;

export const USERS_NAV_ITEMS = [
  ['users', 'Users', 'users.view'],
] as const satisfies ReadonlyArray<readonly [string, string, PermissionKey]>;

/** Admin top-level tools (same level as History / Users) */
export const ADMIN_TOOL_NAV_ITEMS = [
  ['forms', 'Forms', 'settings.view'],
  ['automations', 'Automations', 'settings.view'],
] as const satisfies ReadonlyArray<readonly [string, string, PermissionKey]>;

/** Account menu — not listed in main sidebar (opened from user card). */
export const ACCOUNT_NAV_ITEMS = [
  ['user-settings', 'User settings', 'contacts.view'],
] as const satisfies ReadonlyArray<readonly [string, string, PermissionKey]>;

/** DEV-only Settings children */
export const SETTINGS_NAV_ITEMS = [
  ['roles-permissions', 'Roles & permissions', 'settings.permissions.manage'],
  ['audit-log', 'Audit log', 'settings.logs.view'],
] as const satisfies ReadonlyArray<readonly [string, string, PermissionKey]>;

export type PrimaryPageId = (typeof PRIMARY_NAV_ITEMS)[number][0];
export type CommunicationsPageId = (typeof COMMUNICATIONS_NAV_ITEMS)[number][0];
export type HistoryPageId = (typeof HISTORY_NAV_ITEMS)[number][0];
export type UsersPageId = (typeof USERS_NAV_ITEMS)[number][0];
export type AdminToolPageId = (typeof ADMIN_TOOL_NAV_ITEMS)[number][0];
export type AccountPageId = (typeof ACCOUNT_NAV_ITEMS)[number][0];
export type SettingsPageId = (typeof SETTINGS_NAV_ITEMS)[number][0];
export type PageId =
  | PrimaryPageId
  | CommunicationsPageId
  | HistoryPageId
  | UsersPageId
  | AdminToolPageId
  | AccountPageId
  | SettingsPageId;

export const SETTINGS_PAGE_IDS: SettingsPageId[] = SETTINGS_NAV_ITEMS.map(
  ([id]) => id,
);

export function isSettingsPage(id: PageId): id is SettingsPageId {
  return (SETTINGS_PAGE_IDS as readonly string[]).includes(id);
}

export function permissionForPage(id: PageId): PermissionKey {
  const all = [
    ...PRIMARY_NAV_ITEMS,
    ...COMMUNICATIONS_NAV_ITEMS,
    ...HISTORY_NAV_ITEMS,
    ...USERS_NAV_ITEMS,
    ...ADMIN_TOOL_NAV_ITEMS,
    ...ACCOUNT_NAV_ITEMS,
    ...SETTINGS_NAV_ITEMS,
  ] as ReadonlyArray<readonly [PageId, string, PermissionKey]>;
  return all.find((row) => row[0] === id)?.[2] ?? 'contacts.view';
}

/** @deprecated Use section arrays instead. */
export const NAV_ITEMS = [
  ...PRIMARY_NAV_ITEMS,
  ...COMMUNICATIONS_NAV_ITEMS,
  ...HISTORY_NAV_ITEMS,
  ...USERS_NAV_ITEMS,
  ...ADMIN_TOOL_NAV_ITEMS,
  ...ACCOUNT_NAV_ITEMS,
  ...SETTINGS_NAV_ITEMS,
] as const;
