import type { VolunteerItinerary } from './itinerary';

export interface SignupTimeline {
  id: string;
  label: string;
  startDate: string;
  endDate: string;
}

export interface VolunteerFile {
  id: string;
  name: string;
  url?: string;
  isImage: boolean;
}

export interface TermNote {
  id: string;
  itemId: string;
  timelineId: string;
  body: string;
  createdAt: string;
  authorName?: string;
}

export interface VolunteerTerm {
  itemId: string;
  timelineId: string;
  timelineLabel: string;
  termStart?: string;
  termEnd?: string;
  status?: string;
  notes: TermNote[];
  pipelineStage?: string;
  quickbooksInvoiceId?: string;
  pastorReferenceStatus?: string;
  locationPreference?: string;
}

export type EmailRecipientRole =
  | 'volunteer'
  | 'parent'
  | 'pastor'
  | 'reference';

export interface ApplicationEmail {
  role: EmailRecipientRole;
  label: string;
  address: string;
}

export interface Volunteer {
  id: string;
  name: string;
  /** Where the volunteer wants to serve (application preference). */
  locationPreference: string;
  /** Confirmed or assigned placement location, if set on the board. */
  location: string;
  status: string;
  timelineId: string;
  profilePhotoUrl?: string;
}

export interface OnboardingStep {
  title: string;
  status: string;
  /** QuickBooks invoice id when this step is Invoice Paid */
  quickbooksInvoiceId?: string;
}

export interface ApplicationFormField {
  id: string;
  question: string;
  answer: string;
  columnType?: string;
}

export interface VolunteerDetail extends Volunteer {
  email: string;
  /** All sendable addresses from the application (volunteer, parent, pastor, references). */
  emails: ApplicationEmail[];
  phone: string;
  files: VolunteerFile[];
  housing: string;
  itinerary: VolunteerItinerary;
  coordinator: string;
  termNotes: TermNote[];
  onboardingSteps: OnboardingStep[];
  activityTimeline: { date: string; text: string }[];
  applicationFormFields: ApplicationFormField[];
  pastorReferenceFormFields: ApplicationFormField[];
}

export interface PipelineSection {
  stage: string;
  volunteers: Volunteer[];
}

export interface ApplicationFilterState {
  locations: string[];
  timelineIds: string[];
  searchQuery: string;
}

export const LOCATION_OPTIONS = [
  'Lesvos',
  'Germany',
  'Malakasa',
  'Other',
] as const;

export type LocationOption = (typeof LOCATION_OPTIONS)[number];
