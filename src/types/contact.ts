import type { VolunteerTerm } from './volunteer';

export type ContactTag = 'volunteer' | 'pastor' | 'parent' | 'donor';

export const CONTACT_TAGS: ContactTag[] = [
  'volunteer',
  'pastor',
  'parent',
  'donor',
];

export const CONTACT_TAG_LABELS: Record<ContactTag, string> = {
  volunteer: 'Volunteer',
  pastor: 'Pastor',
  parent: 'Parent',
  donor: 'Donor',
};

export interface ContactListItem {
  id: string;
  name: string;
  email: string;
  phone?: string;
  profilePhotoUrl?: string;
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
}

export interface ContactDetail extends ContactListItem {
  quickbooksCustomerId?: string;
  demographics?: ContactDemographics;
  currentApplication: CurrentApplicationSummary | null;
  serviceTerms: VolunteerTerm[];
  linkedVolunteers: LinkedVolunteerSummary[];
  donations: FinancialRecord[];
}

export interface ContactFilterState {
  searchQuery: string;
  tags: ContactTag[];
}

export const emptyContactFilters = (): ContactFilterState => ({
  searchQuery: '',
  tags: [],
});
