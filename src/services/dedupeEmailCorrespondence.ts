import type { ContactEmailMessage } from '../types/contact';

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function minuteBucket(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toISOString().slice(0, 16);
}

function correspondenceKey(message: ContactEmailMessage): string {
  return [
    normalize(message.subject),
    normalize(message.senderEmail),
    normalize(message.recipientEmail),
    minuteBucket(message.sentAt),
  ].join('|');
}

function preferMessage(
  current: ContactEmailMessage,
  candidate: ContactEmailMessage,
): ContactEmailMessage {
  if (candidate.mondayUpdateId && !current.mondayUpdateId) return candidate;
  if (current.mondayUpdateId && !candidate.mondayUpdateId) return current;
  if (
    (candidate.bodyHtml || candidate.body).length >
    (current.bodyHtml || current.body).length
  ) {
    return candidate;
  }
  return current;
}

export function dedupeEmailCorrespondence(
  messages: ContactEmailMessage[],
): ContactEmailMessage[] {
  const byKey = new Map<string, ContactEmailMessage>();

  for (const message of messages) {
    const key = correspondenceKey(message);
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, message);
      continue;
    }
    byKey.set(key, preferMessage(existing, message));
  }

  return [...byKey.values()].sort(
    (a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime(),
  );
}
