import type { PipelineSection, Volunteer, CouplePreview } from '../types/volunteer';
import type { VolunteerItinerary } from '../types/itinerary';
import { mockProfilePhotoUrl } from '../utils/mockProfilePhoto';

function mockItinerary(
  arrival: VolunteerItinerary['arrival'],
  departure: VolunteerItinerary['departure'],
): VolunteerItinerary {
  return { arrival, departure };
}

function v(seed: VolunteerSeed): Volunteer {
  const { photoSeed, couplePreview, ...rest } = seed;
  const slug =
    photoSeed ?? seed.name.split(/\s+/)[0]?.toLowerCase() ?? seed.id;
  return {
    ...rest,
    profilePhotoUrl: mockProfilePhotoUrl(slug),
    ...(couplePreview ? { couplePreview } : {}),
  };
}

type VolunteerSeed = Omit<Volunteer, 'profilePhotoUrl'> & {
  photoSeed?: string;
  couplePreview?: CouplePreview;
};

const STAGE_VOLUNTEERS: Record<string, VolunteerSeed[]> = {
  'New Applications': [
    {
      id: 'mock-1',
      name: 'John Doe',
      locationPreference: 'Lesvos',
      location: '—',
      status: 'Awaiting Reference',
      timelineId: 'summer-2026-a',
    },
    {
      id: 'mock-2',
      name: 'Rachel Kim',
      locationPreference: 'Germany',
      location: '—',
      status: 'New',
      timelineId: 'fall-2026',
    },
    {
      id: 'mock-7',
      name: 'Amara Okafor',
      locationPreference: 'Lesvos',
      location: '—',
      status: 'New',
      timelineId: 'summer-2026-b',
      photoSeed: 'amara',
    },
    {
      id: 'mock-8',
      name: 'Lucas Bergmann',
      locationPreference: 'Germany',
      location: '—',
      status: 'Awaiting Reference',
      timelineId: 'fall-2026',
      photoSeed: 'lucas',
    },
    {
      id: 'mock-9',
      name: 'Sofia Martinez',
      locationPreference: 'Malakasa',
      location: '—',
      status: 'New',
      timelineId: 'summer-2026-a',
      photoSeed: 'sofia',
    },
    {
      id: 'mock-10',
      name: 'Ethan Walsh',
      locationPreference: 'Other',
      location: '—',
      status: 'Awaiting Reference',
      timelineId: 'spring-2027',
      photoSeed: 'ethan',
    },
    {
      id: 'mock-11',
      name: 'Priya Nair',
      locationPreference: 'Lesvos',
      location: '—',
      status: 'New',
      timelineId: 'summer-2026-a',
      photoSeed: 'priya',
    },
    {
      id: 'mock-12',
      name: 'Oliver Hansen',
      locationPreference: 'Germany',
      location: '—',
      status: 'Awaiting Reference',
      timelineId: 'summer-2026-b',
      photoSeed: 'oliver',
    },
  ],
  'Pastor Reference Received': [
    {
      id: 'mock-3',
      name: 'Sarah Johnson',
      locationPreference: 'Lesvos',
      location: '—',
      status: 'Ready For Placement',
      timelineId: 'summer-2026-b',
    },
    {
      id: 'mock-13',
      name: 'Maya Patel',
      locationPreference: 'Germany',
      location: '—',
      status: 'Ready For Placement',
      timelineId: 'fall-2026',
      photoSeed: 'maya',
    },
    {
      id: 'mock-14',
      name: 'Daniel Okonkwo',
      locationPreference: 'Lesvos',
      location: '—',
      status: 'Reference Complete',
      timelineId: 'summer-2026-a',
      photoSeed: 'daniel',
    },
    {
      id: 'mock-15',
      name: 'Hannah Lindström',
      locationPreference: 'Malakasa',
      location: '—',
      status: 'Ready For Placement',
      timelineId: 'spring-2027',
      photoSeed: 'hannah',
    },
    {
      id: 'mock-16',
      name: 'James O\'Brien',
      locationPreference: 'Other',
      location: '—',
      status: 'Ready For Placement',
      timelineId: 'summer-2026-b',
      photoSeed: 'james',
    },
  ],
  'Confirmed Location': [
    {
      id: 'mock-couple-fisher',
      name: 'Arlen & Sharon Fisher',
      locationPreference: 'Lesvos',
      location: 'Athens',
      status: 'Housing Confirmed',
      timelineId: 'summer-2026-a',
      photoSeed: 'arlen',
      couplePreview: {
        displayName: 'Arlen & Sharon Fisher',
        primaryFirstName: 'Arlen',
        primaryEmail: 'arlen.fisher@example.com',
        partnerName: 'Sharon Fisher',
        partnerFirstName: 'Sharon',
        partnerEmail: 'sharon.fisher@example.com',
        partnerPhotoUrl: mockProfilePhotoUrl('sharon'),
      },
    },
    {
      id: 'mock-4',
      name: 'Michael Torres',
      locationPreference: 'Lesvos',
      location: 'Malakasa',
      status: 'Housing Confirmed',
      timelineId: 'summer-2026-a',
    },
    {
      id: 'mock-17',
      name: 'Isabella Romano',
      locationPreference: 'Germany',
      location: 'Germany',
      status: 'Housing Confirmed',
      timelineId: 'fall-2026',
      photoSeed: 'isabella',
    },
    {
      id: 'mock-18',
      name: 'Noah Williams',
      locationPreference: 'Lesvos',
      location: 'Lesvos',
      status: 'Placement Confirmed',
      timelineId: 'summer-2026-b',
      photoSeed: 'noah',
    },
    {
      id: 'mock-19',
      name: 'Chloe Dubois',
      locationPreference: 'Malakasa',
      location: 'Malakasa',
      status: 'Housing Confirmed',
      timelineId: 'spring-2027',
      photoSeed: 'chloe',
    },
    {
      id: 'mock-20',
      name: 'Marcus Lee',
      locationPreference: 'Other',
      location: 'Other',
      status: 'Placement Confirmed',
      timelineId: 'summer-2026-a',
      photoSeed: 'marcus',
    },
  ],
  'Added To Chat Group': [
    {
      id: 'mock-5',
      name: 'Emily Chen',
      locationPreference: 'Other',
      location: '—',
      status: 'Awaiting Arrival',
      timelineId: 'spring-2027',
    },
    {
      id: 'mock-21',
      name: 'Aiden Murphy',
      locationPreference: 'Lesvos',
      location: 'Lesvos',
      status: 'Awaiting Arrival',
      timelineId: 'summer-2026-a',
      photoSeed: 'aiden',
      itinerary: mockItinerary(
        { date: 'June 8, 2026', time: '2:30 PM', airport: 'ATH' },
        { date: 'July 19, 2026', time: '10:15 AM', airport: 'ATH' },
      ),
    },
    {
      id: 'mock-22',
      name: 'Zoe Papadopoulos',
      locationPreference: 'Germany',
      location: 'Germany',
      status: 'Pre-arrival',
      timelineId: 'fall-2026',
      photoSeed: 'zoe',
    },
    {
      id: 'mock-23',
      name: 'Ryan Cooper',
      locationPreference: 'Malakasa',
      location: 'Malakasa',
      status: 'Awaiting Arrival',
      timelineId: 'summer-2026-b',
      photoSeed: 'ryan',
    },
  ],
  'Sent To Field': [
    {
      id: 'mock-6',
      name: 'Nathan Brooks',
      locationPreference: 'Germany',
      location: 'Germany',
      status: 'Active',
      timelineId: 'summer-2026-b',
      itinerary: mockItinerary(
        { date: 'July 20, 2026', time: '4:05 PM', airport: 'MUC' },
        { date: 'August 30, 2026', time: '11:40 AM', airport: 'MUC' },
      ),
    },
    {
      id: 'mock-24',
      name: 'Lily Andersson',
      locationPreference: 'Lesvos',
      location: 'Lesvos',
      status: 'Active',
      timelineId: 'summer-2026-a',
      photoSeed: 'lily',
      itinerary: mockItinerary(
        { date: 'June 8, 2026', time: '1:10 PM', airport: 'ATH' },
        { date: 'July 19, 2026', time: '9:20 AM', airport: 'ATH' },
      ),
    },
    {
      id: 'mock-25',
      name: 'Carlos Mendez',
      locationPreference: 'Malakasa',
      location: 'Malakasa',
      status: 'On Field',
      timelineId: 'fall-2026',
      photoSeed: 'carlos',
    },
    {
      id: 'mock-26',
      name: 'Grace Tanaka',
      locationPreference: 'Other',
      location: 'Other',
      status: 'Active',
      timelineId: 'spring-2027',
      photoSeed: 'grace',
    },
  ],
};

const STAGE_ORDER = [
  'New Applications',
  'Pastor Reference Received',
  'Confirmed Location',
  'Added To Chat Group',
  'Sent To Field',
] as const;

export const applicationPipeline: PipelineSection[] = STAGE_ORDER.map(
  (stage) => ({
    stage,
    volunteers: (STAGE_VOLUNTEERS[stage] ?? []).map(v),
  }),
);

export function countVolunteers(pipeline: PipelineSection[]): number {
  return pipeline.reduce((sum, section) => sum + section.volunteers.length, 0);
}
