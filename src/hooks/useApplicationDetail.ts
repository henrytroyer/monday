import { useEffect, useState } from 'react';
import { useMockData } from '../config/boards';
import {
  MOCK_APPLICATION_FORM_FIELDS,
  MOCK_APPLICATION_FORM_FIELDS_RACHEL,
  MOCK_PASTOR_REFERENCE_FORM_FIELDS,
  MOCK_PASTOR_REFERENCE_FORM_FIELDS_RACHEL,
} from '../data/mockApplicationForm';
import { fetchApplicationDetail } from '../services/crmApi';
import type { VolunteerItinerary } from '../types/itinerary';
import type { Volunteer, VolunteerDetail, VolunteerFile } from '../types/volunteer';
import { buildApplicationEmails } from '../utils/applicationEmails';
import { mockProfilePhotoUrl } from '../utils/mockProfilePhoto';

function mockItinerary(
  arrival: VolunteerItinerary['arrival'],
  departure: VolunteerItinerary['departure'],
): VolunteerItinerary {
  return { arrival, departure };
}

function mockEmail(name: string): string {
  const slug = name.toLowerCase().replace(/\s+/g, '.');
  return `${slug}@example.com`;
}

const MOCK_PDF_URL =
  'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf';

function mockFiles(seed: string): VolunteerFile[] {
  return [
    {
      id: `${seed}-itinerary`,
      name: 'Itinerary.pdf',
      isImage: false,
      url: MOCK_PDF_URL,
    },
    {
      id: `${seed}-passport`,
      name: 'Passport.pdf',
      isImage: false,
      url: MOCK_PDF_URL,
    },
    {
      id: `${seed}-reference`,
      name: 'Pastor-reference.pdf',
      isImage: false,
      url: MOCK_PDF_URL,
    },
    {
      id: `${seed}-application`,
      name: 'Application-form.pdf',
      isImage: false,
      url: MOCK_PDF_URL,
    },
  ];
}

const mockDetails: Record<string, VolunteerDetail> = {
  'mock-1': {
    id: 'mock-1',
    name: 'John Doe',
    locationPreference: 'Lesvos',
    location: '—',
    status: 'Awaiting Reference',
    timelineId: 'summer-2026-a',
    profilePhotoUrl: mockProfilePhotoUrl('john'),
    email: 'john.doe@example.com',
    emails: buildApplicationEmails({
      volunteerEmail: 'john.doe@example.com',
      parentEmail: 'parent.doe@example.com',
      pastorEmail: 'pastor@church.example.com',
      otherReferenceEmails: 'ref1@example.com, ref2@example.com',
    }),
    phone: '+1 (555) 201-4401',
    files: mockFiles('john'),
    housing: 'Pending',
    itinerary: mockItinerary(
      {
        date: 'June 8, 2026',
        time: '2:30 PM',
        airport: 'Athens (ATH)',
      },
      {
        date: 'July 19, 2026',
        time: '10:15 AM',
        airport: 'Athens (ATH)',
      },
    ),
    coordinator: 'Sarah',
    termNotes: [],
    onboardingSteps: [
      { title: 'Application Submitted', status: 'Complete' },
      {
        title: 'Invoice Paid',
        status: 'Complete',
        quickbooksInvoiceId: 'mock-invoice-1042-paid',
      },
      { title: 'Pastor Reference', status: 'Pending' },
      { title: 'Added To Chat Group', status: 'Pending' },
      { title: 'Sent To Field', status: 'Pending' },
    ],
    activityTimeline: [
      { date: 'May 4', text: 'Application Submitted' },
      { date: 'May 6', text: 'Invoice Sent' },
      { date: 'May 10', text: 'Invoice Paid' },
    ],
    applicationFormFields: MOCK_APPLICATION_FORM_FIELDS,
    pastorReferenceFormFields: MOCK_PASTOR_REFERENCE_FORM_FIELDS,
  },
  'mock-2': {
    id: 'mock-2',
    name: 'Rachel Kim',
    locationPreference: 'Germany',
    location: '—',
    status: 'New',
    timelineId: 'fall-2026',
    profilePhotoUrl: mockProfilePhotoUrl('rachel'),
    email: 'rachel.kim@example.com',
    emails: buildApplicationEmails({
      volunteerEmail: 'rachel.kim@example.com',
      parentEmail: 'parents.kim@example.com',
      pastorEmail: 'pastor.kim@example.com',
    }),
    phone: '+49 30 901820',
    files: mockFiles('rachel'),
    housing: 'Pending',
    itinerary: mockItinerary(
      {
        date: 'September 15, 2026',
        time: '4:00 PM',
        airport: 'Frankfurt (FRA)',
      },
      {
        date: 'November 1, 2026',
        time: '11:30 AM',
        airport: 'Frankfurt (FRA)',
      },
    ),
    coordinator: 'Thomas',
    termNotes: [],
    onboardingSteps: [
      { title: 'Application Submitted', status: 'Complete' },
      {
        title: 'Invoice Paid',
        status: 'Pending',
        quickbooksInvoiceId: 'mock-invoice-2088',
      },
      { title: 'Pastor Reference', status: 'Pending' },
      { title: 'Added To Chat Group', status: 'Pending' },
      { title: 'Sent To Field', status: 'Pending' },
    ],
    activityTimeline: [{ date: 'Jun 1', text: 'Application Submitted' }],
    applicationFormFields: MOCK_APPLICATION_FORM_FIELDS_RACHEL,
    pastorReferenceFormFields: MOCK_PASTOR_REFERENCE_FORM_FIELDS_RACHEL,
  },
};

function buildMockDetail(volunteer: Volunteer): VolunteerDetail {
  const preset = mockDetails[volunteer.id];
  if (preset) return preset;

  const seed = volunteer.id.replace(/\W/g, '') || 'volunteer';
  return {
    ...volunteer,
    profilePhotoUrl:
      volunteer.profilePhotoUrl ?? mockProfilePhotoUrl(seed),
    email: mockEmail(volunteer.name),
    emails: buildApplicationEmails({
      volunteerEmail: mockEmail(volunteer.name),
      parentEmail: `parent.${seed}@example.com`,
      pastorEmail: `pastor.${seed}@example.com`,
    }),
    phone: '+1 (555) 000-0000',
    files: mockFiles(seed),
    housing: 'Pending',
    itinerary: mockItinerary(
      { date: '', time: '', airport: '' },
      { date: '', time: '', airport: '' },
    ),
    coordinator: '—',
    termNotes: [],
    onboardingSteps: [
      { title: 'Application Submitted', status: 'Pending' },
      { title: 'Invoice Paid', status: 'Pending' },
      { title: 'Pastor Reference', status: 'Pending' },
      { title: 'Added To Chat Group', status: 'Pending' },
      { title: 'Sent To Field', status: 'Pending' },
    ],
    activityTimeline: [],
    applicationFormFields: MOCK_APPLICATION_FORM_FIELDS,
    pastorReferenceFormFields: MOCK_PASTOR_REFERENCE_FORM_FIELDS,
  };
}

interface UseApplicationDetailReturn {
  detail: VolunteerDetail | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useApplicationDetail(
  volunteer: Volunteer | null,
): UseApplicationDetailReturn {
  const [detail, setDetail] = useState<VolunteerDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const isMock = useMockData();

  const refetch = () => setReloadKey((k) => k + 1);

  useEffect(() => {
    const selected = volunteer;
    if (!selected) {
      setDetail(null);
      setError(null);
      setLoading(false);
      return;
    }

    if (isMock || selected.id.startsWith('mock-')) {
      setDetail(buildMockDetail(selected));
      setLoading(false);
      setError(null);
      return;
    }

    const itemId = selected.id;
    const fallback = selected;
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchApplicationDetail(itemId);
        if (!cancelled) {
          setDetail(data);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : 'Failed to load application',
          );
          setDetail(buildMockDetail(fallback));
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [volunteer, isMock, reloadKey]);

  return { detail, loading, error, refetch };
}
