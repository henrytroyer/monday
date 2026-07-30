/**
 * navItems.ts — Volunteer Portal internal sidebar navigation (not i58-finance menus).
 */

export const PRIMARY_NAV_ITEMS = [
  ['contacts', 'Contacts'],
  ['applications', 'Short-term applications'],
  ['recruitment', 'Recruitment'],
  ['longterm-applications', 'Long-term applications'],
] as const;

export const SETTINGS_NAV_ITEMS = [
  ['email', 'Email control'],
  ['history', 'History'],
  ['forms', 'Forms'],
  ['automations', 'Automations'],
] as const;

export type PrimaryPageId = (typeof PRIMARY_NAV_ITEMS)[number][0];
export type SettingsPageId = (typeof SETTINGS_NAV_ITEMS)[number][0];
export type PageId = PrimaryPageId | SettingsPageId;

export const SETTINGS_PAGE_IDS: SettingsPageId[] = SETTINGS_NAV_ITEMS.map(
  ([id]) => id,
);

export function isSettingsPage(id: PageId): id is SettingsPageId {
  return (SETTINGS_PAGE_IDS as readonly string[]).includes(id);
}

/** @deprecated Use PRIMARY_NAV_ITEMS and SETTINGS_NAV_ITEMS instead. */
export const NAV_ITEMS = [...PRIMARY_NAV_ITEMS, ...SETTINGS_NAV_ITEMS] as const;
