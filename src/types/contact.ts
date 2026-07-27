import type { VolunteerTerm, VolunteerFile } from './volunteer';

export type ContactTag =
  | 'volunteer'
  | 'pastor'
  | 'parent'
  | 'donor'
  | 'recruitment';

export const CONTACT_TAGS: ContactTag[] = [
  'volunteer',
  'pastor',
  'parent',
  'donor',
  'recruitment',
];

export const CONTACT_TAG_LABELS: Record<ContactTag, string> = {
  volunteer: 'Volunteer',
  pastor: 'Pastor',
  parent: 'Parent',
  donor: 'Donor',
  recruitment: 'Recruitment',
};

export interface ContactListItem {
  id: string;
  name: string;
  email: string;
  phone?: string;
  profilePhotoUrl?: string;
  createdAt?: string;
  tags: ContactTag[];
}

export interface ContactPastorReference {
  name?: string;
  email?: string;
  phone?: string;
  church?: string;
  /** Linked items on the Pastor Reference board (Contacts board_relation column). */
  linkedItemIds?: string[];
}

export interface ContactDemographics {
  /** Street line — maps to monday "Address" column */
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  dateOfBirth?: string;
}

export interface CurrentApplicationSummary {
  itemId: string;
  stage: string;
  status: string;
  timelineLabel: string;
}

export interface LinkedVolunteerSummary {
  contactId?: string;
  applicationItemId: string;
  volunteerName: string;
  timelineLabel: string;
  status: string;
  pipelineStage: string;
  referenceStatus?: string;
  relationship: 'child' | 'reference';
}

export type EmailCorrespondenceSource =
  | 'application'
  | 'recruitment'
  | 'general';

export interface ContactEmailMessage {
  id: string;
  contactId: string;
  direction: 'inbound' | 'outbound';
  senderName: string;
  senderEmail: string;
  recipientName: string;
  recipientEmail: string;
  subject: string;
  body: string;
  /** Raw HTML from Monday E&A when available — used for rich detail view. */
  bodyHtml?: string;
  sentAt: string;
  source: EmailCorrespondenceSource;
  sourceLabel: string;
  itemId?: string;
  timelineId?: string;
  serviceRecordId?: string;
  mondayTimelineItemId?: string;
  mondayUpdateId?: string;
  templateId?: string;
}

export interface FinancialRecord {
  id: string;
  kind: 'invoice' | 'payment';
  date: string;
  amount: number;
  currency: string;
  description: string;
  quickbooksInvoiceId?: string;
  quickbooksUrl?: string;
  projectLabel?: string;
  isPaid?: boolean;
  /** Mock / QuickBooks: one-time gift vs recurring sustaining gift */
  donationType?: 'one-time' | 'recurring';
}

export type ContactInternalNoteSource = 'term' | 'recruitment' | 'contact';

export interface ContactInternalNote {
  id: string;
  body: string;
  bodyHtml?: string;
  createdAt: string;
  authorName?: string;
  source: ContactInternalNoteSource;
  sourceLabel: string;
  timelineId?: string;
  applicationItemId?: string;
  recruitmentProspectId?: string;
  mondayItemId: string;
}

export type ContactInternalNoteTarget =
  | {
      kind: 'contact';
      sourceLabel: string;
    }
  | {
      kind: 'recruitment';
      prospectId: string;
      sourceLabel: string;
    }
  | {
      kind: 'term';
      itemId: string;
      timelineId: string;
      sourceLabel: string;
    };

export interface ContactDetail extends ContactListItem {
  passportPhotoUrl?: string;
  passportFile?: VolunteerFile;
  childSafeguardingFile?: VolunteerFile;
  quickbooksCustomerId?: string;
  demographics?: ContactDemographics;
  files?: VolunteerFile[];
  emailCorrespondence: ContactEmailMessage[];
  currentApplication: CurrentApplicationSummary | null;
  serviceTerms: VolunteerTerm[];
  linkedVolunteers: LinkedVolunteerSummary[];
  donations: FinancialRecord[];
  pastorReference?: ContactPastorReference;
  /** Linked donation items on the Donations board (Contacts board_relation column). */
  linkedDonationItemIds?: string[];
}

export type ContactSortOption =
  | 'name-asc'
  | 'name-desc'
  | 'date-desc'
  | 'date-asc';

export interface ContactFilterState {
  searchQuery: string;
  tags: ContactTag[];
  sortBy: ContactSortOption;
}

export const emptyContactFilters = (): ContactFilterState => ({
  searchQuery: '',
  tags: [],
  sortBy: 'name-asc',
});
