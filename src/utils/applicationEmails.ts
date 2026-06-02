import type { MondayColumnValue } from '../services/mapMondayToCrm';
import { getColumnText } from '../services/mapMondayToCrm';
import type { ApplicationEmail, EmailRecipientRole } from '../types/volunteer';

const EMAIL_SPLIT = /[,;\n]+/;

function isValidEmail(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed || trimmed === '—') return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
}

function addRecipient(
  list: ApplicationEmail[],
  seen: Set<string>,
  role: EmailRecipientRole,
  label: string,
  address: string,
): void {
  const normalized = address.trim().toLowerCase();
  if (!isValidEmail(address) || seen.has(normalized)) return;
  seen.add(normalized);
  list.push({ role, label, address: address.trim() });
}

function splitReferenceEmails(raw: string): string[] {
  return raw
    .split(EMAIL_SPLIT)
    .map((part) => part.trim())
    .filter(isValidEmail);
}

export interface ApplicationEmailSources {
  volunteerEmail: string;
  parentEmail?: string;
  pastorEmail?: string;
  otherReferenceEmails?: string;
}

export function buildApplicationEmails(
  sources: ApplicationEmailSources,
): ApplicationEmail[] {
  const list: ApplicationEmail[] = [];
  const seen = new Set<string>();

  addRecipient(list, seen, 'volunteer', 'Volunteer', sources.volunteerEmail);
  if (sources.parentEmail) {
    addRecipient(list, seen, 'parent', 'Parent', sources.parentEmail);
  }
  if (sources.pastorEmail) {
    addRecipient(list, seen, 'pastor', 'Pastor', sources.pastorEmail);
  }
  if (sources.otherReferenceEmails) {
    const refs = splitReferenceEmails(sources.otherReferenceEmails);
    refs.forEach((address, index) => {
      const label = refs.length === 1 ? 'Reference' : `Reference ${index + 1}`;
      addRecipient(list, seen, 'reference', label, address);
    });
  }

  return list;
}

export function buildApplicationEmailsFromColumns(
  columnValues: MondayColumnValue[],
): ApplicationEmail[] {
  const volunteerEmail = getColumnText(columnValues, 'email');
  return buildApplicationEmails({
    volunteerEmail,
    parentEmail: getColumnText(columnValues, 'parentEmail'),
    pastorEmail: getColumnText(columnValues, 'pastorEmail'),
    otherReferenceEmails: getColumnText(columnValues, 'otherReferenceEmails'),
  });
}
