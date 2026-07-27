export type OnboardingStepKind = 'simple' | 'async';

export type OnboardingProjectedDateRule = 'none' | 'six_weeks_before_arrival';

export interface OnboardingPipelineStepDefinition {
  id: string;
  title: string;
  kind: OnboardingStepKind;
  receivedLabel?: string;
  /** When false, hide projected date picker (short-term async steps). */
  showProjectedDate?: boolean;
  projectedDateRule?: OnboardingProjectedDateRule;
}

const BASE_STEPS = [
  { id: 'application_received', title: 'Application received', kind: 'simple' as const },
  { id: 'pastor_reference', title: 'Pastor reference', kind: 'async' as const },
  { id: 'in_review', title: 'In review', kind: 'simple' as const },
  { id: 'background_check', title: 'Background check', kind: 'async' as const },
  { id: 'child_safeguarding', title: 'Child safeguarding', kind: 'async' as const },
  {
    id: 'approved',
    title: 'Approved (dates, checks, and location)',
    kind: 'simple' as const,
  },
  { id: 'flight_info', title: 'Flight info', kind: 'simple' as const },
  { id: 'invoice', title: 'Invoice', kind: 'async' as const, receivedLabel: 'Paid' },
  { id: 'sent_to_field', title: 'Sent to field', kind: 'simple' as const },
];

export const SHORT_TERM_ONBOARDING_STEPS = BASE_STEPS.map((step) => {
  switch (step.id) {
    case 'pastor_reference':
    case 'background_check':
    case 'child_safeguarding':
      return { ...step, showProjectedDate: false };
    case 'flight_info':
      return {
        ...step,
        showProjectedDate: true,
        projectedDateRule: 'six_weeks_before_arrival' as const,
      };
    default:
      return { ...step, showProjectedDate: false };
  }
}) satisfies readonly OnboardingPipelineStepDefinition[];

export const LONG_TERM_ONBOARDING_STEPS = BASE_STEPS.map((step) => ({
  ...step,
  showProjectedDate: true,
})) satisfies readonly OnboardingPipelineStepDefinition[];

/** @deprecated Use getOnboardingStepsForApplication instead. */
export const ONBOARDING_PIPELINE_STEPS = LONG_TERM_ONBOARDING_STEPS;

export type OnboardingPipelineStepId =
  (typeof BASE_STEPS)[number]['id'];

const shortTermStepById = new Map<string, OnboardingPipelineStepDefinition>(
  SHORT_TERM_ONBOARDING_STEPS.map((step) => [step.id, step]),
);

const longTermStepById = new Map<string, OnboardingPipelineStepDefinition>(
  LONG_TERM_ONBOARDING_STEPS.map((step) => [step.id, step]),
);

export function getOnboardingStepsForApplication(
  isLongterm: boolean,
): readonly OnboardingPipelineStepDefinition[] {
  return isLongterm ? LONG_TERM_ONBOARDING_STEPS : SHORT_TERM_ONBOARDING_STEPS;
}

export function getPipelineStepDefinition(
  stepId: string,
  isLongterm = true,
): OnboardingPipelineStepDefinition | undefined {
  const map = isLongterm ? longTermStepById : shortTermStepById;
  return map.get(stepId) ?? longTermStepById.get(stepId);
}

export function getPipelineStepKind(stepId: string): OnboardingStepKind {
  return getPipelineStepDefinition(stepId)?.kind ?? 'simple';
}
