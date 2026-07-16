import type { EmailTemplate } from '../data/emailTemplates';

export interface MinedSend {
  subject: string;
  body: string;
  sentAt: string;
}

export interface DedupedMinedSend extends MinedSend {
  sendCount: number;
}

export interface GeneralizeContext {
  name?: string;
  firstName?: string;
  email?: string;
  coordinator?: string;
  locationPreference?: string;
  timelineLabel?: string;
  status?: string;
  phone?: string;
}

export function normalizeSubjectKey(subject: string): string {
  return subject
    .trim()
    .toLowerCase()
    .replace(/\{\{[^}]+\}\}/g, '')
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s-]/g, '')
    .trim();
}

export function slugFromSubject(subject: string): string {
  const slug = subject
    .trim()
    .toLowerCase()
    .replace(/\{\{[^}]+\}\}/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);

  return slug ? `supermail-${slug}` : 'supermail-template';
}

export function subjectsMatch(a: string, b: string): boolean {
  const keyA = normalizeSubjectKey(a);
  const keyB = normalizeSubjectKey(b);
  if (!keyA || !keyB) return false;
  return keyA === keyB;
}

const SKIP_SUBJECT_KEYS = new Set([
  'outgoing email',
  'no subject',
  '',
]);

export function shouldSkipMinedSubject(subject: string): boolean {
  const key = normalizeSubjectKey(subject);
  if (SKIP_SUBJECT_KEYS.has(key)) return true;
  if (key.length < 4) return true;
  return false;
}

export function shouldSkipExistingSubject(
  subject: string,
  existingSubjects: string[],
): boolean {
  return existingSubjects.some((existing) => subjectsMatch(subject, existing));
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function replaceLiteral(
  text: string,
  literal: string | undefined,
  mergeField: string,
): string {
  const trimmed = literal?.trim();
  if (!trimmed || trimmed.length < 2) return text;

  const pattern = new RegExp(escapeRegExp(trimmed), 'gi');
  return text.replace(pattern, mergeField);
}

export function generalizeWithMergeFields(
  text: string,
  context: GeneralizeContext,
): string {
  let result = text;

  const replacements: Array<[string | undefined, string]> = [
    [context.name, '{{name}}'],
    [context.firstName, '{{firstName}}'],
    [context.email, '{{email}}'],
    [context.coordinator, '{{coordinator}}'],
    [context.locationPreference, '{{locationPreference}}'],
    [context.timelineLabel, '{{timelineLabel}}'],
    [context.status, '{{status}}'],
    [context.phone, '{{phone}}'],
  ];

  for (const [literal, mergeField] of replacements) {
    result = replaceLiteral(result, literal, mergeField);
  }

  return result;
}

export function dedupeMinedSends(sends: MinedSend[]): DedupedMinedSend[] {
  const bySubject = new Map<string, DedupedMinedSend>();

  for (const send of sends) {
    const key = normalizeSubjectKey(send.subject);
    if (!key) continue;

    const existing = bySubject.get(key);
    if (!existing) {
      bySubject.set(key, { ...send, sendCount: 1 });
      continue;
    }

    const nextCount = existing.sendCount + 1;
    if (new Date(send.sentAt).getTime() > new Date(existing.sentAt).getTime()) {
      bySubject.set(key, { ...send, sendCount: nextCount });
    } else {
      bySubject.set(key, { ...existing, sendCount: nextCount });
    }
  }

  return [...bySubject.values()].sort(
    (a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime(),
  );
}

export function minedSendToTemplate(
  send: DedupedMinedSend,
  minedAt: string,
): EmailTemplate {
  const id = slugFromSubject(send.subject);
  const name = send.subject.trim() || 'SuperMail template';

  return {
    id,
    name,
    subject: send.subject,
    body: send.body,
    source: 'supermail',
    minedAt,
    sendCount: send.sendCount,
  };
}

export function buildMinedTemplates(
  sends: MinedSend[],
  existingSubjects: string[],
  minedAt: string,
): EmailTemplate[] {
  const deduped = dedupeMinedSends(sends);

  return deduped
    .filter((send) => !shouldSkipMinedSubject(send.subject))
    .filter((send) => !shouldSkipExistingSubject(send.subject, existingSubjects))
    .map((send) => minedSendToTemplate(send, minedAt));
}
