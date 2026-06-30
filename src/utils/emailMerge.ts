import { getTimelineLabel } from '../data/timelines';
import type { ContactDetail } from '../types/contact';
import type { ApplicationEmail } from '../types/volunteer';
import type { VolunteerDetail } from '../types/volunteer';
import { displayLocationPreference } from './volunteerLocation';
import { formatPhoneDisplay } from './phoneFormat';

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
        ? 'Parent'
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

export function buildMailtoUrl(
  to: string,
  subject: string,
  body: string,
): string {
  const params = new URLSearchParams();
  params.set('subject', subject);
  params.set('body', body);
  return `mailto:${encodeURIComponent(to)}?${params.toString()}`;
}
