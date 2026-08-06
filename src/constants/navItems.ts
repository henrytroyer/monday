/**
 * navItems.ts — Volunteer Portal sidebar navigation.
 *
 * CRM RBAC removed; all operators see the full nav. Users / Roles pages omitted.
 */

export const PRIMARY_NAV_ITEMS = [
  ['contacts', 'Contacts'],
  ['applications', 'Short-term applications'],
  ['recruitment', 'Recruitment'],
  ['longterm-applications', 'Long-term applications'],
] as const satisfies ReadonlyArray<readonly [string, string]>;

export const COMMUNICATIONS_NAV_ITEMS = [
  ['email-templates', 'Email templates'],
  ['email-campaigns', 'Email campaigns'],
] as const satisfies ReadonlyArray<readonly [string, string]>;

export const HISTORY_NAV_ITEMS = [
  ['history', 'History'],
] as const satisfies ReadonlyArray<readonly [string, string]>;

/** Admin top-level tools (same level as History) */
export const ADMIN_TOOL_NAV_ITEMS = [
  ['forms', 'Forms'],
  ['automations', 'Automations'],
] as const satisfies ReadonlyArray<readonly [string, string]>;

/** Account menu — not listed in main sidebar (opened from user card). */
export const ACCOUNT_NAV_ITEMS = [
  ['user-settings', 'User settings'],
] as const satisfies ReadonlyArray<readonly [string, string]>;

/** Settings children (audit + merge ops). */
export const SETTINGS_NAV_ITEMS = [
  ['audit-log', 'Audit log'],
  ['contact-merge-ops', 'Contact merge ops'],
] as const satisfies ReadonlyArray<readonly [string, string]>;

export type PrimaryPageId = (typeof PRIMARY_NAV_ITEMS)[number][0];
export type CommunicationsPageId = (typeof COMMUNICATIONS_NAV_ITEMS)[number][0];
export type HistoryPageId = (typeof HISTORY_NAV_ITEMS)[number][0];
export type AdminToolPageId = (typeof ADMIN_TOOL_NAV_ITEMS)[number][0];
export type AccountPageId = (typeof ACCOUNT_NAV_ITEMS)[number][0];
export type SettingsPageId = (typeof SETTINGS_NAV_ITEMS)[number][0];
export type PageId =
  | PrimaryPageId
  | CommunicationsPageId
  | HistoryPageId
  | AdminToolPageId
  | AccountPageId
  | SettingsPageId;

export const SETTINGS_PAGE_IDS: SettingsPageId[] = SETTINGS_NAV_ITEMS.map(
  ([id]) => id,
);

export function isSettingsPage(id: PageId): id is SettingsPageId {
  return (SETTINGS_PAGE_IDS as readonly string[]).includes(id);
}

/** @deprecated Use section arrays instead. */
export const NAV_ITEMS = [
  ...PRIMARY_NAV_ITEMS,
  ...COMMUNICATIONS_NAV_ITEMS,
  ...HISTORY_NAV_ITEMS,
  ...ADMIN_TOOL_NAV_ITEMS,
  ...ACCOUNT_NAV_ITEMS,
  ...SETTINGS_NAV_ITEMS,
] as const;
