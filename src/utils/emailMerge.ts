import { getTimelineLabel } from '../data/timelines';
import type { ApplicationEmail } from '../types/volunteer';
import type { VolunteerDetail } from '../types/volunteer';
import { displayLocationPreference } from './volunteerLocation';

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
    phone: detail.phone,
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
