/** Sample merge-field values for template preview (not sent anywhere). */

export type SampleRecipientRole = 'volunteer' | 'parent' | 'pastor';

const SAMPLE_BASE: Record<string, string> = {
  name: 'John Doe',
  firstName: 'John',
  phone: '+1 (555) 123-4567',
  locationPreference: 'Lesvos',
  location: 'Lesvos — Moria',
  timelineLabel: 'Summer 2026 — Lesvos',
  status: 'In review',
  coordinator: 'Sarah Chen',
  housing: 'Team house A',
  onboardingProgressSummary: '3 of 5 steps complete',
  currentStepTitle: 'Background check',
  nextStepTitle: 'Child safeguarding course',
  nextStepProjectedDate: 'August 1, 2026',
  referenceTypeLabel: 'Pastor reference',
  taxYear: '2025',
  totalAmount: '$1,250.00',
  donationLines: '• General fund — $1,000\n• Building — $250',
  organizationName: 'Example Ministry Org',
  organizationEin: '12-3456789',
  organizationAddress: '123 Mission Way, Springfield, IL 62701',
};

const RECIPIENT_BY_ROLE: Record<
  SampleRecipientRole,
  { email: string; recipientLabel: string; toName: string }
> = {
  volunteer: {
    email: 'john.doe@example.com',
    recipientLabel: 'Volunteer',
    toName: 'John Doe',
  },
  parent: {
    email: 'parent.doe@example.com',
    recipientLabel: 'Parents',
    toName: 'Jane Doe',
  },
  pastor: {
    email: 'pastor@gracechurch.org',
    recipientLabel: 'Pastor',
    toName: 'Rev. Michael Smith',
  },
};

export const SAMPLE_RECIPIENT_ROLES: {
  id: SampleRecipientRole;
  label: string;
}[] = [
  { id: 'volunteer', label: 'Volunteer' },
  { id: 'parent', label: 'Parents' },
  { id: 'pastor', label: 'Pastor' },
];

export function buildSampleMergeContext(
  role: SampleRecipientRole = 'volunteer',
): Record<string, string> {
  const recipient = RECIPIENT_BY_ROLE[role];
  return {
    ...SAMPLE_BASE,
    email: recipient.email,
    recipientLabel: recipient.recipientLabel,
    toName: recipient.toName,
  };
}

export function sampleRecipientDisplay(
  role: SampleRecipientRole,
): { name: string; email: string } {
  const recipient = RECIPIENT_BY_ROLE[role];
  return { name: recipient.toName, email: recipient.email };
}

/** Merge-field tokens still present after substitution. */
export function findUnmergedTokens(text: string): string[] {
  const matches = text.match(/\{\{(\w+)\}\}/g) ?? [];
  return [...new Set(matches)];
}
