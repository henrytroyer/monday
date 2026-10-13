import type { FetchMeResult, VolunteerApplicationStatus } from '../contract/volunteerApi';
import { SHORT_TERM_STEP_DEFAULTS } from '../contract/volunteerApi';

export const JANE_MILLER_EMAIL = 'jane.miller@example.com';

export const NOT_FOUND_EMAIL = 'not.found@example.com';

export const NOT_FOUND: FetchMeResult = { status: 'not_found' };

/** Mid-pipeline short-term volunteer used by the mock client. */
export const JANE_MILLER: VolunteerApplicationStatus = {
  name: 'Jane Miller',
  email: JANE_MILLER_EMAIL,
  term: 'Summer 2026',
  location: 'Lesvos (confirmed)',
  steps: SHORT_TERM_STEP_DEFAULTS.map((step) => {
    switch (step.id) {
      case 'application_received':
        return { ...step, status: 'complete', youDo: null };
      case 'pastor_reference':
        return {
          ...step,
          status: 'received',
          youDo: null,
        };
      case 'in_review':
        return { ...step, status: 'complete', youDo: null };
      case 'background_check':
        return { ...step, status: 'waiting' };
      case 'child_safeguarding':
        return { ...step, status: 'not_started' };
      case 'invoice':
        return { ...step, status: 'not_started' };
      case 'guidelines':
        return { ...step, status: 'not_started' };
      default:
        return { ...step, status: 'not_started', youDo: null };
    }
  }),
};

/** Preview-only record after Create account. Not a Monday write. */
export function previewStatusForNewAccount(input: {
  name: string;
  email: string;
}): VolunteerApplicationStatus {
  const name = input.name.trim() || 'Volunteer';
  const email = input.email.trim().toLowerCase();
  return {
    name,
    email,
    term: 'Term not listed',
    location: 'Preference not listed',
    steps: SHORT_TERM_STEP_DEFAULTS.map((step) => ({
      ...step,
      status: 'not_started' as const,
    })),
  };
}
