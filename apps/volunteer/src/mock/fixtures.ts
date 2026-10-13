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
  notifications: [
    {
      id: 'jane-team-photo',
      source: 'portal',
      kind: 'team_note',
      title: 'Note from the i58 team',
      body: 'Thanks for your passport details. When you can, add a clear, front-facing photo for your lanyard.',
      sentAt: '2026-10-12T14:20:00Z',
      read: false,
    },
    {
      id: 'jane-reference-requested',
      source: 'email',
      kind: 'application',
      title: 'We asked your pastor for a reference',
      body: 'Your General Information is in. We emailed your pastor and will let you know when the reference arrives.',
      sentAt: '2026-10-09T16:05:00Z',
      read: false,
    },
    {
      id: 'jane-passport-done',
      source: 'portal',
      kind: 'application',
      title: 'Passport Details marked done',
      body: 'Nothing else is needed on this step.',
      sentAt: '2026-10-05T10:30:00Z',
      read: true,
    },
    {
      id: 'jane-orientation',
      source: 'email',
      kind: 'reminder',
      title: 'Summer 2026 orientation',
      body: 'Orientation calls start in the spring. We will email the schedule once it is set.',
      sentAt: '2026-09-28T13:00:00Z',
      read: true,
    },
  ],
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
    notifications: [
      {
        id: 'welcome',
        source: 'portal',
        kind: 'application',
        title: 'Welcome to the Volunteer Portal',
        body: 'Start with Getting Started. Messages from the i58 team will show up here.',
        sentAt: new Date().toISOString(),
        read: false,
      },
    ],
  };
}
