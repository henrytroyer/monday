import { useMockData, resolveApplicationsBoardId } from '../config/boards';
import { buildCuratedJohnDoeEmailThread } from '../data/mockContactEmailThread';
import type { ContactEmailMessage } from '../types/contact';
import type { EmailLogEntry } from '../types/emailAdmin';
import { getDefaultLinkedEmailAccount } from '../utils/emailAccountsStorage';
import { listComposeLogEntries } from '../utils/emailComposeLog';
import { fetchApplicationsBoardItems } from './crmApi';
import { fetchItemEmailTimeline } from './fetchItemEmailTimeline';

const MASTER_LOG_ITEM_LIMIT = 40;

function mapMondayMessage(message: ContactEmailMessage): EmailLogEntry {
  const account = getDefaultLinkedEmailAccount();
  const source =
    message.mondayUpdateId && message.body.includes('SuperMail')
      ? 'supermail'
      : 'monday';

  return {
    id: message.id,
    direction: message.direction,
    subject: message.subject,
    bodyPreview: message.body.replace(/\s+/g, ' ').trim().slice(0, 240),
    senderName: message.senderName,
    senderEmail: message.senderEmail,
    recipientName: message.recipientName,
    recipientEmail: message.recipientEmail,
    sentAt: message.sentAt,
    source,
    sourceLabel: message.sourceLabel || 'Item activity',
    itemId: message.itemId,
    contactId: message.contactId,
    accountId: account?.id,
    accountEmail: account?.email,
    templateId: message.templateId,
  };
}

async function fetchMondayMasterLog(): Promise<EmailLogEntry[]> {
  const boardId = resolveApplicationsBoardId();
  if (!boardId) return [];

  const items = await fetchApplicationsBoardItems(boardId);
  const sample = items.slice(0, MASTER_LOG_ITEM_LIMIT);

  const batches = await Promise.all(
    sample.map(async (item) => {
      try {
        const messages = await fetchItemEmailTimeline(String(item.id), {
          contactId: String(item.id),
          source: 'application',
          sourceLabel: item.name,
          itemId: String(item.id),
          contactEmails: [],
        });
        return messages.map(mapMondayMessage);
      } catch {
        return [];
      }
    }),
  );

  return batches.flat();
}

function mockMasterLog(): EmailLogEntry[] {
  return buildCuratedJohnDoeEmailThread().map(mapMondayMessage);
}

export async function fetchEmailMasterLog(): Promise<EmailLogEntry[]> {
  const compose = listComposeLogEntries();
  const monday = useMockData() ? mockMasterLog() : await fetchMondayMasterLog();

  const byId = new Map<string, EmailLogEntry>();
  for (const entry of [...compose, ...monday]) {
    byId.set(entry.id, entry);
  }

  return [...byId.values()].sort(
    (a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime(),
  );
}
