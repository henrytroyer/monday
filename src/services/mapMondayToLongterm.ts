import {
  LONGTERM_EXCLUDED_GROUPS,
  LONGTERM_ON_FIELD_GROUP_MAP,
  LONGTERM_PIPELINE_GROUP_MAP,
  longtermColumnMap,
} from '../config/longtermColumnMap';
import { LONGTERM_FIELD_LOCATIONS } from '../constants/longtermFieldLocations';
import { LONGTERM_STATUS_OPTIONS, type LongtermStatus } from '../constants/longtermApplicationStatuses';
import {
  LONGTERM_REFERENCE_SLOT_TYPES,
  type LongtermReferenceType,
} from '../constants/longtermReferenceSlots';
import type { LongtermReferenceSlot } from '../types/longtermReference';
import type { LongtermVolunteer } from '../types/longtermVolunteer';
import type { VolunteerDetail } from '../types/volunteer';
import { buildApplicationEmails } from '../utils/applicationEmails';
import { formatPhoneDisplay } from '../utils/phoneFormat';
import { isLongtermFieldLocation } from '../data/mockLongtermApplications';
import {
  buildLongtermApplicationFormFields,
  buildLongtermPastorReferenceFormFields,
} from './applicationFormFields';
import {
  getArrivalDepartureTimelineRange,
  parseMondayTimelineColumn,
} from './mondayTimelineColumn';
import type { MondayBoardItem, MondayColumnValue, MondayItemDetail } from './mapMondayToCrm';
import {
  mergeVolunteerGalleryFiles,
  parseMondayFileColumn,
  resolvePassportFile,
  resolveProfilePhotoUrl,
} from './mondayFileColumns';
import { parseTermNotes } from './termNotes';

function normalizeTitle(title: string): string {
  return title.trim().toLowerCase();
}

function columnTitle(col: MondayColumnValue): string {
  return col.column?.title?.trim() || '';
}

export function findLongtermColumn(
  columnValues: MondayColumnValue[],
  fieldKey: keyof typeof longtermColumnMap,
): MondayColumnValue | undefined {
  const target = normalizeTitle(longtermColumnMap[fieldKey]);
  return columnValues.find(
    (col) => normalizeTitle(columnTitle(col)) === target,
  );
}

export function getLongtermColumnText(
  columnValues: MondayColumnValue[],
  fieldKey: keyof typeof longtermColumnMap,
): string {
  return findLongtermColumn(columnValues, fieldKey)?.text?.trim() || '';
}

function findLongtermColumnByTitleAndType(
  columnValues: MondayColumnValue[],
  title: string,
  type: string,
): MondayColumnValue | undefined {
  const target = normalizeTitle(title);
  return columnValues.find(
    (col) =>
      normalizeTitle(columnTitle(col)) === target && col.type === type,
  );
}

function getReferenceFieldText(
  columnValues: MondayColumnValue[],
  title: string,
  type: 'text' | 'email' | 'phone',
): string {
  return findLongtermColumnByTitleAndType(columnValues, title, type)?.text?.trim() || '';
}

function normalizeLongtermStatus(raw: string, groupTitle?: string): LongtermStatus {
  const trimmed = raw.trim();
  const lower = trimmed.toLowerCase();

  const fromText: Record<string, LongtermStatus> = {
    new: 'New',
    'references sent': 'references sent',
    holding: 'Holding',
    approved: 'approved',
    clearances: 'clearances',
    preparation: 'prepartation',
    prepartation: 'prepartation',
  };

  if (fromText[lower]) return fromText[lower];

  if (groupTitle && LONGTERM_PIPELINE_GROUP_MAP[groupTitle]) {
    return LONGTERM_PIPELINE_GROUP_MAP[groupTitle] as LongtermStatus;
  }

  const fallback = (LONGTERM_STATUS_OPTIONS as readonly string[]).find(
    (option) => option.toLowerCase() === lower,
  );
  return (fallback as LongtermStatus | undefined) ?? 'New';
}

export function resolveLongtermPlacement(item: MondayBoardItem): {
  onField: boolean;
  fieldLocation?: LongtermVolunteer['fieldLocation'];
  status: LongtermStatus;
} {
  const groupTitle = item.group?.title?.trim() ?? '';
  const fieldFromGroup = LONGTERM_ON_FIELD_GROUP_MAP[groupTitle];

  if (fieldFromGroup && isLongtermFieldLocation(fieldFromGroup)) {
    const statusText = getLongtermColumnText(item.column_values, 'status');
    return {
      onField: true,
      fieldLocation: fieldFromGroup,
      status: normalizeLongtermStatus(statusText || 'approved', groupTitle),
    };
  }

  const statusText = getLongtermColumnText(item.column_values, 'status');
  return {
    onField: false,
    status: normalizeLongtermStatus(
      statusText || LONGTERM_PIPELINE_GROUP_MAP[groupTitle] || 'New',
      groupTitle,
    ),
  };
}

export function shouldIncludeLongtermItem(item: MondayBoardItem): boolean {
  const groupTitle = item.group?.title?.trim() ?? '';
  return !LONGTERM_EXCLUDED_GROUPS.has(groupTitle);
}

export function mapItemToLongtermVolunteer(item: MondayBoardItem): LongtermVolunteer {
  const placement = resolveLongtermPlacement(item);
  const locationPreference =
    getLongtermColumnText(item.column_values, 'locationPreference') ||
    getLongtermColumnText(item.column_values, 'location') ||
    'Other';
  const location =
    getLongtermColumnText(item.column_values, 'location') ||
    getLongtermColumnText(item.column_values, 'currentLocation') ||
    placement.fieldLocation ||
    '—';
  const timelineLabel = getLongtermColumnText(item.column_values, 'signupTimeline');
  const termRange =
    parseMondayTimelineColumn(
      findLongtermColumn(item.column_values, 'termRange'),
    ) ?? getArrivalDepartureTimelineRange(item.column_values);

  return {
    id: item.id,
    name: item.name,
    locationPreference,
    location,
    status: placement.status,
    timelineId: timelineLabel ? timelineLabel.toLowerCase().replace(/\s+/g, '-') : 'longterm',
    preferredDates: timelineLabel || undefined,
    termStart: termRange?.from,
    termEnd: termRange?.to,
    pipelineStage: item.group?.title || undefined,
    profilePhotoUrl: resolveProfilePhotoUrl(
      findLongtermColumn(item.column_values, 'profilePhoto'),
      undefined,
    ),
    onField: placement.onField,
    fieldLocation: placement.fieldLocation,
  };
}

export function mapBoardToLongtermVolunteers(
  items: MondayBoardItem[],
): LongtermVolunteer[] {
  return items.filter(shouldIncludeLongtermItem).map(mapItemToLongtermVolunteer);
}

function buildReferenceSlot(
  slotIndex: number,
  type: LongtermReferenceType,
  name?: string,
  email?: string,
): LongtermReferenceSlot {
  const hasContact = Boolean(name?.trim() || email?.trim());
  return {
    slotIndex,
    type,
    status: hasContact ? 'received' : 'pending',
    refereeName: name?.trim() || undefined,
    refereeEmail: email?.trim() || undefined,
  };
}

export function buildLongtermReferenceSlotsFromColumns(
  columnValues: MondayColumnValue[],
): LongtermReferenceSlot[] {
  const slotSources: Array<{ type: LongtermReferenceType; name?: string; email?: string }> = [
    {
      type: 'friend',
      name: getReferenceFieldText(columnValues, 'Reference (Friend)', 'text'),
      email: getReferenceFieldText(columnValues, 'Reference (Friend)', 'email'),
    },
    {
      type: 'employer',
      name: getLongtermColumnText(columnValues, 'referenceEmployerName'),
      email: getLongtermColumnText(columnValues, 'referenceEmployerEmail'),
    },
    {
      type: 'pastor',
      name: getReferenceFieldText(columnValues, 'Reference (Pastor)', 'text'),
      email: getReferenceFieldText(columnValues, 'Reference (Pastor)', 'email'),
    },
    {
      type: 'friend',
      name: getReferenceFieldText(columnValues, 'Reference (Youth Pastor/Mentor)', 'text'),
      email: getReferenceFieldText(columnValues, 'Reference (Youth Pastor/Mentor)', 'email'),
    },
    {
      type: 'friend',
      name: getReferenceFieldText(columnValues, 'Reference (Parent)', 'text'),
      email: getReferenceFieldText(columnValues, 'Reference (Parent)', 'email'),
    },
  ];

  return LONGTERM_REFERENCE_SLOT_TYPES.map((type, slotIndex) => {
    const source = slotSources[slotIndex] ?? { type, name: undefined, email: undefined };
    return buildReferenceSlot(slotIndex, source.type, source.name, source.email);
  });
}

function getLongtermPhone(columnValues: MondayColumnValue[]): string {
  const col = findLongtermColumn(columnValues, 'phone');
  if (!col?.text?.trim()) return '—';
  return formatPhoneDisplay(col.text) || col.text.trim();
}

function getLongtermFiles(columnValues: MondayColumnValue[]): VolunteerDetail['files'] {
  const profilePhotoUrl = resolveProfilePhotoUrl(
    findLongtermColumn(columnValues, 'profilePhoto'),
    undefined,
  );
  const passportFile = resolvePassportFile(
    findLongtermColumn(columnValues, 'passport'),
    undefined,
  );

  return mergeVolunteerGalleryFiles(
    [
      passportFile ? [passportFile] : [],
      parseMondayFileColumn(findLongtermColumn(columnValues, 'profilePhoto')),
      parseMondayFileColumn(findLongtermColumn(columnValues, 'passport')),
    ],
    { profilePhotoUrl, passportPhotoUrl: passportFile?.url },
  );
}

export function mapItemToLongtermVolunteerDetail(
  item: MondayItemDetail,
): VolunteerDetail & { longtermReferenceSlots: LongtermReferenceSlot[] } {
  const base = mapItemToLongtermVolunteer(item);
  const email = getLongtermColumnText(item.column_values, 'email') || '—';
  const phone = getLongtermPhone(item.column_values);
  const passportFile = resolvePassportFile(
    findLongtermColumn(item.column_values, 'passport'),
    undefined,
  );
  const files = getLongtermFiles(item.column_values);
  const termNotes = parseTermNotes(item.id, item.updates, base.timelineId);
  const longtermReferenceSlots = buildLongtermReferenceSlotsFromColumns(
    item.column_values,
  );

  return {
    ...base,
    email,
    emails: buildApplicationEmails({
      volunteerEmail: email,
      pastorEmail:
        getLongtermColumnText(item.column_values, 'referencePastorEmail') ||
        undefined,
    }),
    phone,
    passportFile,
    files,
    housing: '—',
    itinerary: {
      arrival: base.termStart
        ? { date: base.termStart, time: '—', airport: '—' }
        : { date: '—', time: '—', airport: '—' },
      departure: base.termEnd
        ? { date: base.termEnd, time: '—', airport: '—' }
        : { date: '—', time: '—', airport: '—' },
    },
    coordinator: '—',
    termNotes,
    rawUpdates: item.updates,
    onboardingSteps: [],
    activityTimeline: [],
    itemCreatedAt: item.created_at || undefined,
    applicationFormFields: buildLongtermApplicationFormFields(item.column_values),
    pastorReferenceFormFields: buildLongtermPastorReferenceFormFields(
      item.column_values,
    ),
    longtermReferenceSlots,
  };
}

export function buildLongtermStatusOptionsFromGroups(): LongtermStatus[] {
  const fromGroups = Object.values(LONGTERM_PIPELINE_GROUP_MAP);
  const merged = new Set<string>([...LONGTERM_STATUS_OPTIONS, ...fromGroups]);
  return Array.from(merged).filter((value) =>
    (LONGTERM_STATUS_OPTIONS as readonly string[]).includes(value),
  ) as LongtermStatus[];
}

export { LONGTERM_FIELD_LOCATIONS };
