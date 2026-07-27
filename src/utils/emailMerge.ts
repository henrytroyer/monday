import { getTimelineLabel } from '../data/timelines';
import type { ContactDetail } from '../types/contact';
import type { ApplicationEmail } from '../types/volunteer';
import type { VolunteerDetail } from '../types/volunteer';
import { displayLocationPreference } from './volunteerLocation';
import { formatPhoneDisplay } from './phoneFormat';

import { htmlToPlainText } from './htmlEmailBody';

export interface MergedEmail {
  subject: string;
  body: string;
}

export function buildMergeContext(
  detail: VolunteerDetail,
  recipient: ApplicationEmail,
): Record<string, string> {
  const firstName = detail.name.trim().split(/\s+/)[0] ?? detail.name;
  return {
    name: detail.name,
    firstName,
    email: recipient.address,
    recipientLabel: recipient.label,
    locationPreference: displayLocationPreference(detail),
    location: detail.location,
    timelineLabel: getTimelineLabel(detail.timelineId),
    timelineId: detail.timelineId,
    status: detail.status,
    coordinator: detail.coordinator,
    housing: detail.housing,
    phone:
      formatPhoneDisplay(detail.phone !== '—' ? detail.phone : '') ??
      detail.phone,
  };
}

export function buildContactMergeContext(
  contact: ContactDetail,
): Record<string, string> {
  const firstName = contact.name.trim().split(/\s+/)[0] ?? contact.name;
  const app = contact.currentApplication;

  return {
    name: contact.name,
    firstName,
    email: contact.email,
    recipientLabel: contact.tags.includes('donor')
      ? 'Donor'
      : contact.tags.includes('parent')
        ? 'Parents'
        : contact.tags.includes('pastor')
          ? 'Pastor'
          : 'Contact',
    locationPreference: app?.timelineLabel?.includes('Germany')
      ? 'Germany'
      : app?.timelineLabel?.includes('Lesvos')
        ? 'Lesvos'
        : '',
    location: '',
    timelineLabel: app?.timelineLabel ?? '',
    timelineId: '',
    status: app?.status ?? '',
    coordinator: '',
    housing: '',
    phone: formatPhoneDisplay(contact.phone) ?? contact.phone ?? '',
  };
}

export function mergeEmailTemplate(
  subject: string,
  body: string,
  context: Record<string, string>,
): MergedEmail {
  const replace = (text: string) =>
    text.replace(/\{\{(\w+)\}\}/g, (_, key: string) => context[key] ?? '');

  return {
    subject: replace(subject),
    body: replace(body),
  };
}

export interface MailtoOptions {
  cc?: string | string[];
  bcc?: string | string[];
}

/** Practical limit before many mail clients reject the URL. */
export const MAILTO_SAFE_URL_LENGTH = 1800;

function joinAddressList(value: string | string[] | undefined): string {
  if (!value) return '';
  const parts = (Array.isArray(value) ? value : [value])
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0 && entry !== '—');
  return [...new Set(parts)].join(',');
}

export function buildMailtoUrl(
  to: string | string[],
  subject: string,
  body: string,
  options?: MailtoOptions,
): string {
  const toList = joinAddressList(to);
  const params = new URLSearchParams();
  params.set('subject', subject);
  params.set('body', htmlToPlainText(body));
  const cc = joinAddressList(options?.cc);
  const bcc = joinAddressList(options?.bcc);
  if (cc) params.set('cc', cc);
  if (bcc) params.set('bcc', bcc);
  return `mailto:${toList ? encodeURIComponent(toList) : ''}?${params.toString()}`;
}

/**
 * Build a BCC batch mailto. Packs as many recipients as fit under the URL length
 * limit (subject/body included). Caller can copy the full BCC list when truncated.
 */
export function buildBatchBccMailtoUrl(
  recipients: string[],
  subject: string,
  body: string,
): {
  url: string;
  includedEmails: string[];
  omittedCount: number;
} {
  const unique = [
    ...new Set(
      recipients
        .map((email) => email.trim())
        .filter((email) => email.length > 0 && email !== '—'),
    ),
  ];

  if (unique.length === 0) {
    return { url: '', includedEmails: [], omittedCount: 0 };
  }

  let low = 1;
  let high = unique.length;
  let best = 0;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const url = buildMailtoUrl('', subject, body, {
      bcc: unique.slice(0, mid),
    });
    if (url.length <= MAILTO_SAFE_URL_LENGTH) {
      best = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  // Always try at least the first recipient even if over the soft limit.
  const includedCount = Math.max(1, best);
  const includedEmails = unique.slice(0, includedCount);
  return {
    url: buildMailtoUrl('', subject, body, { bcc: includedEmails }),
    includedEmails,
    omittedCount: Math.max(0, unique.length - includedCount),
  };
}

export { buildOnboardingMergeContext } from './onboardingPipeline';
