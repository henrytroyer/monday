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

export interface ContactDemographics {
  address?: string;
  city?: string;
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
  sentAt: string;
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

export interface ContactDetail extends ContactListItem {
  passportPhotoUrl?: string;
  passportFile?: VolunteerFile;
  quickbooksCustomerId?: string;
  demographics?: ContactDemographics;
  files?: VolunteerFile[];
  emailCorrespondence: ContactEmailMessage[];
  currentApplication: CurrentApplicationSummary | null;
  serviceTerms: VolunteerTerm[];
  linkedVolunteers: LinkedVolunteerSummary[];
  donations: FinancialRecord[];
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
