/**
 * Volunteer-facing API contract (v1).
 *
 * Endpoints (types only in this shell; the mock client implements them in-process):
 * - GET /me — identity + short-term application status for a mock email.
 *   Application payload is included here (no separate GET /me/application in v1).
 *
 * This folder must not import staff CRM `src/services/`, `src/pages/`, or `server/`.
 * Step ids are copied locally so `apps/volunteer` can leave this repo later.
 * Step ids match `src/constants/onboardingPipelineSteps.ts` SHORT_TERM_BASE,
 * plus portal-only `guidelines` (not a staff CRM / Monday step).
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
  'guidelines',
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

/** Preview-only General Information form. Not a Monday field. */
export interface VolunteerGeneralInformation {
  gender: 'male' | 'female' | '';
  birthdate: string;
  phone: string;
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

/** Preview-only Passport Details form. Not a Monday field. Local file name only — no upload. */
export interface VolunteerPassportDetails {
  photoFileName: string;
  passportNumber: string;
  expirationDate: string;
}

/** Preview-only Profile Photo form. Not a Monday field. Local file name only — no upload. */
export interface VolunteerProfilePhoto {
  photoFileName: string;
}

/** Preview-only History / Skills / Languages form. Not a Monday field. */
export interface VolunteerHistorySkillsLanguages {
  medical: string;
  travelledInternationally: 'yes' | 'no' | '';
  heardAbout: string[];
  friendName: string;
  whyVolunteer: string;
  testimony: string;
  occupation: string;
  skills: string[];
  otherSkills: string;
  leadership: 'yes' | 'no' | '';
  leadershipExperience: string;
  languages: string[];
  otherLanguage: string;
}

/** Preview-only Family Status form. Not a Monday field. */
export interface VolunteerFamilyStatus {
  maritalStatus: 'single' | 'dating' | 'engaged' | 'married' | '';
  childrenComing: 'yes' | 'no' | '';
  familyMembers: string;
}

/** Preview-only Spouse Application form. Not a Monday field. */
export interface VolunteerSpouseApplication {
  spouseJoining: 'yes' | 'no' | '';
  name: string;
  email: string;
  phone: string;
  previousVolunteer: 'yes' | 'no' | '';
  lastTermDate: string;
  birthdate: string;
  gender: 'male' | 'female' | '';
  passportUpdated: 'yes' | 'no' | '';
  passportPhotoFileName: string;
  passportNumber: string;
  passportExpiration: string;
  updateProfilePhoto: 'yes' | 'no' | '';
  profilePhotoFileName: string;
  testimony: string;
  languages: string[];
  otherLanguage: string;
  skills: string[];
  otherSkills: string;
  medical: string;
}

/** Preview-only Term of Service form. Not a Monday field. */
export interface VolunteerTermOfService {
  locationPreferences: string[];
  lengthOfTerm: '3-months' | 'other' | '';
  otherTerm: string;
  preferredDates: string;
  nearbyAirport: string;
}

/** Preview-only Other Contacts form. Not a Monday field. */
export interface VolunteerOtherContacts {
  churchName: string;
  pastorName: string;
  pastorEmail: string;
  pastorPhone: string;
  parentsNames: string;
  parentEmail: string;
  parentPhone: string;
  emergencyName: string;
  emergencyEmail: string;
  emergencyPhone: string;
  emergencyRelation: string[];
  accountableName: string;
  accountableEmail: string;
  accountablePhone: string;
  fieldContact: 'yes' | 'no' | '';
  fieldContactName: string;
}

/** Preview-only Guidelines agreement. Not a Monday field. */
export interface VolunteerGuidelines {
  agreed: boolean;
}

export interface VolunteerApplicationStatus extends VolunteerIdentity {
  /** Term label (e.g. "Summer 2026"). */
  term: string;
  /** Confirmed assignment, or stated preference if not yet confirmed. */
  location: string;
  steps: VolunteerStep[];
  /** Set in this preview after Getting Started. Not a Monday field. */
  firstName?: string;
  previousVolunteer?: 'yes' | 'no';
  generalInformation?: VolunteerGeneralInformation;
  passportDetails?: VolunteerPassportDetails;
  profilePhoto?: VolunteerProfilePhoto;
  historySkillsLanguages?: VolunteerHistorySkillsLanguages;
  familyStatus?: VolunteerFamilyStatus;
  spouseApplication?: VolunteerSpouseApplication;
  termOfService?: VolunteerTermOfService;
  otherContacts?: VolunteerOtherContacts;
  guidelines?: VolunteerGuidelines;
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
    title: 'Getting Started',
    audience: 'volunteer',
    youDo: 'Read what you will need, then continue.',
  },
  {
    id: 'pastor_reference',
    title: 'General Information',
    audience: 'volunteer',
    youDo: 'Complete your volunteer and mailing information.',
  },
  {
    id: 'in_review',
    title: 'Passport Details',
    audience: 'volunteer',
    youDo: 'Add your passport photo, number, and expiration date.',
  },
  {
    id: 'background_check',
    title: 'Profile Photo',
    audience: 'volunteer',
    youDo: 'Add your ID photo for your lanyard.',
  },
  {
    id: 'child_safeguarding',
    title: 'History / Skills / Languages',
    audience: 'volunteer',
    youDo: 'Share your history, skills, and languages.',
  },
  {
    id: 'approved',
    title: 'Family Status',
    audience: 'volunteer',
    youDo: 'Tell us your family status and who is coming with you.',
  },
  {
    id: 'flight_info',
    title: 'Spouse Application',
    audience: 'volunteer',
    youDo: 'Tell us if a spouse is joining you, then complete their details.',
  },
  {
    id: 'invoice',
    title: 'Term of Service',
    audience: 'volunteer',
    youDo: 'Share your location preference, term length, and travel details.',
  },
  {
    id: 'sent_to_field',
    title: 'Other Contacts',
    audience: 'volunteer',
    youDo: 'Add church, parent, emergency, and accountability contacts.',
  },
  {
    id: 'guidelines',
    title: 'Guidelines',
    audience: 'volunteer',
    youDo: 'Read the guidelines and agree to the rules of conduct.',
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
