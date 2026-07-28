/**
 * Adapts legacy ContactEmailMessage rows into EmailMessage models.
 */

import type { ContactEmailMessage } from '../types/contact';
import type { EmailMessage, EmailRecipient } from '../types/emailThread';

function recipient(name: string, email: string): EmailRecipient {
  return {
    name: name?.trim() || email || '—',
    email: email?.trim() || '—',
  };
}

/** SuperMail / Outgoing Email logs are treated as automated. */
export function isAutomatedEmailMessage(message: ContactEmailMessage): boolean {
  if (message.templateId) return true;
  if (message.mondayUpdateId) return true;
  const blob = `${message.subject} ${message.body}`.toLowerCase();
  return (
    blob.includes('supermail') ||
    blob.includes('outgoing email') ||
    blob.includes('incoming supermail')
  );
}

export function contactEmailMessageToEmailMessage(
  message: ContactEmailMessage,
  threadId: string,
): EmailMessage {
  const to =
    message.direction === 'outbound'
      ? [recipient(message.recipientName, message.recipientEmail)]
      : [recipient(message.senderName, message.senderEmail)].filter(
          () => message.direction === 'inbound',
        );

  // For inbound, "to" is typically the org; keep recipient fields as stored.
  const toRecipients =
    message.direction === 'outbound'
      ? [recipient(message.recipientName, message.recipientEmail)]
      : [recipient(message.recipientName, message.recipientEmail)];

  void to;

  const now = message.sentAt;
  return {
    id: message.id,
    threadId,
    contactId: message.contactId,
    applicationId: message.itemId ?? null,
    termOfServiceId: message.timelineId ?? null,
    providerMessageId: message.mondayTimelineItemId ?? message.mondayUpdateId,
    direction: message.direction,
    senderName: message.senderName,
    senderEmail: message.senderEmail,
    toRecipients,
    ccRecipients: [],
    bccRecipients: [],
    subject: message.subject,
    textBody: message.body,
    htmlBody: message.bodyHtml,
    sentAt: message.sentAt,
    receivedAt: message.direction === 'inbound' ? message.sentAt : undefined,
    deliveryStatus: 'unknown',
    isAutomated: isAutomatedEmailMessage(message),
    trackingEnabled: false,
    openCount: 0,
    clickCount: 0,
    mondayUpdateId: message.mondayUpdateId,
    mondayTimelineItemId: message.mondayTimelineItemId,
    sourceLabel: message.sourceLabel,
    attachments: [],
    links: [],
    trackingEvents: [],
    createdAt: now,
    updatedAt: now,
  };
}
