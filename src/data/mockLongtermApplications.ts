import { LONGTERM_STATUS_OPTIONS, type LongtermStatus } from '../constants/longtermApplicationStatuses';
import { LONGTERM_FIELD_LOCATIONS, type LongtermFieldLocation } from '../constants/longtermFieldLocations';
import type { LongtermVolunteer } from '../types/longtermVolunteer';
import { mockProfilePhotoUrl } from '../utils/mockProfilePhoto';

type LongtermSeed = Omit<LongtermVolunteer, 'profilePhotoUrl'> & {
  photoSeed?: string;
};

function lv(seed: LongtermSeed): LongtermVolunteer {
  const { photoSeed, ...rest } = seed;
  const slug =
    photoSeed ?? seed.name.split(/\s+/)[0]?.toLowerCase() ?? seed.id;
  return {
    ...rest,
    profilePhotoUrl: mockProfilePhotoUrl(slug),
  };
}

const PIPELINE_SEEDS: LongtermSeed[] = [
  {
    id: 'longterm-mock-1',
    name: 'John Doe (Long-term)',
    locationPreference: 'Lesvos',
    location: '—',
    status: 'New',
    timelineId: 'spring-2027',
    onField: false,
  },
  {
    id: 'longterm-mock-2',
    name: 'Anna Bergstrom',
    locationPreference: 'Germany',
    location: '—',
    status: 'New',
    timelineId: 'spring-2027',
    onField: false,
  },
  {
    id: 'longterm-mock-3',
    name: 'Mateo Alvarez',
    locationPreference: 'Lesvos',
    location: '—',
    status: 'references sent',
    timelineId: 'fall-2026',
    onField: false,
  },
  {
    id: 'longterm-mock-4',
    name: 'Sophie Laurent',
    locationPreference: 'Germany',
    location: '—',
    status: 'references sent',
    timelineId: 'spring-2027',
    onField: false,
  },
  {
    id: 'longterm-mock-5',
    name: 'David Okonkwo',
    locationPreference: 'Malakasa',
    location: '—',
    status: 'Holding',
    timelineId: 'fall-2026',
    onField: false,
  },
  {
    id: 'longterm-mock-6',
    name: 'Emily Hart',
    locationPreference: 'Lesvos',
    location: '—',
    status: 'approved',
    timelineId: 'spring-2027',
    onField: false,
  },
  {
    id: 'longterm-mock-7',
    name: 'Jonas Meier',
    locationPreference: 'Germany',
    location: '—',
    status: 'clearances',
    timelineId: 'fall-2026',
    onField: false,
  },
  {
    id: 'longterm-mock-8',
    name: 'Priya Nair',
    locationPreference: 'Lesvos',
    location: '—',
    status: 'prepartation',
    timelineId: 'spring-2027',
    onField: false,
  },
];

const ON_FIELD_SEEDS: LongtermSeed[] = [
  {
    id: 'longterm-mock-couple-arlen',
    name: 'Arlen Fisher',
    locationPreference: 'Lesvos',
    location: 'Lesvos',
    status: 'approved',
    timelineId: 'fall-2026',
    onField: true,
    fieldLocation: 'Lesvos',
    maritalStatus: 'Married',
    homeAddress: '100 Orchard Lane, Lancaster, PA, USA',
    email: 'arlen.fisher@example.com',
    photoSeed: 'arlen',
  },
  {
    id: 'longterm-mock-couple-sharon',
    name: 'Sharon Fisher',
    locationPreference: 'Lesvos',
    location: 'Lesvos',
    status: 'approved',
    timelineId: 'fall-2026',
    onField: true,
    fieldLocation: 'Lesvos',
    maritalStatus: 'Married',
    homeAddress: '100 Orchard Ln, Lancaster, PA, USA',
    email: 'sharon.fisher@example.com',
    photoSeed: 'sharon',
  },
  {
    id: 'longterm-mock-10',
    name: 'Maria Papadopoulos',
    locationPreference: 'Malakasa',
    location: 'Malakasa',
    status: 'approved',
    timelineId: 'fall-2026',
    onField: true,
    fieldLocation: 'Malakasa',
  },
  {
    id: 'longterm-mock-11',
    name: 'Lukas Fischer',
    locationPreference: 'Germany',
    location: 'Taunusstien',
    status: 'clearances',
    timelineId: 'spring-2027',
    onField: true,
    fieldLocation: 'Taunusstien',
  },
  {
    id: 'longterm-mock-12',
    name: 'Claire Dubois',
    locationPreference: 'Germany',
    location: 'Neustadt',
    status: 'prepartation',
    timelineId: 'spring-2027',
    onField: true,
    fieldLocation: 'Neustadt',
  },
  {
    id: 'longterm-mock-13',
    name: 'Felix Wagner',
    locationPreference: 'Germany',
    location: 'Giessen',
    status: 'approved',
    timelineId: 'fall-2026',
    onField: true,
    fieldLocation: 'Giessen',
  },
  {
    id: 'longterm-mock-14',
    name: 'Sarah Chen (Intern)',
    locationPreference: 'Other',
    location: 'Intern',
    status: 'clearances',
    timelineId: 'fall-2026',
    onField: true,
    fieldLocation: 'Intern',
  },
];

export const initialLongtermVolunteers: LongtermVolunteer[] = [
  ...PIPELINE_SEEDS.map(lv),
  ...ON_FIELD_SEEDS.map(lv),
];

export function isLongtermStatus(value: string): value is LongtermStatus {
  return (LONGTERM_STATUS_OPTIONS as readonly string[]).includes(value);
}

export function isLongtermFieldLocation(
  value: string,
): value is LongtermFieldLocation {
  return (LONGTERM_FIELD_LOCATIONS as readonly string[]).includes(value);
}
