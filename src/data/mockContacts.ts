import type {
  ContactDetail,
  ContactEmailMessage,
  ContactListItem,
  ContactTag,
} from '../types/contact';
import type { VolunteerTerm, VolunteerFile } from '../types/volunteer';
import { applicationPipeline } from './mockApplications';
import { mockFiles } from './mockVolunteerDetail';
import {
  buildMockDonorHistory,
  mockQuickbooksCustomerId,
} from './mockDonorHistory';
import { buildMockMailingDemographics } from './mockMailingAddress';
import {
  buildCuratedJohnDoeEmailThread,
  buildMockContactEmailThread,
} from './mockContactEmailThread';
import {
  buildMockVolunteerApplicationContext,
  buildMockVolunteerDemographics,
  buildMockVolunteerFiles,
  phoneForGeneratedContact,
} from './mockVolunteerContactProfile';
import { mockProfilePhotoUrl } from '../utils/mockProfilePhoto';
import { formatContactAddress } from '../utils/formatContactAddress';

const FIRST_NAMES = [
  'Amara', 'Lucas', 'Sofia', 'Ethan', 'Priya', 'Oliver', 'Maya', 'Daniel',
  'Hannah', 'James', 'Isabella', 'Noah', 'Chloe', 'Marcus', 'Aiden', 'Zoe',
  'Ryan', 'Lily', 'Carlos', 'Grace', 'Elena', 'Mateo', 'Nina', 'Felix',
  'Ava', 'Leo', 'Mia', 'Oscar', 'Clara', 'Hugo', 'Ingrid', 'Jonas', 'Keira',
  'Liam', 'Nora', 'Paul', 'Quinn', 'Rosa', 'Samuel', 'Tessa', 'Uma', 'Victor',
  'Willa', 'Xavier', 'Yara', 'Zach', 'Beatrice', 'Caleb', 'Diana', 'Elias',
];

const LAST_NAMES = [
  'Andersson', 'Bergmann', 'Chen', 'Dubois', 'Fischer', 'Garcia', 'Hansen',
  'Ibrahim', 'Johansson', 'Kowalski', 'Lindström', 'Martinez', 'Nair', 'Okafor',
  'Patel', 'Quinn', 'Romano', 'Santos', 'Tanaka', 'Ueda', 'Vargas', 'Walsh',
  'Xu', 'Yilmaz', 'Zimmerman', 'Brooks', 'Cooper', 'Diaz', 'Evans', 'Ford',
  'Grant', 'Hayes', 'Ingram', 'Jensen', 'Klein', 'Lopez', 'Morales', 'Nguyen',
  'Ortiz', 'Park', 'Reed', 'Silva', 'Torres', 'Vega', 'Webb', 'Young', 'Zhang',
];

const EXTRA_CONTACT_COUNT = 200;

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/^\.|\.$/g, '');
}

function tagsForIndex(index: number): ContactTag[] {
  const bucket = index % 12;
  if (bucket === 0) return ['pastor'];
  if (bucket === 1) return ['parent'];
  if (bucket === 2) return ['parent', 'donor'];
  if (bucket === 3 || bucket === 4) return ['donor'];
  if (bucket === 5 || bucket === 6) return ['volunteer', 'donor'];
  if (bucket === 7) return ['volunteer'];
  if (bucket === 8) return ['volunteer', 'donor'];
  if (bucket === 9) return ['volunteer'];
  return ['donor'];
}

function generateExtraContacts(
  count: number,
  startId: number,
): ContactListItem[] {
  const contacts: ContactListItem[] = [];

  for (let i = 0; i < count; i++) {
    const idNum = startId + i;
    const first = FIRST_NAMES[i % FIRST_NAMES.length];
    const last = LAST_NAMES[(i * 7 + 11) % LAST_NAMES.length];
    const tags = tagsForIndex(i);
    const isPastor = tags.includes('pastor');
    const name = isPastor ? `Rev. ${first} ${last}` : `${first} ${last}`;
    const emailLocal = slugify(`${first}.${last}.${idNum}`);
    const item: ContactListItem = {
      id: `contact-${idNum}`,
      name,
      email: `${emailLocal}@example.com`,
      tags,
    };

    const isVolunteer = tags.includes('volunteer');

    const phone = phoneForGeneratedContact(i, idNum, isVolunteer);
    if (phone) item.phone = phone;

    if (isVolunteer) {
      item.profilePhotoUrl = mockProfilePhotoUrl(
        slugify(`${first}-${last}-${idNum}`),
      );
    }

    contacts.push(item);
  }

  return contacts;
}

function mockVolunteerFilesForContact(
  contact: ContactListItem,
  applicationItemId?: string,
): VolunteerFile[] {
  const volunteer =
    applicationPipeline
      .flatMap((section) => section.volunteers)
      .find(
        (item) =>
          item.id === applicationItemId ||
          item.name.toLowerCase() === contact.name.toLowerCase(),
      ) ?? null;

  if (!volunteer) return [];

  const seed = volunteer.id.replace(/\W/g, '') || 'volunteer';
  return mockFiles(seed);
}

const BASE_CONTACTS: ContactListItem[] = [
  {
    id: 'contact-1',
    name: 'John Doe',
    email: 'john.doe@example.com',
    phone: '+1 (555) 201-4401',
    profilePhotoUrl: mockProfilePhotoUrl('john'),
    tags: ['volunteer', 'donor'],
  },
  {
    id: 'contact-2',
    name: 'Rev. Michael Thompson',
    email: 'pastor@church.example.com',
    phone: '+1 (555) 301-2200',
    tags: ['pastor'],
  },
  {
    id: 'contact-3',
    name: 'Jane Doe',
    email: 'parent.doe@example.com',
    phone: '+1 (555) 201-4402',
    tags: ['parent', 'donor'],
  },
  {
    id: 'contact-4',
    name: 'Rachel Kim',
    email: 'rachel.kim@example.com',
    phone: '+49 30 901820',
    profilePhotoUrl: mockProfilePhotoUrl('rachel'),
    tags: ['volunteer'],
  },
  {
    id: 'contact-5',
    name: 'Eleanor Grant',
    email: 'eleanor.grant@example.com',
    tags: ['donor'],
  },
];

const GENERATED_CONTACTS = generateExtraContacts(EXTRA_CONTACT_COUNT, 6);

export const MOCK_CONTACTS_LIST: ContactListItem[] = [
  ...BASE_CONTACTS,
  ...GENERATED_CONTACTS,
];

const johnTerms: VolunteerTerm[] = [
  {
    itemId: 'mock-1',
    timelineId: 'summer-2026-a',
    timelineLabel: 'Summer 2026 — Team A',
    termStart: 'June 1, 2026',
    termEnd: 'July 20, 2026',
    status: 'Awaiting Reference',
    pipelineStage: 'New Applications',
    quickbooksInvoiceId: 'mock-invoice-1042-paid',
    pastorReferenceStatus: 'Pending',
    locationPreference: 'Lesvos',
    notes: [],
  },
  {
    itemId: 'mock-1b',
    timelineId: 'fall-2025',
    timelineLabel: 'Fall 2025 — Team B',
    termStart: 'September 1, 2025',
    termEnd: 'November 15, 2025',
    status: 'Complete',
    pipelineStage: 'Sent To Field',
    quickbooksInvoiceId: 'mock-invoice-990-paid',
    pastorReferenceStatus: 'Complete',
    locationPreference: 'Lesvos',
    notes: [],
  },
];

function donationsForContact(
  contactId: string,
  tags: ContactTag[],
): ContactDetail['donations'] {
  if (!tags.includes('donor')) return [];
  return buildMockDonorHistory(contactId, {
    includeProgramFees:
      contactId === 'contact-1' && tags.includes('volunteer'),
  });
}

function demographicsForContact(
  contactId: string,
  tags: ContactTag[],
  preset?: ContactDetail['demographics'],
): ContactDetail['demographics'] {
  if (tags.includes('volunteer')) {
    return preset ?? buildMockVolunteerDemographics(contactId);
  }

  if (!tags.includes('donor')) {
    return preset;
  }

  if (preset && formatContactAddress(preset)) {
    return preset;
  }

  return buildMockMailingDemographics(contactId);
}

function emailCorrespondenceForContact(
  contactId: string,
  contact: Pick<ContactListItem, 'name' | 'email'>,
  preset?: ContactDetail['emailCorrespondence'],
): ContactDetail['emailCorrespondence'] {
  if (preset !== undefined) return preset;
  return buildMockContactEmailThread(contactId, contact);
}

function ensureEmailCorrespondence(
  detail: Omit<ContactDetail, 'emailCorrespondence'> & {
    emailCorrespondence?: ContactEmailMessage[];
  },
  contactId: string,
): ContactDetail {
  const emailCorrespondence =
    detail.emailCorrespondence ??
    buildMockContactEmailThread(contactId, {
      name: detail.name,
      email: detail.email,
    });

  return {
    ...detail,
    emailCorrespondence,
  };
}

const MOCK_CONTACT_DETAILS: Record<
  string,
  Omit<ContactDetail, 'emailCorrespondence'> & {
    emailCorrespondence?: ContactEmailMessage[];
  }
> = {
  'contact-1': {
    ...BASE_CONTACTS[0],
    quickbooksCustomerId: mockQuickbooksCustomerId('contact-1'),
    files: mockVolunteerFilesForContact(BASE_CONTACTS[0], 'mock-1'),
    demographics: {
      address: '123 Oak Street',
      city: 'Portland',
      country: 'United States',
      dateOfBirth: 'March 14, 2001',
    },
    currentApplication: {
      itemId: 'mock-1',
      stage: 'New Applications',
      status: 'Awaiting Reference',
      timelineLabel: 'Summer 2026 — Team A',
    },
    serviceTerms: johnTerms,
    linkedVolunteers: [],
    donations: donationsForContact('contact-1', BASE_CONTACTS[0].tags),
    emailCorrespondence: buildCuratedJohnDoeEmailThread(),
  },
  'contact-2': {
    ...BASE_CONTACTS[1],
    demographics: {
      city: 'Portland',
      country: 'United States',
    },
    currentApplication: null,
    serviceTerms: [],
    linkedVolunteers: [
      {
        applicationItemId: 'mock-1',
        volunteerName: 'John Doe',
        timelineLabel: 'Summer 2026 — Team A',
        status: 'Awaiting Reference',
        pipelineStage: 'New Applications',
        referenceStatus: 'Pending',
        relationship: 'reference',
      },
      {
        applicationItemId: 'mock-1b',
        volunteerName: 'John Doe',
        timelineLabel: 'Fall 2025 — Team B',
        status: 'Complete',
        pipelineStage: 'Sent To Field',
        referenceStatus: 'Complete',
        relationship: 'reference',
      },
    ],
    donations: [],
  },
  'contact-3': {
    ...BASE_CONTACTS[2],
    demographics: {
      address: '456 Elm Court',
      city: 'Portland',
      country: 'United States',
    },
    currentApplication: null,
    serviceTerms: [],
    linkedVolunteers: [
      {
        applicationItemId: 'mock-1',
        volunteerName: 'John Doe',
        timelineLabel: 'Summer 2026 — Team A',
        status: 'Awaiting Reference',
        pipelineStage: 'New Applications',
        relationship: 'child',
      },
    ],
    donations: donationsForContact('contact-3', BASE_CONTACTS[2].tags),
  },
  'contact-4': {
    ...BASE_CONTACTS[3],
    files: mockVolunteerFilesForContact(BASE_CONTACTS[3], 'mock-2'),
    demographics: {
      address: '42 Bergmannstraße',
      city: 'Berlin',
      country: 'Germany',
      dateOfBirth: 'August 2, 2002',
    },
    currentApplication: {
      itemId: 'mock-2',
      stage: 'New Applications',
      status: 'New',
      timelineLabel: 'Fall 2026',
    },
    serviceTerms: [
      {
        itemId: 'mock-2',
        timelineId: 'fall-2026',
        timelineLabel: 'Fall 2026',
        termStart: 'September 15, 2026',
        termEnd: 'November 1, 2026',
        status: 'New',
        pipelineStage: 'New Applications',
        quickbooksInvoiceId: 'mock-invoice-2088',
        pastorReferenceStatus: 'Pending',
        locationPreference: 'Germany',
        notes: [],
      },
    ],
    linkedVolunteers: [],
    donations: [],
  },
  'contact-5': {
    ...BASE_CONTACTS[4],
    quickbooksCustomerId: mockQuickbooksCustomerId('contact-5'),
    demographics: {
      address: '88 Highland Avenue',
      city: 'Boston',
      country: 'United States',
    },
    currentApplication: null,
    serviceTerms: [],
    linkedVolunteers: [],
    donations: donationsForContact('contact-5', BASE_CONTACTS[4].tags),
  },
};

export function getMockContactDetail(contactId: string): ContactDetail {
  const preset = MOCK_CONTACT_DETAILS[contactId];
  if (preset) return ensureEmailCorrespondence(preset, contactId);

  const listItem = MOCK_CONTACTS_LIST.find((c) => c.id === contactId);
  if (!listItem) {
    return {
      id: contactId,
      name: 'Unknown contact',
      email: '',
      tags: [],
      emailCorrespondence: [],
      currentApplication: null,
      serviceTerms: [],
      linkedVolunteers: [],
      donations: [],
    };
  }

  const isVolunteer = listItem.tags.includes('volunteer');
  const volunteerContext = isVolunteer
    ? buildMockVolunteerApplicationContext(contactId)
    : null;

  return {
    ...listItem,
    quickbooksCustomerId: listItem.tags.includes('donor')
      ? mockQuickbooksCustomerId(contactId)
      : undefined,
    demographics: demographicsForContact(contactId, listItem.tags),
    files: isVolunteer ? buildMockVolunteerFiles(contactId) : undefined,
    currentApplication: volunteerContext?.currentApplication ?? null,
    serviceTerms: volunteerContext?.serviceTerms ?? [],
    linkedVolunteers: [],
    donations: donationsForContact(contactId, listItem.tags),
    emailCorrespondence: emailCorrespondenceForContact(contactId, listItem),
  };
}
