import type { EmailAdminTab } from '../../types/emailAdmin';

const TAB_STORAGE_KEY = 'crm-email-admin-tab';

const VALID_TABS = new Set<EmailAdminTab>([
  'overview',
  'templates',
  'accounts',
  'log',
]);

export const EMAIL_ADMIN_TABS: { id: EmailAdminTab; label: string; description: string }[] = [
  {
    id: 'overview',
    label: 'Overview',
    description: 'Summary of templates, accounts, and recent mail.',
  },
  {
    id: 'templates',
    label: 'Templates',
    description: 'Create and edit email templates synced with monday.com.',
  },
  {
    id: 'accounts',
    label: 'Accounts',
    description: 'Link Gmail, Outlook, and other sending accounts.',
  },
  {
    id: 'log',
    label: 'Master log',
    description: 'All inbound and outbound email across the CRM.',
  },
];

export function readEmailAdminTab(): EmailAdminTab {
  try {
    const raw = sessionStorage.getItem(TAB_STORAGE_KEY);
    if (raw && VALID_TABS.has(raw as EmailAdminTab)) {
      return raw as EmailAdminTab;
    }
  } catch {
    // ignore
  }
  return 'overview';
}

export function writeEmailAdminTab(tab: EmailAdminTab): void {
  try {
    sessionStorage.setItem(TAB_STORAGE_KEY, tab);
  } catch {
    // ignore
  }
}
