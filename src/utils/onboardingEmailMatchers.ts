import type { ContactEmailMessage } from '../types/contact';

export type OnboardingEmailStepId =
  | 'pastor_reference'
  | 'background_check'
  | 'child_safeguarding';

function normalizeText(value: string): string {
  return value.trim().toLowerCase();
}

function messageText(message: ContactEmailMessage): string {
  return normalizeText(`${message.subject} ${message.body}`);
}

function toIsoDate(sentAt: string): string {
  const d = new Date(sentAt);
  if (Number.isNaN(d.getTime())) return sentAt.slice(0, 10);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function matchesPastorReferenceEmail(message: ContactEmailMessage): boolean {
  if (message.direction !== 'outbound') return false;
  if (message.templateId === 'comms-pastor-letter-2') return true;
  if (message.templateId === 'comms-pastor-letter-3') return true;
  if (message.templateId === 'comms-pastor-letter-4') return true;

  const text = messageText(message);
  return (
    text.includes('pastoral reference') ||
    text.includes('pastor letter') ||
    text.includes("pastor's reference")
  );
}

function matchesBackgroundCheckEmail(message: ContactEmailMessage): boolean {
  if (message.direction !== 'outbound') return false;
  const text = messageText(message);
  return text.includes('sterling') || text.includes('background check');
}

function matchesSafeguardingEmail(message: ContactEmailMessage): boolean {
  if (message.direction !== 'outbound') return false;
  if (message.templateId === 'comms-child-safeguarding-course') return true;
  const text = messageText(message);
  return text.includes('child safeguarding') || text.includes('safeguarding essentials');
}

const matchers: Record<
  OnboardingEmailStepId,
  (message: ContactEmailMessage) => boolean
> = {
  pastor_reference: matchesPastorReferenceEmail,
  background_check: matchesBackgroundCheckEmail,
  child_safeguarding: matchesSafeguardingEmail,
};

export function findFirstOutboundEmailDate(
  messages: ContactEmailMessage[],
  stepId: OnboardingEmailStepId,
): string | undefined {
  const matcher = matchers[stepId];
  const outbound = messages
    .filter(matcher)
    .sort(
      (a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime(),
    );

  const first = outbound[0];
  return first ? toIsoDate(first.sentAt) : undefined;
}
