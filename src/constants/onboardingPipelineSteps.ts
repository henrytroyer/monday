export type OnboardingStepKind = 'simple' | 'async';

export interface OnboardingPipelineStepDefinition {
  id: string;
  title: string;
  kind: OnboardingStepKind;
  receivedLabel?: string;
}

export const ONBOARDING_PIPELINE_STEPS = [
  { id: 'application_received', title: 'Application received', kind: 'simple' },
  { id: 'pastor_reference', title: 'Pastor reference', kind: 'async' },
  { id: 'in_review', title: 'In review', kind: 'simple' },
  { id: 'background_check', title: 'Background check', kind: 'async' },
  { id: 'child_safeguarding', title: 'Child safeguarding', kind: 'async' },
  { id: 'approved', title: 'Approved (dates, checks, and location)', kind: 'simple' },
  { id: 'flight_info', title: 'Flight info', kind: 'simple' },
  { id: 'invoice', title: 'Invoice', kind: 'async', receivedLabel: 'Paid' },
  { id: 'sent_to_field', title: 'Sent to field', kind: 'simple' },
] as const satisfies readonly OnboardingPipelineStepDefinition[];

export type OnboardingPipelineStepId =
  (typeof ONBOARDING_PIPELINE_STEPS)[number]['id'];

const stepById = new Map<string, OnboardingPipelineStepDefinition>(
  ONBOARDING_PIPELINE_STEPS.map((step) => [step.id, step]),
);

export function getPipelineStepDefinition(
  stepId: string,
): OnboardingPipelineStepDefinition | undefined {
  return stepById.get(stepId);
}

export function getPipelineStepKind(stepId: string): OnboardingStepKind {
  return getPipelineStepDefinition(stepId)?.kind ?? 'simple';
}
