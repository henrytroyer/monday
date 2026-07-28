/**
 * Groups flat ContactEmailMessage / EmailMessage lists into EmailThread trees.
 */

import type { ContactEmailMessage } from '../types/contact';
import type { EmailMessage, EmailThread } from '../types/emailThread';
import { contactEmailMessageToEmailMessage } from './emailMessageAdapter';

const SUBJECT_PREFIX = /^(?:(?:re|fw|fwd)\s*:\s*)+/i;

export function normalizeEmailSubject(subject: string): string {
  return subject
    .trim()
    .replace(SUBJECT_PREFIX, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function participantEmailsOf(message: EmailMessage): Set<string> {
  const emails = new Set<string>();
  const sender = normalizeEmail(message.senderEmail);
  if (sender && sender !== '—') emails.add(sender);
  for (const r of message.toRecipients) {
    const email = normalizeEmail(r.email);
    if (email && email !== '—') emails.add(email);
  }
  return emails;
}

function participantsOverlap(a: EmailMessage, b: EmailMessage): boolean {
  const setA = participantEmailsOf(a);
  const setB = participantEmailsOf(b);
  for (const email of setA) {
    if (setB.has(email)) return true;
  }
  return false;
}

function daysApart(a: string, b: string): number {
  const ms = Math.abs(new Date(a).getTime() - new Date(b).getTime());
  return ms / (1000 * 60 * 60 * 24);
}

function findReplyBucket(
  buckets: Map<string, EmailMessage[]>,
  message: EmailMessage,
): string | null {
  if (message.inReplyTo) {
    for (const [key, group] of buckets) {
      if (
        group.some(
          (m) =>
            m.providerMessageId === message.inReplyTo ||
            m.internetMessageId === message.inReplyTo ||
            m.id === message.inReplyTo,
        )
      ) {
        return key;
      }
    }
  }

  if (message.references?.length) {
    for (const [key, group] of buckets) {
      if (
        group.some(
          (m) =>
            (m.internetMessageId &&
              message.references!.includes(m.internetMessageId)) ||
            (m.providerMessageId &&
              message.references!.includes(m.providerMessageId)),
        )
      ) {
        return key;
      }
    }
  }

  return null;
}

function findSubjectBucket(
  buckets: Map<string, EmailMessage[]>,
  message: EmailMessage,
): string | null {
  const subject = normalizeEmailSubject(message.subject);
  if (!subject) return null;

  for (const [key, group] of buckets) {
    const anchor = group[0];
    if (!anchor) continue;
    if (normalizeEmailSubject(anchor.subject) !== subject) continue;
    if (!participantsOverlap(anchor, message)) continue;

    const sameApp =
      (anchor.applicationId ?? null) === (message.applicationId ?? null);
    const lastInGroup = group[group.length - 1] ?? anchor;

    if (sameApp) {
      return key;
    }
    // Same participants + close in time, even without application id
    if (daysApart(lastInGroup.sentAt, message.sentAt) <= 90) {
      return key;
    }
  }

  return null;
}

export interface GroupEmailThreadsOptions {
  contactId: string;
  contactName?: string;
  contactEmail?: string;
  /** Manual overrides: threadId or first message id → applicationId (null clears) */
  associationOverrides?: Record<string, string | null>;
}

export function groupEmailMessagesIntoThreads(
  messages: EmailMessage[],
  options: GroupEmailThreadsOptions,
): EmailThread[] {
  const sorted = [...messages].sort(
    (a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime(),
  );

  const buckets = new Map<string, EmailMessage[]>();
  let autoKey = 0;

  for (const message of sorted) {
    const replyKey = findReplyBucket(buckets, message);
    if (replyKey) {
      buckets.get(replyKey)!.push(message);
      continue;
    }

    const subjectKey = findSubjectBucket(buckets, message);
    if (subjectKey) {
      buckets.get(subjectKey)!.push(message);
      continue;
    }

    const key = `bucket-${autoKey++}`;
    buckets.set(key, [message]);
  }

  const threads: EmailThread[] = [];
  let index = 0;

  for (const group of buckets.values()) {
    const ordered = [...group].sort(
      (a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime(),
    );
    const first = ordered[0]!;
    const last = ordered[ordered.length - 1]!;
    const slug = normalizeEmailSubject(first.subject).slice(0, 24) || 'empty';
    const threadId = `thread-${options.contactId}-${index++}-${slug}`;

    let applicationId = first.applicationId ?? null;
    let termOfServiceId = first.termOfServiceId ?? null;

    const counts = new Map<string, number>();
    for (const m of ordered) {
      if (!m.applicationId) continue;
      counts.set(m.applicationId, (counts.get(m.applicationId) ?? 0) + 1);
    }
    let best: string | null = null;
    let bestCount = 0;
    for (const [id, count] of counts) {
      if (count > bestCount) {
        best = id;
        bestCount = count;
      }
    }
    if (best) {
      applicationId = best;
      const match = ordered.find((m) => m.applicationId === best);
      termOfServiceId = match?.termOfServiceId ?? null;
    }

    let needsAssociationReview = !applicationId || counts.size > 1;

    const override =
      options.associationOverrides?.[threadId] ??
      options.associationOverrides?.[first.id];
    if (override !== undefined) {
      applicationId = override;
      needsAssociationReview = override == null;
      if (override) {
        const match = ordered.find((m) => m.applicationId === override);
        termOfServiceId = match?.termOfServiceId ?? termOfServiceId;
      } else {
        termOfServiceId = null;
      }
    }

    const messagesWithThread = ordered.map((m) => ({
      ...m,
      threadId,
      applicationId: applicationId ?? m.applicationId,
      termOfServiceId: termOfServiceId ?? m.termOfServiceId,
    }));

    const participantEmails = [
      ...new Set(
        messagesWithThread.flatMap((m) => [...participantEmailsOf(m)]),
      ),
    ];

    threads.push({
      id: threadId,
      contactId: options.contactId,
      applicationId,
      termOfServiceId,
      providerThreadId: null,
      normalizedSubject: normalizeEmailSubject(first.subject),
      subject: last.subject || first.subject || '(no subject)',
      participantEmails,
      firstMessageAt: first.sentAt,
      lastMessageAt: last.sentAt,
      messageCount: messagesWithThread.length,
      status: 'active',
      needsAssociationReview,
      messages: messagesWithThread,
      contactName: options.contactName,
      contactEmail: options.contactEmail,
      createdAt: first.sentAt,
      updatedAt: last.sentAt,
    });
  }

  return threads.sort(
    (a, b) =>
      new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime(),
  );
}

export function groupContactEmailMessagesIntoThreads(
  messages: ContactEmailMessage[],
  options: GroupEmailThreadsOptions,
): EmailThread[] {
  const adapted = messages.map((m) =>
    contactEmailMessageToEmailMessage(m, 'pending'),
  );
  return groupEmailMessagesIntoThreads(adapted, options);
}

export function filterThreadsByApplication(
  threads: EmailThread[],
  applicationId: string,
): EmailThread[] {
  return threads.filter((t) => t.applicationId === applicationId);
}
