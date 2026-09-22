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
          youDo: 'Waiting on your pastor. If you have not named them yet, send their name to i58.',
        };
      case 'in_review':
        return { ...step, status: 'complete', youDo: null };
      case 'background_check':
        return { ...step, status: 'waiting' };
      case 'child_safeguarding':
        return { ...step, status: 'not_started' };
      case 'invoice':
        return { ...step, status: 'not_started' };
      default:
        return { ...step, status: 'not_started', youDo: null };
    }
  }),
};
