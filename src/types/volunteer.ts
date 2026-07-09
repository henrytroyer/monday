import type { ContactDemographics } from './contact';
import type { VolunteerItinerary } from "./itinerary";
import type { MondayItemUpdateRaw } from '../services/termNotes';

export interface SignupTimeline {
  id: string;
  label: string;
  startDate: string;
  endDate: string;
}

export type VolunteerFileAccess = 'open' | 'password';

export interface VolunteerFile {
  id: string;
  name: string;
  url?: string;
  isImage: boolean;
  access?: VolunteerFileAccess;
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
  /** Application pipeline term vs recruitment service record */
  recordType?: 'application' | 'recruitment';
  recruitmentProspectId?: string;
}

export const RECRUITMENT_TIMELINE_ID = 'recruitment';

export type EmailRecipientRole =
  | "volunteer"
  | "parent"
  | "pastor"
  | "reference";

export interface ApplicationEmail {
  role: EmailRecipientRole;
  label: string;
  address: string;
}

export interface Volunteer {
  id: string;
  name: string;
  locationPreference: string;
  location: string;
  status: string;
  timelineId: string;
  profilePhotoUrl?: string;
}

export interface OnboardingStep {
  title: string;
  status: string;
  quickbooksInvoiceId?: string;
}

export interface ApplicationFormField {
  id: string;
  question: string;
  answer: string;
  columnType?: string;
}

export interface ActivityTimelineEvent {
  date: string;
  text: string;
}

export interface VolunteerDetail extends Volunteer {
  email: string;
  emails: ApplicationEmail[];
  phone: string;
  demographics?: ContactDemographics;
  passportFile?: VolunteerFile;
  childSafeguardingFile?: VolunteerFile;
  files: VolunteerFile[];
  housing: string;
  itinerary: VolunteerItinerary;
  coordinator: string;
  termNotes: TermNote[];
  /** Raw monday item updates (for aggregating notes across timelines). */
  rawUpdates?: MondayItemUpdateRaw[];
  onboardingSteps: OnboardingStep[];
  activityTimeline: ActivityTimelineEvent[];
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
  "Lesvos",
  "Germany",
  "Malakasa",
  "Other",
] as const;

export type LocationOption = (typeof LOCATION_OPTIONS)[number];
