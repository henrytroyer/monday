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
  /** Source monday asset ids when url points at a merged itinerary PDF. */
  mergeSourceAssetIds?: string[];
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
  /** Application pipeline term vs recruitment vs ended service record */
  recordType?: 'application' | 'recruitment' | 'service-ended';
  recruitmentProspectId?: string;
  /** Short Term application item linked from ended board (for deduplication) */
  linkedApplicationItemId?: string;
  /** End of service review matched by completion date (Volunteer Feedback Form board) */
  endOfServiceReview?: {
    itemId: string;
    completedAt?: string;
    fields?: ApplicationFormField[];
  };
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

/** Lightweight couple fields for pipeline rows (no extra API call). */
export interface CouplePreview {
  displayName: string;
  primaryFirstName?: string;
  primaryEmail?: string;
  partnerName: string;
  partnerFirstName?: string;
  partnerEmail?: string;
  partnerPhotoUrl?: string;
}

export interface ApplicationPartner {
  firstName?: string;
  name: string;
  email?: string;
  phone?: string;
  dateOfBirth?: string;
  gender?: string;
  profilePhotoUrl?: string;
  passportFile?: VolunteerFile;
  childSafeguardingFile?: VolunteerFile;
}

export interface CoupleApplication {
  isCouple: true;
  displayName: string;
  primaryFirstName?: string;
  partner: ApplicationPartner;
}

export interface Volunteer {
  id: string;
  name: string;
  locationPreference: string;
  location: string;
  status: string;
  timelineId: string;
  /** Raw Signup Timeline / Preferred Dates column from monday.com */
  preferredDates?: string;
  termStart?: string;
  termEnd?: string;
  /** monday.com pipeline group title (e.g. Sent To Field) */
  pipelineStage?: string;
  profilePhotoUrl?: string;
  couplePreview?: CouplePreview;
  /** Parsed arrival / departure from itinerary columns or notes. */
  itinerary?: VolunteerItinerary;
}

export interface OnboardingStep {
  title: string;
  status: string;
  quickbooksInvoiceId?: string;
}

export type OnboardingStepStatus =
  | 'not_started'
  | 'waiting'
  | 'received'
  | 'complete';

export interface OnboardingPipelineStep {
  stepId: string;
  status: OnboardingStepStatus;
  waitingDate?: string;
  receivedDate?: string;
  completedDate?: string;
  projectedDate?: string;
  quickbooksInvoiceId?: string;
  note?: string;
}

export interface OnboardingPipeline {
  volunteerId: string;
  timelineId: string;
  applicationReceivedAt?: string;
  steps: OnboardingPipelineStep[];
  lastEmailSentAt?: string;
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

export type ApplicationActivityCategory = 'note' | 'email' | 'created';

export interface ApplicationActivityEvent {
  id: string;
  occurredAt: string;
  category: ApplicationActivityCategory;
  actorName: string;
  summary: string;
  detail?: string;
}

export interface VolunteerDetail extends Volunteer {
  email: string;
  emails: ApplicationEmail[];
  phone: string;
  demographics?: ContactDemographics;
  passportFile?: VolunteerFile;
  childSafeguardingFile?: VolunteerFile;
  /** ISO date (YYYY-MM-DD) when safeguarding certificate was received on Monday */
  childSafeguardingReceivedDate?: string;
  couple?: CoupleApplication;
  files: VolunteerFile[];
  housing: string;
  itinerary: VolunteerItinerary;
  coordinator: string;
  termNotes: TermNote[];
  /** Raw monday item updates (for aggregating notes across timelines). */
  rawUpdates?: MondayItemUpdateRaw[];
  onboardingSteps: OnboardingStep[];
  activityTimeline: ActivityTimelineEvent[];
  /** monday item created_at — used for activity log */
  itemCreatedAt?: string;
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
