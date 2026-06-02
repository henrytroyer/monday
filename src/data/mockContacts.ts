import type {
  ContactDetail,
  ContactListItem,
  ContactTag,
  FinancialRecord,
} from '../types/contact';
import type { VolunteerTerm } from '../types/volunteer';
import { mockProfilePhotoUrl } from '../utils/mockProfilePhoto';

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

function phoneForIndex(index: number, idNum: number): string | undefined {
  if (index % 4 === 0) return undefined;
  const regions = ['+1 (555)', '+44 20', '+49 30', '+33 1', '+30 21'];
  const prefix = regions[index % regions.length];
  const local = String(2000000 + idNum).slice(-7);
  return `${prefix} ${local.slice(0, 3)}-${local.slice(3)}`;
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

    const phone = phoneForIndex(i, idNum);
    if (phone) item.phone = phone;

    if (tags.includes('volunteer') && i % 3 !== 2) {
      item.profilePhotoUrl = mockProfilePhotoUrl(
        slugify(`${first}-${last}-${idNum}`),
      );
    }

    contacts.push(item);
  }

  return contacts;
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

const mockDonationsJohn: FinancialRecord[] = [
  {
    id: 'pay-1',
    kind: 'payment',
    date: 'May 10, 2026',
    amount: 450,
    currency: 'USD',
    description: 'Program fee payment',
    quickbooksInvoiceId: 'mock-invoice-1042-paid',
    quickbooksUrl:
      'https://app.qbo.intuit.com/app/invoice?txnId=mock-invoice-1042-paid',
    projectLabel: 'Summer 2026 — Team A',
    isPaid: true,
  },
  {
    id: 'inv-2',
    kind: 'invoice',
    date: 'April 1, 2026',
    amount: 100,
    currency: 'USD',
    description: 'General donation',
    quickbooksInvoiceId: 'mock-invoice-donation-100',
    quickbooksUrl:
      'https://app.qbo.intuit.com/app/invoice?txnId=mock-invoice-donation-100',
    projectLabel: 'Lesvos field support',
    isPaid: true,
  },
];

const mockDonationsJane: FinancialRecord[] = [
  {
    id: 'pay-j1',
    kind: 'payment',
    date: 'May 8, 2026',
    amount: 250,
    currency: 'USD',
    description: 'Family support donation',
    projectLabel: 'Germany housing fund',
    isPaid: true,
  },
];

const mockDonationsEleanor: FinancialRecord[] = [
  {
    id: 'inv-e1',
    kind: 'invoice',
    date: 'March 15, 2026',
    amount: 500,
    currency: 'USD',
    description: 'Annual donor gift',
    quickbooksInvoiceId: 'mock-invoice-500',
    quickbooksUrl:
      'https://app.qbo.intuit.com/app/invoice?txnId=mock-invoice-500',
    projectLabel: 'General operations',
    isPaid: false,
  },
];

const MOCK_CONTACT_DETAILS: Record<string, ContactDetail> = {
  'contact-1': {
    ...BASE_CONTACTS[0],
    quickbooksCustomerId: 'qbo-customer-john',
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
    donations: mockDonationsJohn,
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
    donations: mockDonationsJane,
  },
  'contact-4': {
    ...BASE_CONTACTS[3],
    demographics: {
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
    quickbooksCustomerId: 'qbo-customer-eleanor',
    currentApplication: null,
    serviceTerms: [],
    linkedVolunteers: [],
    donations: mockDonationsEleanor,
  },
};

export function getMockContactDetail(contactId: string): ContactDetail {
  const preset = MOCK_CONTACT_DETAILS[contactId];
  if (preset) return preset;

  const listItem = MOCK_CONTACTS_LIST.find((c) => c.id === contactId);
  if (!listItem) {
    return {
      id: contactId,
      name: 'Unknown contact',
      email: '',
      tags: [],
      currentApplication: null,
      serviceTerms: [],
      linkedVolunteers: [],
      donations: [],
    };
  }

  return {
    ...listItem,
    currentApplication: null,
    serviceTerms: [],
    linkedVolunteers: [],
    donations: [],
  };
}
