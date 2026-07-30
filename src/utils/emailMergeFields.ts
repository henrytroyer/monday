/** Shared merge-field catalog for email templates and compose UI. */

export interface EmailMergeFieldDefinition {
  key: string;
  label: string;
  description: string;
  group: 'person' | 'application' | 'onboarding' | 'donation' | 'organization';
}

export const EMAIL_MERGE_FIELDS: EmailMergeFieldDefinition[] = [
  { key: 'name', label: 'Full name', description: 'Volunteer or contact full name', group: 'person' },
  { key: 'firstName', label: 'First name', description: 'First word of name', group: 'person' },
  { key: 'email', label: 'Email', description: 'Recipient email address', group: 'person' },
  { key: 'phone', label: 'Phone', description: 'Phone number from the record', group: 'person' },
  { key: 'recipientLabel', label: 'Recipient role', description: 'e.g. Parents, Pastor, Volunteer', group: 'person' },
  { key: 'locationPreference', label: 'Location preference', description: 'Preferred field location', group: 'application' },
  { key: 'location', label: 'Assigned location', description: 'Assigned location on the board', group: 'application' },
  { key: 'timelineLabel', label: 'Timeline', description: 'Signup timeline label', group: 'application' },
  { key: 'status', label: 'Status', description: 'Pipeline or application status', group: 'application' },
  { key: 'coordinator', label: 'Coordinator', description: 'Assigned coordinator', group: 'application' },
  { key: 'housing', label: 'Housing', description: 'Housing assignment', group: 'application' },
  { key: 'onboardingProgressSummary', label: 'Onboarding summary', description: 'Onboarding pipeline progress text', group: 'onboarding' },
  { key: 'currentStepTitle', label: 'Current step', description: 'Current onboarding step title', group: 'onboarding' },
  { key: 'nextStepTitle', label: 'Next step', description: 'Next onboarding step title', group: 'onboarding' },
  { key: 'nextStepProjectedDate', label: 'Next step date', description: 'Projected date for next onboarding step', group: 'onboarding' },
  { key: 'referenceTypeLabel', label: 'Reference type', description: 'Long-term reference type label', group: 'onboarding' },
  { key: 'taxYear', label: 'Tax year', description: 'Donation tax year', group: 'donation' },
  { key: 'totalAmount', label: 'Donation total', description: 'Formatted donation total', group: 'donation' },
  { key: 'donationLines', label: 'Donation lines', description: 'Itemized donation list', group: 'donation' },
  { key: 'organizationName', label: 'Organization', description: 'Organization legal name', group: 'organization' },
  { key: 'organizationEin', label: 'EIN', description: 'Organization tax ID', group: 'organization' },
  { key: 'organizationAddress', label: 'Org address', description: 'Organization mailing address', group: 'organization' },
];

export const BLANK_EMAIL_TEMPLATE_ID = '__blank__';

export function mergeFieldToken(key: string): string {
  return `{{${key}}}`;
}

export function formatMergeFieldPreview(
  key: string,
  context?: Record<string, string>,
): string {
  const value = context?.[key]?.trim();
  if (value) return value;
  return mergeFieldToken(key);
}

export function groupMergeFields(
  fields: EmailMergeFieldDefinition[] = EMAIL_MERGE_FIELDS,
): Record<string, EmailMergeFieldDefinition[]> {
  return fields.reduce<Record<string, EmailMergeFieldDefinition[]>>(
    (groups, field) => {
      const bucket = groups[field.group] ?? [];
      bucket.push(field);
      groups[field.group] = bucket;
      return groups;
    },
    {},
  );
}

const GROUP_LABELS: Record<EmailMergeFieldDefinition['group'], string> = {
  person: 'Person',
  application: 'Application',
  onboarding: 'Onboarding',
  donation: 'Donations',
  organization: 'Organization',
};

export function mergeFieldGroupLabel(
  group: EmailMergeFieldDefinition['group'],
): string {
  return GROUP_LABELS[group];
}
