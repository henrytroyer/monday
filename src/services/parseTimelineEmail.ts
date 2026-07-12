import { isLikelyHtmlBody, sanitizeEmailHtml } from '../utils/sanitizeEmailHtml';
import { stripHtml } from './termNotes';
import type {
  ContactEmailMessage,
  EmailCorrespondenceSource,
} from '../types/contact';

export interface MondayTimelineItemRaw {
  id: string;
  title?: string | null;
  content?: string | null;
  created_at?: string | null;
  custom_activity_id?: string | null;
  user?: {
    id?: string;
    name?: string | null;
    email?: string | null;
  } | null;
}

export interface ParseTimelineEmailContext {
  contactId: string;
  source: EmailCorrespondenceSource;
  sourceLabel: string;
  itemId?: string;
  timelineId?: string;
  serviceRecordId?: string;
  /** Known contact-side addresses for inbound/outbound inference */
  contactEmails?: string[];
}

const EMAIL_TITLE_PATTERN = /email/i;

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function extractEmailAddress(value: string): string {
  const angle = value.match(/<([^>]+)>/);
  if (angle?.[1]) return angle[1].trim();
  const email = value.match(/[\w.+-]+@[\w.-]+\.\w+/);
  return email?.[0]?.trim() ?? value.trim();
}

function extractDisplayName(value: string): string {
  const withoutAngle = value.replace(/<[^>]+>/, '').trim();
  if (withoutAngle) return withoutAngle;
  return extractEmailAddress(value) || 'Unknown';
}

function htmlToPlainText(content: string): string {
  const decoded = decodeHtmlEntities(content);
  return decoded
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function isEmailTimelineItem(item: MondayTimelineItemRaw): boolean {
  const title = item.title?.trim() ?? '';
  const content = item.content?.trim() ?? '';

  if (!title && !content) return false;

  if (EMAIL_TITLE_PATTERN.test(title)) return true;
  if (/monday-ea-signature/i.test(content)) return true;
  if (/from\s*:/i.test(content) && /subject\s*:/i.test(content)) return true;

  // Monday E&A composer logs subject as title with an HTML body (no From/To headers).
  if (title && content.length >= 40 && /<[a-z][\s\S]*>/i.test(content)) {
    return true;
  }

  return false;
}

interface ParsedEmailFields {
  from: string;
  to: string;
  subject: string;
  body: string;
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'");
}

function parseEmailContentHtml(content: string): ParsedEmailFields {
  const decoded = decodeHtmlEntities(content);
  const withNewlines = decoded
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '');
  const plain = withNewlines.replace(/\r\n/g, '\n');

  const lines = plain.split('\n').map((line) => line.trim()).filter(Boolean);

  let from = '';
  let to = '';
  let subject = '';
  let bodyStartIndex = lines.length;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    if (/^from\s*:/i.test(line)) {
      from = line.replace(/^from\s*:/i, '').trim();
      continue;
    }
    if (/^to\s*:/i.test(line)) {
      to = line.replace(/^to\s*:/i, '').trim();
      continue;
    }
    if (/^subject\s*:/i.test(line)) {
      subject = line.replace(/^subject\s*:/i, '').trim();
      bodyStartIndex = i + 1;
      break;
    }
  }

  const body = lines.slice(bodyStartIndex).join('\n').trim();

  return {
    from,
    to,
    subject,
    body: body || stripHtml(decoded),
  };
}

function inferDirection(
  senderEmail: string,
  contactEmails: string[],
): 'inbound' | 'outbound' {
  const normalizedSender = normalizeEmail(senderEmail);
  if (!normalizedSender) return 'outbound';
  const contactSet = new Set(contactEmails.map(normalizeEmail).filter(Boolean));
  if (contactSet.has(normalizedSender)) return 'inbound';
  return 'outbound';
}

export function mapTimelineItemToEmailMessage(
  item: MondayTimelineItemRaw,
  context: ParseTimelineEmailContext,
): ContactEmailMessage | null {
  if (!isEmailTimelineItem(item)) return null;

  const parsed = parseEmailContentHtml(item.content ?? '');
  const contactEmails = context.contactEmails ?? [];
  const hasHeaderFormat = Boolean(parsed.from.trim() || parsed.to.trim());

  let senderEmail: string;
  let recipientEmail: string;
  let senderName: string;
  let recipientName: string;

  if (hasHeaderFormat) {
    senderEmail = extractEmailAddress(parsed.from);
    recipientEmail = extractEmailAddress(parsed.to);
    senderName = extractDisplayName(parsed.from);
    recipientName = extractDisplayName(parsed.to);
  } else {
    senderEmail = item.user?.email?.trim() || '—';
    senderName = item.user?.name?.trim() || 'Unknown';
    recipientEmail = contactEmails[0] ?? '—';
    recipientName = '—';
  }

  const direction = inferDirection(
    hasHeaderFormat ? senderEmail : item.user?.email?.trim() ?? '',
    contactEmails,
  );

  const sentAt = item.created_at
    ? new Date(item.created_at).toISOString()
    : new Date().toISOString();

  const rawContent = item.content ?? '';
  const body =
    parsed.body ||
    htmlToPlainText(rawContent) ||
    stripHtml(rawContent);
  const bodyHtml = isLikelyHtmlBody(rawContent)
    ? sanitizeEmailHtml(rawContent)
    : undefined;

  return {
    id: `${context.itemId ?? context.contactId}-ea-${item.id}`,
    contactId: context.contactId,
    direction,
    senderName: senderName || item.user?.name?.trim() || 'Unknown',
    senderEmail: senderEmail || item.user?.email?.trim() || '—',
    recipientName: recipientName || '—',
    recipientEmail: recipientEmail || '—',
    subject: parsed.subject || item.title?.trim() || '(No subject)',
    body,
    bodyHtml,
    sentAt,
    source: context.source,
    sourceLabel: context.sourceLabel,
    itemId: context.itemId,
    timelineId: context.timelineId,
    serviceRecordId: context.serviceRecordId,
    mondayTimelineItemId: item.id,
  };
}

export function parseTimelineEmails(
  items: MondayTimelineItemRaw[],
  context: ParseTimelineEmailContext,
): ContactEmailMessage[] {
  const messages: ContactEmailMessage[] = [];
  for (const item of items) {
    const mapped = mapTimelineItemToEmailMessage(item, context);
    if (mapped) messages.push(mapped);
  }
  return messages.sort(
    (a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime(),
  );
}
