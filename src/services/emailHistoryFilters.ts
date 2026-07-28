import type {
  EmailHistoryFilters,
  EmailThread,
} from '../types/emailThread';
import { resolveEmailTrackingDisplayStatus } from './emailTrackingStatus';

function messageMatchesQuery(
  thread: EmailThread,
  query: string,
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  if (thread.subject.toLowerCase().includes(q)) return true;
  for (const m of thread.messages) {
    const hay = [
      m.subject,
      m.textBody,
      m.senderName,
      m.senderEmail,
      ...m.toRecipients.flatMap((r) => [r.name, r.email]),
      ...m.attachments.map((a) => a.filename),
    ]
      .join(' ')
      .toLowerCase();
    if (hay.includes(q)) return true;
  }
  return false;
}

export function filterEmailThreads(
  threads: EmailThread[],
  filters: EmailHistoryFilters,
): EmailThread[] {
  return threads.filter((thread) => {
    if (!messageMatchesQuery(thread, filters.query)) return false;

    if (
      filters.applicationId &&
      thread.applicationId !== filters.applicationId
    ) {
      return false;
    }
    if (
      filters.termOfServiceId &&
      thread.termOfServiceId !== filters.termOfServiceId
    ) {
      return false;
    }

    const messages = thread.messages.filter((m) => {
      if (filters.direction !== 'all' && m.direction !== filters.direction) {
        return false;
      }
      if (filters.dateFrom) {
        if (new Date(m.sentAt).getTime() < new Date(filters.dateFrom).getTime()) {
          return false;
        }
      }
      if (filters.dateTo) {
        if (new Date(m.sentAt).getTime() > new Date(filters.dateTo).getTime()) {
          return false;
        }
      }
      if (filters.hasAttachments === true && m.attachments.length === 0) {
        return false;
      }
      if (filters.hasAttachments === false && m.attachments.length > 0) {
        return false;
      }
      if (filters.automated === true && !m.isAutomated) return false;
      if (filters.automated === false && m.isAutomated) return false;
      if (filters.deliveryFailed === true) {
        if (
          m.deliveryStatus !== 'failed' &&
          m.deliveryStatus !== 'bounced' &&
          m.deliveryStatus !== 'rejected'
        ) {
          return false;
        }
      }
      if (filters.opened === true) {
        if (!m.trackingEnabled) return false;
        if (resolveEmailTrackingDisplayStatus(m) !== 'opened') return false;
      }
      if (filters.opened === false) {
        if (!m.trackingEnabled) return false;
        if (resolveEmailTrackingDisplayStatus(m) === 'opened') return false;
      }
      if (filters.linkClicked === true) {
        if (!m.trackingEnabled || m.clickCount <= 0) return false;
      }
      if (filters.linkClicked === false) {
        if (!m.trackingEnabled) return false;
        if (m.clickCount > 0) return false;
      }
      return true;
    });

    return messages.length > 0;
  });
}
