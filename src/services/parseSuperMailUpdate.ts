import { sanitizeEmailHtml } from '../utils/sanitizeEmailHtml';
import type { ContactEmailMessage } from '../types/contact';
import { stripHtml } from './termNotes';
import type { ParseTimelineEmailContext } from './parseTimelineEmail';

export interface MondayEmailUpdateRaw {
  id: string;
  body?: string | null;
  text_body?: string | null;
  created_at: string;
  creator?: {
    name?: string | null;
    email?: string | null;
  } | null;
}

const EMAIL_LOG_PATTERN =
  /Outgoing SuperMail|Incoming SuperMail|Outgoing Email/i;

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function extractEmailAddress(value: string): string {
  const withoutTags = value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const angle = withoutTags.match(/<([^>]+)>/);
  if (angle?.[1]) return angle[1].trim();
  const email = withoutTags.match(/[\w.+-]+@[\w.-]+\.\w+/);
  return email?.[0]?.trim() ?? withoutTags.trim();
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'");
}

function htmlToPlainText(content: string): string {
  const decoded = decodeHtmlEntities(content);
  return decoded
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function extractLabeledValue(html: string, label: string): string {
  const pattern = new RegExp(
    `<b>\\s*${label}\\s*:?\\s*</b>\\s*([^<\\n]+(?:<[^>]+>[^<]*</[^>]+>[^<\\n]*)*)`,
    'i',
  );
  const match = html.match(pattern);
  if (!match?.[1]) return '';
  return extractEmailAddress(match[1]);
}

function extractSubject(html: string, plain: string): string {
  const subjectMatch =
    html.match(/<b>\s*Subject:\s*<\/b>\s*([^<]+)/i) ||
    plain.match(/Subject:\s*(.+)/i);
  if (subjectMatch?.[1]) {
    return stripHtml(subjectMatch[1]).trim();
  }

  const outgoingEmailSubject = html.match(
    /<b>\s*<u>\s*([^<]+?)\s*<\/u>\s*<\/b>/i,
  );
  if (outgoingEmailSubject?.[1] && /outgoing email/i.test(html)) {
    return stripHtml(outgoingEmailSubject[1]).trim();
  }

  return '';
}

function extractBodyHtml(html: string): string {
  const bodyMarker = html.search(/<b>\s*Body:\s*<\/b>/i);
  if (bodyMarker >= 0) {
    const afterMarker = html.slice(bodyMarker).replace(/^[\s\S]*?<\/b>/i, '');
    return afterMarker.trim();
  }

  if (/Outgoing Email/i.test(html)) {
    const sentAtEnd = html.search(/<b>\s*Sent At:\s*<\/b>/i);
    if (sentAtEnd >= 0) {
      const afterSent = html.slice(sentAtEnd).replace(/^[\s\S]*?<br\s*\/?>/i, '');
      const withoutSubject = afterSent.replace(
        /<b>\s*<u>[\s\S]*?<\/u>\s*<\/b>\s*(?:<br\s*\/?>)?/i,
        '',
      );
      return withoutSubject.trim();
    }
  }

  return '';
}

function parseSentAt(plain: string, fallbackIso: string): string {
  const sentMatch =
    plain.match(/Sent at:\s*(.+?)(?:\n|$)/i) ||
    plain.match(/Sent At:\s*(.+?)(?:\n|$)/i);
  if (sentMatch?.[1]) {
    const parsed = Date.parse(sentMatch[1].trim());
    if (!Number.isNaN(parsed)) {
      return new Date(parsed).toISOString();
    }
  }
  return fallbackIso;
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

export function isSuperMailUpdate(html: string): boolean {
  return EMAIL_LOG_PATTERN.test(html);
}

export function mapSuperMailUpdateToEmailMessage(
  update: MondayEmailUpdateRaw,
  context: ParseTimelineEmailContext,
): ContactEmailMessage | null {
  const html = (update.body || update.text_body || '').trim();
  if (!html || !isSuperMailUpdate(html)) return null;

  const plain = htmlToPlainText(html);
  const senderEmail =
    extractLabeledValue(html, 'from') ||
    extractLabeledValue(html, 'From') ||
    update.creator?.email?.trim() ||
    '—';
  const recipientEmail =
    extractLabeledValue(html, 'to') || extractLabeledValue(html, 'To') || '—';
  const subject = extractSubject(html, plain) || '(No subject)';
  const bodyHtmlRaw = extractBodyHtml(html);
  const bodyHtml = bodyHtmlRaw ? sanitizeEmailHtml(bodyHtmlRaw) : undefined;
  const body = bodyHtml
    ? htmlToPlainText(bodyHtmlRaw)
    : plain.replace(/^(?:Outgoing SuperMail|Outgoing Email)[\s\S]*?Body:\s*/i, '').trim();

  const contactEmails = context.contactEmails ?? [];
  const direction = /Incoming SuperMail/i.test(html)
    ? 'inbound'
    : inferDirection(senderEmail, contactEmails);

  const sentAt = parseSentAt(
    plain,
    update.created_at
      ? new Date(update.created_at).toISOString()
      : new Date().toISOString(),
  );

  const itemId = context.itemId ?? context.contactId;

  return {
    id: `${itemId}-sm-${update.id}`,
    contactId: context.contactId,
    direction,
    senderName: update.creator?.name?.trim() || 'Coordinator',
    senderEmail,
    recipientName: '—',
    recipientEmail,
    subject,
    body: body || subject,
    bodyHtml,
    sentAt,
    source: context.source,
    sourceLabel: context.sourceLabel,
    itemId: context.itemId,
    timelineId: context.timelineId,
    serviceRecordId: context.serviceRecordId,
    mondayUpdateId: update.id,
  };
}

export function parseSuperMailUpdates(
  updates: MondayEmailUpdateRaw[] | undefined,
  context: ParseTimelineEmailContext,
): ContactEmailMessage[] {
  if (!updates?.length) return [];

  const messages: ContactEmailMessage[] = [];
  for (const update of updates) {
    const mapped = mapSuperMailUpdateToEmailMessage(update, context);
    if (mapped) messages.push(mapped);
  }

  return messages.sort(
    (a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime(),
  );
}
