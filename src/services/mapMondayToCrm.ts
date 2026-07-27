import type { ContactDemographics } from '../types/contact';
import { columnMap } from '../config/columnMap';
import { resolveTimelineId } from '../config/timelineMap';
import { buildApplicationEmailsFromColumns } from '../utils/applicationEmails';
import { getColumnPhone } from '../utils/phoneFormat';
import {
  excludeGalleryDuplicatesOfColumnFiles,
  getAllFilesFromColumnValues,
  mapMondayGalleryAssets,
  mergeVolunteerGalleryFiles,
  parseMondayFileColumn,
  resolvePassportFile,
  resolveProfilePhotoUrl,
  type MondayGalleryAsset,
} from './mondayFileColumns';
import { promoteItineraryFileNames } from './itineraryFromFiles';
import {
  buildCoupleApplication,
  buildCouplePreview,
} from './coupleApplication';
import { parseItineraryFromColumns } from './itinerary';
import { getArrivalDepartureTimelineRange } from './mondayTimelineColumn';
import {
  buildApplicationFormFields,
  buildPastorReferenceFormFields,
} from './applicationFormFields';
import {
  parseTermNotes,
  type MondayItemUpdateRaw,
} from './termNotes';
import type {
  PipelineSection,
  Volunteer,
  VolunteerDetail,
  VolunteerFile,
} from '../types/volunteer';
import { resolveApplicationDemographics } from '../utils/applicationDemographics';

export interface MondayColumnValue {
  id: string;
  text: string | null;
  value: string | null;
  type: string;
  column?: { title: string } | null;
  /** Present on board_relation columns when queried with BoardRelationValue fragment. */
  linked_item_ids?: string[] | null;
  /** Present on file columns when queried with FileValue fragment. */
  files?: Array<{
    asset_id?: string | number | null;
    name?: string | null;
    public_url?: string | null;
    url?: string | null;
    is_image?: boolean | null;
  }> | null;
}

export interface MondayBoardItem {
  id: string;
  name: string;
  group?: { id: string; title: string } | null;
  column_values: MondayColumnValue[];
  created_at?: string;
  updated_at?: string;
}

export interface MondayBoardGroup {
  id: string;
  title: string;
}

export interface MondayBoardPipeline {
  id: string;
  name: string;
  groups: MondayBoardGroup[];
  items: MondayBoardItem[];
}

export interface MondayItemDetail extends MondayBoardItem {
  updates?: MondayItemUpdateRaw[];
  assets?: MondayGalleryAsset[] | null;
}

function normalizeTitle(title: string): string {
  return title.trim().toLowerCase();
}

function columnTitle(col: MondayColumnValue): string {
  return col.column?.title?.trim() || '';
}

function findColumn(
  columnValues: MondayColumnValue[],
  fieldKey: keyof typeof columnMap,
): MondayColumnValue | undefined {
  const target = normalizeTitle(columnMap[fieldKey]);
  return columnValues.find(
    (c) => normalizeTitle(columnTitle(c)) === target,
  );
}

export function getColumnText(
  columnValues: MondayColumnValue[],
  fieldKey: keyof typeof columnMap,
): string {
  return findColumn(columnValues, fieldKey)?.text?.trim() || '';
}

/** Date columns may store ISO dates in `value` JSON while `text` is empty. */
export function getColumnDateText(
  columnValues: MondayColumnValue[],
  fieldKey: keyof typeof columnMap,
): string {
  const col = findColumn(columnValues, fieldKey);
  if (!col) return '';

  const text = col.text?.trim();
  if (text) return text;

  if (col.value) {
    try {
      const parsed = JSON.parse(col.value) as { date?: string };
      if (parsed.date?.trim()) return parsed.date.trim();
    } catch {
      // fall through
    }
  }

  return '';
}

function getProfilePhotoUrl(
  columnValues: MondayColumnValue[],
): string | undefined {
  return resolveProfilePhotoUrl(
    findColumn(columnValues, 'profilePhoto'),
    findColumn(columnValues, 'files'),
  );
}

function getApplicationPassportFile(
  columnValues: MondayColumnValue[],
): VolunteerFile | undefined {
  return resolvePassportFile(
    findColumn(columnValues, 'passport'),
    findColumn(columnValues, 'passportNew'),
  );
}

export { buildCoupleApplication, buildCouplePreview, firstNameFromFullName } from './coupleApplication';

export function getApplicationFilesFromColumns(
  columnValues: MondayColumnValue[],
): VolunteerFile[] {
  return getFileGallery(columnValues);
}

function getFileGallery(
  columnValues: MondayColumnValue[],
  galleryAssets?: MondayGalleryAsset[] | null,
): VolunteerFile[] {
  const profilePhotoUrl = getProfilePhotoUrl(columnValues);
  const passportFile = getApplicationPassportFile(columnValues);
  const passportPhotoUrl = passportFile?.url;

  const columnFiles = getAllFilesFromColumnValues(columnValues);

  const dedicatedItineraryCol = findColumn(columnValues, 'itineraryFiles');
  const dedicatedItineraryFiles = promoteItineraryFileNames(
    parseMondayFileColumn(dedicatedItineraryCol),
  );

  const generalFilesCol = findColumn(columnValues, 'files');
  const generalFiles =
    dedicatedItineraryFiles.length > 0
      ? parseMondayFileColumn(generalFilesCol)
      : promoteItineraryFileNames(parseMondayFileColumn(generalFilesCol));

  const itemGalleryFiles = promoteItineraryFileNames(
    excludeGalleryDuplicatesOfColumnFiles(
      mapMondayGalleryAssets(galleryAssets),
      columnFiles,
      [profilePhotoUrl, passportPhotoUrl].filter(
        (url): url is string => Boolean(url),
      ),
    ),
  );

  return mergeVolunteerGalleryFiles(
    [
      dedicatedItineraryFiles,
      parseMondayFileColumn(findColumn(columnValues, 'releaseForms')),
      generalFiles,
      itemGalleryFiles,
      parseMondayFileColumn(findColumn(columnValues, 'profilePhoto')),
    ],
    { profilePhotoUrl, passportPhotoUrl },
  );
}

function isStepComplete(value: string): boolean {
  const v = value.toLowerCase();
  return (
    v === 'done' ||
    v === 'complete' ||
    v === 'completed' ||
    v === 'yes' ||
    v === 'paid' ||
    v === 'received'
  );
}

function buildApplicationDemographics(
  columnValues: MondayColumnValue[],
): ContactDemographics | undefined {
  return resolveApplicationDemographics(columnValues);
}

export function mapItemToVolunteer(item: MondayBoardItem): Volunteer {
  const locationPreference =
    getColumnText(item.column_values, 'locationPreference') ||
    getColumnText(item.column_values, 'location') ||
    'Other';
  const location = getColumnText(item.column_values, 'location') || '—';
  const status =
    getColumnText(item.column_values, 'status') || '—';
  const timelineLabel = getColumnText(item.column_values, 'signupTimeline');
  const timelineId = resolveTimelineId(timelineLabel);
  const couplePreview = buildCouplePreview(item.name, item.column_values);
  const itinerary = parseItineraryFromColumns(item.column_values);
  const termRange = getArrivalDepartureTimelineRange(item.column_values);

  return {
    id: item.id,
    name: item.name,
    locationPreference,
    location,
    status,
    timelineId,
    preferredDates: timelineLabel || undefined,
    termStart:
      getColumnDateText(item.column_values, 'arrivalDate') ||
      termRange?.from ||
      undefined,
    termEnd:
      getColumnDateText(item.column_values, 'departureDate') ||
      termRange?.to ||
      undefined,
    pipelineStage: item.group?.title || undefined,
    profilePhotoUrl: getProfilePhotoUrl(item.column_values),
    couplePreview,
    itinerary,
  };
}

export function mapBoardToPipeline(board: MondayBoardPipeline): PipelineSection[] {
  const sections: PipelineSection[] = board.groups.map((group) => ({
    stage: group.title,
    volunteers: board.items
      .filter((item) => item.group?.title === group.title)
      .map(mapItemToVolunteer),
  }));

  const uncategorized = board.items.filter(
    (item) =>
      !item.group?.title ||
      !board.groups.some((g) => g.title === item.group?.title),
  );

  if (uncategorized.length > 0) {
    sections.push({
      stage: 'Uncategorized',
      volunteers: uncategorized.map(mapItemToVolunteer),
    });
  }

  return sections;
}

export function mapItemToVolunteerDetail(item: MondayItemDetail): VolunteerDetail {
  const base = mapItemToVolunteer(item);
  const housing = getColumnText(item.column_values, 'housing') || '—';
  const itinerary = parseItineraryFromColumns(item.column_values);
  const coordinator = getColumnText(item.column_values, 'coordinator') || '—';
  const stepFields: Array<{ key: keyof typeof columnMap; title: string }> = [
    { key: 'applicationSubmitted', title: 'Application Submitted' },
    { key: 'invoicePaid', title: 'Invoice Paid' },
    { key: 'pastorReference', title: 'Pastor Reference' },
    { key: 'addedToChatGroup', title: 'Added To Chat Group' },
    { key: 'sentToField', title: 'Sent To Field' },
  ];

  const quickbooksInvoiceId = getColumnText(
    item.column_values,
    'quickbooksInvoiceId',
  );

  const onboardingSteps = stepFields.map(({ key, title }) => {
    const value = getColumnText(item.column_values, key);
    const step: {
      title: string;
      status: string;
      quickbooksInvoiceId?: string;
    } = {
      title,
      status: value
        ? isStepComplete(value)
          ? 'Complete'
          : 'Pending'
        : 'Pending',
    };
    if (title === 'Invoice Paid' && quickbooksInvoiceId) {
      step.quickbooksInvoiceId = quickbooksInvoiceId;
    }
    return step;
  });

  const termNotes = parseTermNotes(item.id, item.updates, base.timelineId);

  const email = getColumnText(item.column_values, 'email') || '—';
  const emails = buildApplicationEmailsFromColumns(item.column_values);
  const phoneRaw = getColumnPhone(item.column_values, columnMap);
  const phone = phoneRaw || '—';
  const profilePhotoUrl = getProfilePhotoUrl(item.column_values);
  const passportFile = getApplicationPassportFile(item.column_values);
  const files = getFileGallery(item.column_values, item.assets);
  const demographics = buildApplicationDemographics(item.column_values);
  const couple = buildCoupleApplication(item.name, item.column_values);

  return {
    ...base,
    email,
    emails,
    phone,
    profilePhotoUrl,
    passportFile,
    files,
    demographics,
    couple,
    housing,
    itinerary,
    coordinator,
    termNotes,
    rawUpdates: item.updates,
    onboardingSteps,
    activityTimeline: [],
    itemCreatedAt: item.created_at || undefined,
    applicationFormFields: buildApplicationFormFields(item.column_values),
    pastorReferenceFormFields: buildPastorReferenceFormFields(
      item.column_values,
    ),
  };
}

