import type {
  ContactDemographics,
  CurrentApplicationSummary,
} from '../types/contact';
import type { VolunteerFile, VolunteerTerm } from '../types/volunteer';
import { formatPhoneDisplay } from '../utils/phoneFormat';
import { buildMockMailingDemographics } from './mockMailingAddress';
import { mockFiles } from './mockVolunteerDetail';
import {
  SIGNUP_TIMELINES,
  formatTimelineArrival,
  getTimelineById,
} from './timelines';

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

const PIPELINE_STAGES = [
  'New Applications',
  'Pastor Reference Received',
  'Confirmed Location',
  'Added To Chat Group',
] as const;

const APPLICATION_STATUSES = [
  'New',
  'Awaiting Reference',
  'Confirmed',
  'In progress',
] as const;

const LOCATION_PREFERENCES = ['Lesvos', 'Germany', 'Malakasa', 'Other'] as const;

const REFERENCE_STATUSES = ['Pending', 'Complete', 'Not required'] as const;

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) || 1;
}

function createRng(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

function pick<T>(rand: () => number, items: readonly T[]): T {
  return items[Math.floor(rand() * items.length)]!;
}

function formatTimelineEnd(timelineId: string): string {
  const timeline = getTimelineById(timelineId);
  if (!timeline) return '—';
  const end = new Date(`${timeline.endDate}T00:00:00`);
  return end.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function shortTimelineLabel(fullLabel: string): string {
  return fullLabel.split(' (')[0] ?? fullLabel;
}

export function buildMockVolunteerDemographics(
  contactId: string,
): ContactDemographics {
  const base = buildMockMailingDemographics(contactId);
  const rand = createRng(hashString(`${contactId}-dob`));
  const year = 1994 + Math.floor(rand() * 12);
  const month = MONTHS[Math.floor(rand() * MONTHS.length)];
  const day = 1 + Math.floor(rand() * 28);

  return {
    ...base,
    dateOfBirth: `${month} ${day}, ${year}`,
  };
}

export function buildMockVolunteerFiles(contactId: string): VolunteerFile[] {
  const seed = contactId.replace(/\W/g, '') || 'contact';
  return mockFiles(seed);
}

export function buildMockVolunteerApplicationContext(contactId: string): {
  currentApplication: CurrentApplicationSummary;
  serviceTerms: VolunteerTerm[];
} {
  const rand = createRng(hashString(`${contactId}-application`));
  const timeline = pick(rand, SIGNUP_TIMELINES);
  const pipelineStage = pick(rand, PIPELINE_STAGES);
  const status = pick(rand, APPLICATION_STATUSES);
  const locationPreference = pick(rand, LOCATION_PREFERENCES);
  const pastorReferenceStatus = pick(rand, REFERENCE_STATUSES);
  const itemId = `mock-${contactId}`;
  const timelineLabel = shortTimelineLabel(timeline.label);
  const invoiceNum = 1000 + (hashString(contactId) % 9000);

  const term: VolunteerTerm = {
    itemId,
    timelineId: timeline.id,
    timelineLabel,
    termStart: formatTimelineArrival(timeline.id),
    termEnd: formatTimelineEnd(timeline.id),
    status,
    pipelineStage,
    quickbooksInvoiceId: `mock-invoice-${invoiceNum}`,
    pastorReferenceStatus,
    locationPreference,
    notes: [],
  };

  return {
    currentApplication: {
      itemId,
      stage: pipelineStage,
      status,
      timelineLabel,
    },
    serviceTerms: [term],
  };
}

/** Phone for generated contacts; volunteers always receive a number. */
export function phoneForGeneratedContact(
  index: number,
  idNum: number,
  isVolunteer: boolean,
): string | undefined {
  if (!isVolunteer && index % 4 === 0) return undefined;

  const regions = ['+1555', '+4420', '+4930', '+331', '+3021'];
  const prefix = regions[index % regions.length];
  const local = String(2000000 + idNum).slice(-7);
  const raw = `${prefix}${local}`;
  return formatPhoneDisplay(raw) ?? raw;
}
