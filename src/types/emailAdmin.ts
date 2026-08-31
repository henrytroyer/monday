/** Linked send accounts and compose-log entries used by email templates. */

export type EmailAccountProvider =
  | 'gmail'
  | 'outlook'
  | 'monday'
  | 'smtp'
  | 'other';

export type EmailAccountStatus = 'connected' | 'pending' | 'error' | 'manual';

export interface LinkedEmailAccount {
  id: string;
  label: string;
  email: string;
  provider: EmailAccountProvider;
  status: EmailAccountStatus;
  isDefault: boolean;
  connectedAt?: string;
  lastSyncAt?: string;
  notes?: string;
}

export type EmailLogSource = 'monday' | 'crm-compose' | 'supermail';

export interface EmailLogEntry {
  id: string;
  direction: 'inbound' | 'outbound';
  subject: string;
  bodyPreview: string;
  senderName: string;
  senderEmail: string;
  recipientName: string;
  recipientEmail: string;
  sentAt: string;
  source: EmailLogSource;
  sourceLabel: string;
  itemId?: string;
  contactId?: string;
  accountId?: string;
  accountEmail?: string;
  templateId?: string;
  templateName?: string;
}

export interface EmailLogFilters {
  query: string;
  direction: 'all' | 'inbound' | 'outbound';
  accountId: string;
  source: 'all' | EmailLogSource;
}

export const EMPTY_EMAIL_LOG_FILTERS: EmailLogFilters = {
  query: '',
  direction: 'all',
  accountId: 'all',
  source: 'all',
};
