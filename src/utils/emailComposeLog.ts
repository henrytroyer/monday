import type { EmailLogEntry } from '../types/emailAdmin';
import { getDefaultLinkedEmailAccount } from './emailAccountsStorage';

const STORAGE_KEY = 'crm-email-compose-log-v1';
const MAX_ENTRIES = 500;

function readAll(): EmailLogEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as EmailLogEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(entries: EmailLogEntry[]): EmailLogEntry[] {
  const trimmed = entries
    .sort(
      (a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime(),
    )
    .slice(0, MAX_ENTRIES);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  return trimmed;
}

export function listComposeLogEntries(): EmailLogEntry[] {
  return readAll();
}

export interface AppendComposeLogInput {
  direction?: 'inbound' | 'outbound';
  subject: string;
  body: string;
  senderName?: string;
  senderEmail?: string;
  recipientName?: string;
  recipientEmail: string;
  itemId?: string;
  contactId?: string;
  templateId?: string;
  templateName?: string;
  sourceLabel?: string;
  accountId?: string;
  accountEmail?: string;
}

export function appendEmailComposeLogEntry(
  input: AppendComposeLogInput,
): EmailLogEntry {
  const account = getDefaultLinkedEmailAccount();
  const entry: EmailLogEntry = {
    id: `compose-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    direction: input.direction ?? 'outbound',
    subject: input.subject.trim(),
    bodyPreview: input.body.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 240),
    senderName: input.senderName?.trim() || account?.label || 'CRM',
    senderEmail: input.senderEmail?.trim() || account?.email || '—',
    recipientName: input.recipientName?.trim() || input.recipientEmail,
    recipientEmail: input.recipientEmail.trim(),
    sentAt: new Date().toISOString(),
    source: 'crm-compose',
    sourceLabel: input.sourceLabel?.trim() || 'CRM compose',
    itemId: input.itemId,
    contactId: input.contactId,
    accountId: input.accountId ?? account?.id,
    accountEmail: input.accountEmail ?? account?.email,
    templateId: input.templateId,
    templateName: input.templateName,
  };

  writeAll([entry, ...readAll()]);
  return entry;
}
