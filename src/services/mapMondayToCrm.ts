import { columnMap } from '../config/columnMap';
import { resolveTimelineId } from '../config/timelineMap';
import { buildApplicationEmailsFromColumns } from '../utils/applicationEmails';
import { getColumnPhone } from '../utils/phoneFormat';
import {
  buildApplicationFormFields,
  buildPastorReferenceFormFields,
} from './applicationFormFields';
import { parseItineraryFromColumns } from './itinerary';
import {
  isTermNoteUpdate,
  parseTermNotes,
  stripHtml,
  type MondayItemUpdateRaw,
} from './termNotes';
import type {
  PipelineSection,
  Volunteer,
  VolunteerDetail,
  VolunteerFile,
} from '../types/volunteer';

export interface MondayColumnValue {
  id: string;
  text: string | null;
  value: string | null;
  type: string;
  column?: { title: string } | null;
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

function parseMondayFiles(col: MondayColumnValue | undefined): VolunteerFile[] {
  if (!col) return [];

  if (col.value) {
    try {
      const data = JSON.parse(col.value) as {
        files?: Array<Record<string, unknown>>;
      };
      const files = data.files ?? [];
      return files.map((file, index) => {
        const name = String(file.name ?? 'File');
        const url =
          (file.url as string | undefined) ||
          (file.public_url as string | undefined) ||
          (file.linkToFile as string | undefined);
        const isImage =
          file.isImage === 'true' ||
          file.isImage === true ||
          /\.(png|jpe?g|gif|webp|svg)$/i.test(name);

        return {
          id: String(file.assetId ?? file.id ?? index),
          name,
          url,
          isImage,
        };
      });
    } catch {
      // fall through to text
    }
  }

  if (col.text?.trim()) {
    return col.text.split(',').map((part, index) => {
      const name = part.trim();
      return {
        id: `text-${index}`,
        name,
        isImage: /\.(png|jpe?g|gif|webp|svg)$/i.test(name),
      };
    });
  }

  return [];
}

function getProfilePhotoUrl(
  columnValues: MondayColumnValue[],
): string | undefined {
  const fromProfile = parseMondayFiles(
    findColumn(columnValues, 'profilePhoto'),
  ).find((f) => f.isImage && f.url);
  if (fromProfile?.url) return fromProfile.url;

  const fromGallery = parseMondayFiles(findColumn(columnValues, 'files')).find(
    (f) => f.isImage && f.url,
  );
  return fromGallery?.url;
}

export function getApplicationFilesFromColumns(
  columnValues: MondayColumnValue[],
): VolunteerFile[] {
  return getFileGallery(columnValues);
}

function getFileGallery(
  columnValues: MondayColumnValue[],
): VolunteerFile[] {
  const gallery = parseMondayFiles(findColumn(columnValues, 'files'));
  const itineraryFiles = parseMondayFiles(
    findColumn(columnValues, 'itineraryFiles'),
  );
  const profileFiles = parseMondayFiles(
    findColumn(columnValues, 'profilePhoto'),
  );

  const profilePhotoUrl = getProfilePhotoUrl(columnValues);
  const merged = [...itineraryFiles, ...profileFiles, ...gallery];
  const seen = new Set<string>();
  return merged.filter((file) => {
    if (
      profilePhotoUrl &&
      file.isImage &&
      file.url === profilePhotoUrl
    ) {
      return false;
    }
    const key = `${file.id}-${file.name}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
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

  return {
    id: item.id,
    name: item.name,
    locationPreference,
    location,
    status,
    timelineId,
    profilePhotoUrl: getProfilePhotoUrl(item.column_values),
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

  const activityTimeline =
    item.updates
      ?.filter((update) => !isTermNoteUpdate(update.text_body || ''))
      .map((update) => ({
        date: formatUpdateDate(update.created_at),
        text: stripHtml(update.text_body || '').trim() || 'Update',
      })) ?? [];

  if (activityTimeline.length === 0 && item.created_at) {
    activityTimeline.push({
      date: formatUpdateDate(item.created_at),
      text: 'Application created',
    });
  }

  const email = getColumnText(item.column_values, 'email') || '—';
  const emails = buildApplicationEmailsFromColumns(item.column_values);
  const phoneRaw = getColumnPhone(item.column_values, columnMap);
  const phone = phoneRaw || '—';
  const profilePhotoUrl = getProfilePhotoUrl(item.column_values);
  const files = getFileGallery(item.column_values);

  return {
    ...base,
    email,
    emails,
    phone,
    profilePhotoUrl,
    files,
    housing,
    itinerary,
    coordinator,
    termNotes,
    onboardingSteps,
    activityTimeline,
    applicationFormFields: buildApplicationFormFields(item.column_values),
    pastorReferenceFormFields: buildPastorReferenceFormFields(
      item.column_values,
    ),
  };
}

function formatUpdateDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return iso;
  }
}

