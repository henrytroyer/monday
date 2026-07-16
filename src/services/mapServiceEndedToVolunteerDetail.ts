import type { VolunteerDetail, VolunteerFile } from '../types/volunteer';
import { buildApplicationEmails } from '../utils/applicationEmails';
import { formatPhoneDisplay } from '../utils/phoneFormat';
import {
  buildServiceEndedApplicationFormFields,
  buildServiceEndedPastorReferenceFormFields,
} from './applicationFormFields';
import {
  findServiceEndedColumn,
  getServiceEndedColumnText,
  mapServiceEndedItemToTerm,
  parseServiceEndedTermRange,
} from './mapServiceEndedToTerm';
import type { MondayItemDetail } from './mapMondayToCrm';
import {
  mergeVolunteerGalleryFiles,
  parseMondayFileColumn,
  resolvePassportFile,
  resolveProfilePhotoUrl,
} from './mondayFileColumns';
import { parseTermNotes } from './termNotes';

function getServiceEndedProfilePhotoUrl(
  columnValues: MondayItemDetail['column_values'],
): string | undefined {
  return resolveProfilePhotoUrl(
    findServiceEndedColumn(columnValues, 'profilePhoto'),
    undefined,
  );
}

function getServiceEndedPassportFile(
  columnValues: MondayItemDetail['column_values'],
): VolunteerFile | undefined {
  return resolvePassportFile(
    findServiceEndedColumn(columnValues, 'passport'),
    findServiceEndedColumn(columnValues, 'passportNew'),
  );
}

function getServiceEndedFilesFromColumns(
  columnValues: MondayItemDetail['column_values'],
): VolunteerFile[] {
  const profilePhotoUrl = getServiceEndedProfilePhotoUrl(columnValues);
  const passportFile = getServiceEndedPassportFile(columnValues);
  const passportPhotoUrl = passportFile?.url;

  return mergeVolunteerGalleryFiles(
    [
      passportFile ? [passportFile] : [],
      parseMondayFileColumn(findServiceEndedColumn(columnValues, 'releaseForms')),
      parseMondayFileColumn(findServiceEndedColumn(columnValues, 'profilePhoto')),
      parseMondayFileColumn(findServiceEndedColumn(columnValues, 'passportNew')),
      parseMondayFileColumn(findServiceEndedColumn(columnValues, 'passport')),
    ],
    { profilePhotoUrl, passportPhotoUrl },
  );
}

function getServiceEndedPhone(
  columnValues: MondayItemDetail['column_values'],
): string {
  const col = findServiceEndedColumn(columnValues, 'phone');
  if (!col?.text?.trim()) return '—';
  return formatPhoneDisplay(col.text) || col.text.trim();
}

export function mapServiceEndedItemToVolunteerDetail(
  item: MondayItemDetail,
): VolunteerDetail {
  const term = mapServiceEndedItemToTerm(item);
  const timelineLabel = term.timelineLabel;
  const email =
    getServiceEndedColumnText(item.column_values, 'email') || '—';
  const phone = getServiceEndedPhone(item.column_values);
  const profilePhotoUrl = getServiceEndedProfilePhotoUrl(item.column_values);
  const passportFile = getServiceEndedPassportFile(item.column_values);
  const files = getServiceEndedFilesFromColumns(item.column_values);
  const termNotes = parseTermNotes(item.id, item.updates, term.timelineId);
  const { termStart, termEnd } = parseServiceEndedTermRange(item.column_values);

  return {
    id: item.id,
    name: item.name,
    locationPreference: term.locationPreference ?? 'Other',
    location: getServiceEndedColumnText(item.column_values, 'location') || '—',
    status: term.status ?? '—',
    timelineId: term.timelineId,
    preferredDates: timelineLabel !== '—' ? timelineLabel : undefined,
    termStart,
    termEnd,
    pipelineStage: term.pipelineStage,
    profilePhotoUrl,
    email,
    emails: buildApplicationEmails({
      volunteerEmail: email,
      parentEmail:
        getServiceEndedColumnText(item.column_values, 'parentEmail') || undefined,
      pastorEmail:
        getServiceEndedColumnText(item.column_values, 'pastorEmail') || undefined,
    }),
    phone,
    passportFile,
    files,
    housing: '—',
    itinerary: {
      arrival: termStart
        ? { date: termStart, time: '—', airport: '—' }
        : { date: '—', time: '—', airport: '—' },
      departure: termEnd
        ? { date: termEnd, time: '—', airport: '—' }
        : { date: '—', time: '—', airport: '—' },
    },
    coordinator: '—',
    termNotes,
    rawUpdates: item.updates,
    onboardingSteps: [],
    activityTimeline: [],
    itemCreatedAt: item.created_at || undefined,
    applicationFormFields: buildServiceEndedApplicationFormFields(
      item.column_values,
    ),
    pastorReferenceFormFields: buildServiceEndedPastorReferenceFormFields(
      item.column_values,
    ),
  };
}
