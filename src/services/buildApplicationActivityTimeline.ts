import type { ContactEmailMessage } from '../types/contact';
import type {
  ApplicationActivityEvent,
  TermNote,
} from '../types/volunteer';

interface BuildApplicationActivityTimelineOptions {
  termNotes: TermNote[];
  emails: ContactEmailMessage[];
  itemCreatedAt?: string;
}

function emailActivity(message: ContactEmailMessage): ApplicationActivityEvent {
  const actorName =
    message.direction === 'inbound'
      ? message.senderName || message.senderEmail
      : message.senderName || message.senderEmail;

  if (message.direction === 'inbound') {
    return {
      id: message.id,
      occurredAt: message.sentAt,
      category: 'email',
      actorName,
      summary: `Email received — “${message.subject}”`,
      detail: `From ${message.senderEmail}`,
    };
  }

  return {
    id: message.id,
    occurredAt: message.sentAt,
    category: 'email',
    actorName,
    summary: `Email sent — “${message.subject}”`,
    detail:
      message.recipientEmail && message.recipientEmail !== '—'
        ? `To ${message.recipientEmail}`
        : undefined,
  };
}

function noteActivity(note: TermNote): ApplicationActivityEvent {
  return {
    id: `note-${note.id}`,
    occurredAt: note.createdAt,
    category: 'note',
    actorName: note.authorName?.trim() || 'Coordinator',
    summary: 'Internal note added',
  };
}

function createdActivity(itemCreatedAt: string): ApplicationActivityEvent {
  return {
    id: `created-${itemCreatedAt}`,
    occurredAt: new Date(itemCreatedAt).toISOString(),
    category: 'created',
    actorName: 'System',
    summary: 'Application created',
  };
}

export function buildApplicationActivityTimeline(
  options: BuildApplicationActivityTimelineOptions,
): ApplicationActivityEvent[] {
  const { termNotes, emails, itemCreatedAt } = options;
  const events: ApplicationActivityEvent[] = [];

  for (const note of termNotes) {
    events.push(noteActivity(note));
  }

  for (const message of emails) {
    events.push(emailActivity(message));
  }

  if (itemCreatedAt) {
    events.push(createdActivity(itemCreatedAt));
  }

  return events.sort(
    (a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime(),
  );
}
