/** Onboarding pipeline step definitions — short-term vs long-term stages. */

export type OnboardingStepKind = 'simple' | 'async';

export type OnboardingProjectedDateRule = 'none' | 'six_weeks_before_arrival';

export interface OnboardingChecklistItem {
  id: string;
  label: string;
}

export interface OnboardingPipelineStepDefinition {
  id: string;
  title: string;
  kind: OnboardingStepKind;
  receivedLabel?: string;
  /** When false, hide projected date picker (short-term async steps). */
  showProjectedDate?: boolean;
  projectedDateRule?: OnboardingProjectedDateRule;
  /** Compact label for the timeline bar. */
  shortLabel?: string;
  /** Role / owner from the Long Term Volunteer Process diagram. */
  owner?: string;
  /** Key checklist items (not every diagram bullet). */
  checklist?: readonly OnboardingChecklistItem[];
}

const SHORT_TERM_BASE = [
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

export const SHORT_TERM_ONBOARDING_STEPS = SHORT_TERM_BASE.map((step) => {
  switch (step.id) {
    case 'pastor_reference':
    case 'background_check':
    case 'child_safeguarding':
      return { ...step, showProjectedDate: false, shortLabel: shortLabelForShortTerm(step.id) };
    case 'flight_info':
      return {
        ...step,
        showProjectedDate: true,
        projectedDateRule: 'six_weeks_before_arrival' as const,
        shortLabel: shortLabelForShortTerm(step.id),
      };
    default:
      return {
        ...step,
        showProjectedDate: false,
        shortLabel: shortLabelForShortTerm(step.id),
      };
  }
}) satisfies readonly OnboardingPipelineStepDefinition[];

function shortLabelForShortTerm(id: string): string {
  const map: Record<string, string> = {
    application_received: 'App',
    pastor_reference: 'Pastor',
    in_review: 'Review',
    background_check: 'Background',
    child_safeguarding: 'Safeguard',
    approved: 'Approved',
    flight_info: 'Flight',
    invoice: 'Invoice',
    sent_to_field: 'Field',
  };
  return map[id] ?? id;
}

/**
 * Long Term Volunteer Process — 9 stages from the i58Global process diagram.
 * Checklist items are key milestones only (not every bullet).
 */
export const LONG_TERM_ONBOARDING_STEPS = [
  {
    id: 'lt_connection',
    title: 'Connection',
    kind: 'simple' as const,
    shortLabel: 'Connect',
    owner: 'Any HR Team Member',
    showProjectedDate: true,
    checklist: [
      { id: 'identify_lead', label: 'Identify potential lead' },
      { id: 'recruitment_board', label: 'Add to recruitment board' },
      { id: 'video_call', label: 'Initial video call' },
      { id: 'application_link', label: 'Provide application link' },
    ],
  },
  {
    id: 'lt_application',
    title: 'Application',
    kind: 'simple' as const,
    shortLabel: 'Apply',
    owner: 'Local HR Director',
    showProjectedDate: true,
    checklist: [
      { id: 'review_application', label: 'Review application' },
      { id: 'request_references', label: 'Request references (5)' },
      { id: 'review_references', label: 'Review / follow up on references' },
      { id: 'team_leader_connect', label: 'Connect with team leader' },
      { id: 'member_care_connect', label: 'Connect with member care' },
    ],
  },
  {
    id: 'lt_interview',
    title: 'Interview',
    kind: 'simple' as const,
    shortLabel: 'Interview',
    owner: 'Field Leader',
    showProjectedDate: true,
    checklist: [
      { id: 'field_leader', label: 'Connect with field leader' },
      { id: 'sending_church', label: 'Verify sending church' },
      { id: 'location_role', label: 'Discuss location & role' },
      { id: 'term_visa', label: 'Explore term length & visa' },
      { id: 'clarify_vision', label: 'Clarify vision' },
    ],
  },
  {
    id: 'lt_approval',
    title: 'Approval',
    kind: 'simple' as const,
    shortLabel: 'Approval',
    owner: 'Global HR Director | CEO',
    showProjectedDate: true,
    checklist: [
      { id: 'acceptance_email', label: 'Send acceptance email' },
      { id: 'amos_applicant', label: 'Amos: connect with applicant' },
      { id: 'amos_pastor', label: 'Amos: connect with pastor' },
    ],
  },
  {
    id: 'lt_clearances',
    title: 'Clearances',
    kind: 'simple' as const,
    shortLabel: 'Clearances',
    owner: 'i58 Global HR Director',
    showProjectedDate: true,
    checklist: [
      { id: 'visa_type', label: 'Verify visa type' },
      { id: 'confirm_location_role', label: 'Confirm location & role' },
      { id: 'background_check', label: 'Complete background check' },
      { id: 'release_forms', label: 'Accept release forms' },
      { id: 'governance_policies', label: 'Governance & sexual misconduct policies' },
      { id: 'power_of_attorney', label: 'Domestic power of attorney (if needed)' },
      { id: 'healthcare', label: 'Affirm stateside healthcare' },
    ],
  },
  {
    id: 'lt_preparation',
    title: 'Preparation',
    kind: 'simple' as const,
    shortLabel: 'Prep',
    owner: 'Local HR Director',
    showProjectedDate: true,
    checklist: [
      { id: 'budget_profile', label: 'Budget & impact profile' },
      { id: 'fundraising', label: 'Fundraising training' },
      { id: 'prayer_mentor', label: 'Prayer support list & mentor' },
      { id: 'team_apparel', label: 'Issue team apparel' },
      { id: 'safeguarding_training', label: 'Child safeguarding (if applicable)' },
      { id: 'orientation', label: 'Long-term orientation / MTC (if needed)' },
    ],
  },
  {
    id: 'lt_deployment',
    title: 'Deployment',
    kind: 'simple' as const,
    shortLabel: 'Deploy',
    owner: 'Local HR Director',
    showProjectedDate: true,
    checklist: [
      { id: 'housing_vehicle', label: 'Confirm housing & vehicle' },
      { id: 'practical_details', label: 'Finalize practical details' },
      { id: 'notify_team', label: 'Notify team of new member' },
      { id: 'kep_disc', label: 'KEP document & DISC assessment' },
    ],
  },
  {
    id: 'lt_support',
    title: 'Support',
    kind: 'simple' as const,
    shortLabel: 'Support',
    owner: 'Local HR Director',
    showProjectedDate: true,
    checklist: [
      { id: 'onboarding_week', label: 'Onboarding week' },
      { id: 'eval_3mo', label: '3-month evaluation' },
      { id: 'assessment_6mo', label: '6-month term assessment' },
      { id: 'quarterly_rhythms', label: 'Quarterly rhythms' },
      { id: 'annual_debrief', label: 'Annual debrief' },
    ],
  },
  {
    id: 'lt_departure',
    title: 'Departure',
    kind: 'simple' as const,
    shortLabel: 'Departure',
    owner: 'Shane | Amos | Field Leader',
    showProjectedDate: true,
    checklist: [
      { id: 'begin_3mo_prior', label: 'Begin three months prior' },
      { id: 'reentry_book', label: 'Work through reentry book' },
      { id: 'home_community', label: 'Connect with home community / pastor' },
      { id: 'pre_exit_debrief', label: 'Pre-exit local debrief' },
      { id: 'remove_access', label: 'Remove i58 account access' },
      { id: 'post_exit_debrief', label: 'Post-exit 3rd-party debrief' },
      { id: 'year_followup', label: '1-year follow-up' },
    ],
  },
] as const satisfies readonly OnboardingPipelineStepDefinition[];

/** @deprecated Use getOnboardingStepsForApplication instead. */
export const ONBOARDING_PIPELINE_STEPS = SHORT_TERM_ONBOARDING_STEPS;

export type OnboardingPipelineStepId =
  | (typeof SHORT_TERM_BASE)[number]['id']
  | (typeof LONG_TERM_ONBOARDING_STEPS)[number]['id'];

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
  return map.get(stepId) ?? longTermStepById.get(stepId) ?? shortTermStepById.get(stepId);
}

export function getPipelineStepKind(stepId: string): OnboardingStepKind {
  return getPipelineStepDefinition(stepId)?.kind ?? 'simple';
}

export function pipelineMatchesStepDefs(
  pipeline: { steps: Array<{ stepId: string }> },
  stepDefs: readonly OnboardingPipelineStepDefinition[],
): boolean {
  if (pipeline.steps.length !== stepDefs.length) return false;
  const ids = new Set(pipeline.steps.map((s) => s.stepId));
  return stepDefs.every((def) => ids.has(def.id));
}
