import { EMAIL_TEMPLATES } from './emailTemplates';
import type { ContactEmailMessage, ContactListItem } from '../types/contact';

const TEAM_COORDINATOR = {
  name: 'Sarah Chen',
  email: 'coordination@example.org',
};

interface ThreadScenario {
  direction: 'inbound' | 'outbound';
  templateId: string;
  inboundSubject?: string;
  inboundBody?: string;
}

const THREAD_SCENARIOS: ThreadScenario[] = [
  { direction: 'outbound', templateId: 'onboarding-welcome' },
  {
    direction: 'inbound',
    templateId: 'onboarding-welcome',
    inboundSubject: 'Re: Welcome to the team',
    inboundBody: `Hi Sarah,

Thank you so much for the welcome email! I'm really excited about serving on the team this summer.

I've started gathering my documents and will upload them this week.

Best,
{{firstName}}`,
  },
  { direction: 'outbound', templateId: 'pastor-reference-request' },
  {
    direction: 'inbound',
    templateId: 'pastor-reference-request',
    inboundSubject: 'Re: Reference request',
    inboundBody: `Hello,

My pastor received the reference request and said he will complete it by Friday.

Please let me know if you need anything else from me.

Thanks,
{{firstName}}`,
  },
  { direction: 'outbound', templateId: 'missing-documents' },
  { direction: 'outbound', templateId: 'invoice-reminder' },
  {
    direction: 'inbound',
    templateId: 'invoice-reminder',
    inboundSubject: 'Re: Invoice reminder',
    inboundBody: `Hi,

I just submitted payment through the link you sent. Please confirm when it comes through.

Thank you,
{{firstName}}`,
  },
  { direction: 'outbound', templateId: 'pre-arrival-reminder' },
  {
    direction: 'inbound',
    templateId: 'pre-arrival-reminder',
    inboundSubject: 'Travel itinerary attached',
    inboundBody: `Hi Sarah,

Attached is my flight itinerary. I land on the scheduled arrival day and can meet the team at the housing location.

Safe travels,
{{firstName}}`,
  },
];

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) || 1;
}

function createRng(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

function firstName(name: string): string {
  const stripped = name.replace(/^Rev\.\s+/i, '').trim();
  return stripped.split(/\s+/)[0] ?? name;
}

function applyPlaceholders(
  text: string,
  context: Record<string, string>,
): string {
  return text.replace(/\{\{(\w+)\}\}/g, (_, key: string) => context[key] ?? '');
}

function buildContext(
  contact: Pick<ContactListItem, 'name' | 'email'>,
): Record<string, string> {
  const given = firstName(contact.name);
  return {
    name: contact.name,
    firstName: given,
    timelineLabel: 'Summer 2026 — Team A',
    locationPreference: 'Lesvos',
    coordinator: TEAM_COORDINATOR.name,
    status: 'Awaiting Reference',
  };
}

function outboundMessage(
  contactId: string,
  contact: Pick<ContactListItem, 'name' | 'email'>,
  scenario: ThreadScenario,
  index: number,
  sentAt: string,
): ContactEmailMessage {
  const template =
    EMAIL_TEMPLATES.find((item) => item.id === scenario.templateId) ??
    EMAIL_TEMPLATES[0]!;
  const context = buildContext(contact);

  return {
    id: `${contactId}-email-${index}`,
    contactId,
    direction: 'outbound',
    senderName: TEAM_COORDINATOR.name,
    senderEmail: TEAM_COORDINATOR.email,
    recipientName: contact.name,
    recipientEmail: contact.email,
    subject: applyPlaceholders(template.subject, context),
    body: applyPlaceholders(template.body, context),
    sentAt,
  };
}

function inboundMessage(
  contactId: string,
  contact: Pick<ContactListItem, 'name' | 'email'>,
  scenario: ThreadScenario,
  index: number,
  sentAt: string,
): ContactEmailMessage {
  const context = buildContext(contact);
  const subject =
    scenario.inboundSubject ??
    `Re: ${EMAIL_TEMPLATES.find((item) => item.id === scenario.templateId)?.subject ?? 'Message'}`;
  const bodyTemplate =
    scenario.inboundBody ??
    `Hi,\n\nThank you for your message. I'll follow up shortly.\n\n${contact.name}`;

  return {
    id: `${contactId}-email-${index}`,
    contactId,
    direction: 'inbound',
    senderName: contact.name,
    senderEmail: contact.email,
    recipientName: TEAM_COORDINATOR.name,
    recipientEmail: TEAM_COORDINATOR.email,
    subject: applyPlaceholders(subject, context),
    body: applyPlaceholders(bodyTemplate, context),
    sentAt,
  };
}

function isoDaysAgo(days: number, hour: number, minute: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(hour, minute, 0, 0);
  return date.toISOString();
}

export function buildCuratedJohnDoeEmailThread(): ContactEmailMessage[] {
  const contact = { name: 'John Doe', email: 'john.doe@example.com' };
  const contactId = 'contact-1';

  const messages: ContactEmailMessage[] = [
    outboundMessage(contactId, contact, THREAD_SCENARIOS[0]!, 0, isoDaysAgo(2, 9, 15)),
    inboundMessage(contactId, contact, THREAD_SCENARIOS[1]!, 1, isoDaysAgo(1, 14, 42)),
    outboundMessage(contactId, contact, THREAD_SCENARIOS[2]!, 2, isoDaysAgo(8, 10, 5)),
    inboundMessage(contactId, contact, THREAD_SCENARIOS[3]!, 3, isoDaysAgo(6, 16, 20)),
    outboundMessage(contactId, contact, THREAD_SCENARIOS[4]!, 4, isoDaysAgo(14, 11, 0)),
    outboundMessage(contactId, contact, THREAD_SCENARIOS[5]!, 5, isoDaysAgo(21, 9, 30)),
    inboundMessage(contactId, contact, THREAD_SCENARIOS[6]!, 6, isoDaysAgo(20, 18, 10)),
    outboundMessage(contactId, contact, THREAD_SCENARIOS[7]!, 7, isoDaysAgo(28, 8, 45)),
  ];

  return messages.sort(
    (a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime(),
  );
}

export function buildMockContactEmailThread(
  contactId: string,
  contact: Pick<ContactListItem, 'name' | 'email'>,
): ContactEmailMessage[] {
  const email = contact.email?.trim();
  if (!email || email === '—') return [];

  const rand = createRng(hashString(`${contactId}-email-thread`));
  const messageCount = 4 + Math.floor(rand() * 5);
  const messages: ContactEmailMessage[] = [];

  for (let i = 0; i < messageCount; i++) {
    const scenario = THREAD_SCENARIOS[i % THREAD_SCENARIOS.length]!;
    const daysAgo = i * 3 + Math.floor(rand() * 2);
    const hour = 8 + Math.floor(rand() * 10);
    const minute = Math.floor(rand() * 60);
    const sentAt = isoDaysAgo(daysAgo, hour, minute);

    messages.push(
      scenario.direction === 'outbound'
        ? outboundMessage(contactId, contact, scenario, i, sentAt)
        : inboundMessage(contactId, contact, scenario, i, sentAt),
    );
  }

  return messages.sort(
    (a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime(),
  );
}
