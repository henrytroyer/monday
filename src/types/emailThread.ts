/**
 * emailThread.ts — CRM email thread / message models (monday index + UI).
 * Bodies hydrate from SuperMail / E&A; boards store association + index metadata.
 */

export type EmailDirection = 'inbound' | 'outbound';

export type EmailDeliveryStatus =
  | 'created'
  | 'queued'
  | 'sent'
  | 'delivered'
  | 'opened'
  | 'bounced'
  | 'rejected'
  | 'spam'
  | 'failed'
  | 'unknown';

/** Open/click display status — never "Not opened" unless tracking was enabled. */
export type EmailTrackingDisplayStatus =
  | 'opened'
  | 'delivered_no_open'
  | 'tracking_unavailable'
  | 'tracking_disabled'
  | 'delivery_failed';

export type EmailThreadStatus = 'active' | 'archived';

export interface EmailRecipient {
  name: string;
  email: string;
}

export interface EmailAttachment {
  id: string;
  messageId: string;
  filename: string;
  fileType: string;
  fileSize: number;
  storageUrl?: string;
  providerAttachmentId?: string;
  createdAt: string;
}

export interface EmailLink {
  id: string;
  messageId: string;
  originalUrl: string;
  trackingUrl?: string;
  linkText?: string;
  firstClickedAt?: string | null;
  lastClickedAt?: string | null;
  clickCount: number;
  createdAt: string;
  updatedAt: string;
}

export type EmailTrackingEventType =
  | 'created'
  | 'queued'
  | 'sent'
  | 'delivered'
  | 'opened'
  | 'link_clicked'
  | 'bounced'
  | 'rejected'
  | 'spam'
  | 'reply_received';

export interface EmailTrackingEvent {
  id: string;
  messageId: string;
  eventType: EmailTrackingEventType;
  eventTimestamp: string;
  linkUrl?: string | null;
  linkText?: string | null;
  providerEventId?: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown>;
  source?: string;
  createdAt: string;
}

export interface EmailMessage {
  id: string;
  threadId: string;
  contactId: string;
  applicationId?: string | null;
  termOfServiceId?: string | null;
  providerMessageId?: string;
  internetMessageId?: string;
  inReplyTo?: string;
  references?: string[];
  direction: EmailDirection;
  senderName: string;
  senderEmail: string;
  toRecipients: EmailRecipient[];
  ccRecipients: EmailRecipient[];
  bccRecipients: EmailRecipient[];
  subject: string;
  textBody: string;
  htmlBody?: string;
  sentAt: string;
  receivedAt?: string;
  deliveryStatus: EmailDeliveryStatus;
  isAutomated: boolean;
  trackingEnabled: boolean;
  firstOpenedAt?: string | null;
  lastOpenedAt?: string | null;
  openCount: number;
  firstClickedAt?: string | null;
  lastClickedAt?: string | null;
  clickCount: number;
  /** monday source ids for hydration */
  mondayUpdateId?: string;
  mondayTimelineItemId?: string;
  sourceLabel?: string;
  attachments: EmailAttachment[];
  links: EmailLink[];
  trackingEvents: EmailTrackingEvent[];
  createdAt: string;
  updatedAt: string;
}

export interface EmailThread {
  id: string;
  contactId: string;
  applicationId?: string | null;
  termOfServiceId?: string | null;
  providerThreadId?: string | null;
  normalizedSubject: string;
  subject: string;
  participantEmails: string[];
  firstMessageAt: string;
  lastMessageAt: string;
  messageCount: number;
  status: EmailThreadStatus;
  needsAssociationReview: boolean;
  messages: EmailMessage[];
  /** Primary contact display helpers for UI */
  contactName?: string;
  contactEmail?: string;
  createdAt: string;
  updatedAt: string;
}

export interface EmailHistorySummary {
  totalThreads: number;
  totalSent: number;
  totalReceived: number;
  lastEmailAt: string | null;
  awaitingReply: number;
  deliveryFailures: number;
}

export interface EmailHistoryFilters {
  query: string;
  direction: 'all' | EmailDirection;
  applicationId: string | null;
  termOfServiceId: string | null;
  dateFrom: string | null;
  dateTo: string | null;
  hasAttachments: boolean | null;
  opened: boolean | null;
  linkClicked: boolean | null;
  deliveryFailed: boolean | null;
  automated: boolean | null;
}

export const emptyEmailHistoryFilters = (): EmailHistoryFilters => ({
  query: '',
  direction: 'all',
  applicationId: null,
  termOfServiceId: null,
  dateFrom: null,
  dateTo: null,
  hasAttachments: null,
  opened: null,
  linkClicked: null,
  deliveryFailed: null,
  automated: null,
});
