/**
 * Volunteer-facing API contract (v1).
 *
 * Endpoints (types only in this shell; the mock client implements them in-process):
 * - GET /me — identity + short-term application status for a mock email.
 *   Application payload is included here (no separate GET /me/application in v1).
 *
 * This folder must not import staff CRM `src/services/`, `src/pages/`, or `server/`.
 * Step ids are copied locally so `apps/volunteer` can leave this repo later.
 * Strings match `src/constants/onboardingPipelineSteps.ts` SHORT_TERM_BASE.
 */

export const SHORT_TERM_STEP_IDS = [
  'application_received',
  'pastor_reference',
  'in_review',
  'background_check',
  'child_safeguarding',
  'approved',
  'flight_info',
  'invoice',
  'sent_to_field',
] as const;

export type ShortTermStepId = (typeof SHORT_TERM_STEP_IDS)[number];

export type VolunteerStepStatus = 'not_started' | 'waiting' | 'received' | 'complete';

export type VolunteerStepAudience = 'volunteer' | 'staff' | 'system';

export interface VolunteerIdentity {
  name: string;
  email: string;
}

export interface VolunteerStep {
  id: ShortTermStepId;
  title: string;
  status: VolunteerStepStatus;
  audience: VolunteerStepAudience;
  /** Volunteer-facing next action, or null when there is nothing for them to do. */
  youDo: string | null;
}

export interface VolunteerApplicationStatus extends VolunteerIdentity {
  /** Term label (e.g. "Summer 2026"). */
  term: string;
  /** Confirmed assignment, or stated preference if not yet confirmed. */
  location: string;
  steps: VolunteerStep[];
}

export type FetchMeResult =
  | { status: 'ok'; me: VolunteerApplicationStatus }
  | { status: 'not_found' };

/**
 * Default volunteer-safe copy for each short-term step.
 * Audience follows the v1 menu: system unless noted as staff.
 */
export const SHORT_TERM_STEP_DEFAULTS: readonly Omit<VolunteerStep, 'status'>[] = [
  {
    id: 'application_received',
    title: 'Application received',
    audience: 'system',
    youDo: null,
  },
  {
    id: 'pastor_reference',
    title: 'Pastor reference',
    audience: 'system',
    youDo: 'Name your pastor if you have not already, then wait for their reference.',
  },
  {
    id: 'in_review',
    title: 'In review',
    audience: 'system',
    youDo: null,
  },
  {
    id: 'background_check',
    title: 'Background check',
    audience: 'system',
    youDo: 'Complete your Sterling background check, or upload a recent report.',
  },
  {
    id: 'child_safeguarding',
    title: 'Child safeguarding',
    audience: 'system',
    youDo: 'Complete Kaya child safeguarding training, or upload your certificate.',
  },
  {
    id: 'approved',
    title: 'Approved (dates, checks, and location)',
    audience: 'system',
    youDo: null,
  },
  {
    id: 'flight_info',
    title: 'Flight info',
    audience: 'system',
    youDo: null,
  },
  {
    id: 'invoice',
    title: 'Invoice',
    audience: 'system',
    youDo: 'Pay your invoice when it is sent.',
  },
  {
    id: 'sent_to_field',
    title: 'Sent to field',
    audience: 'staff',
    youDo: null,
  },
];

/**
 * Forbidden in v1 — documented only, not implemented.
 *
 * - Client-supplied Monday item or board ids
 * - List or fetch another person
 * - Raw GraphQL / staff `mondayApiProxy`
 * - Any write (POST application, file upload, tick / complete a step)
 * - Staff-only fields (internal notes, pastor Q&A, QBO line items, Match Review)
 */
export const VOLUNTEER_API_FORBIDDEN = [
  'client_supplied_monday_item_or_board_ids',
  'list_or_fetch_another_person',
  'raw_graphql_or_staff_proxy',
  'writes_post_application_files_or_tick_step',
  'staff_only_fields_internal_notes_pastor_qa_qbo_match_review',
] as const;

export type VolunteerApiForbidden = (typeof VOLUNTEER_API_FORBIDDEN)[number];
