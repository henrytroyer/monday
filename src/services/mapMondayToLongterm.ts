import {
  LONGTERM_GROUP_TO_FIELD,
  LONGTERM_GROUP_TO_STATUS,
  LONGTERM_FIELD_GROUPS,
  LONGTERM_PIPELINE_GROUPS,
  longtermColumnMap,
  longtermRefereeSlotColumns,
} from '../config/longtermColumnMap';
import { resolveTimelineId } from '../config/timelineMap';
import type { ContactDemographics } from '../types/contact';
import type { LongtermFieldLocation } from '../constants/longtermFieldLocations';
import type { LongtermStatus } from '../constants/longtermApplicationStatuses';
import type { LongtermVolunteer } from '../types/longtermVolunteer';
import type {
  PipelineSection,
  VolunteerDetail,
  VolunteerFile,
} from '../types/volunteer';
import { buildApplicationEmails } from '../utils/applicationEmails';
import { parseFilloutAddress } from '../utils/formatContactAddress';
import { resolveProfilePhotoUrl, resolvePassportFile, parseMondayFileColumn, mergeVolunteerGalleryFiles } from './mondayFileColumns';
import { buildApplicationFormFields } from './applicationFormFields';
import { firstNameFromFullName } from './coupleApplication';
import {
  buildLongtermCoupleDisplayName,
  visibleLongtermVolunteers,
} from './mergeLongtermCouples';
import type { CoupleApplication } from '../types/volunteer';
import {
  type MondayBoardItem,
  type MondayBoardPipeline,
  type MondayColumnValue,
  type MondayItemDetail,
} from './mapMondayToCrm';

function normalizeTitle(title: string): string {
  return title.trim().toLowerCase();
}

function findColumnByTitle(
  columnValues: MondayColumnValue[],
  title: string,
): MondayColumnValue | undefined {
  const target = normalizeTitle(title);
  return columnValues.find(
    (c) => normalizeTitle(c.column?.title?.trim() || '') === target,
  );
}

function findColumnById(
  columnValues: MondayColumnValue[],
  columnId: string,
): MondayColumnValue | undefined {
  return columnValues.find((c) => c.id === columnId);
}

function getLtColumnText(
  columnValues: MondayColumnValue[],
  key: keyof typeof longtermColumnMap,
): string {
  const col = findColumnByTitle(columnValues, longtermColumnMap[key]);
  return col?.text?.trim() || '';
}

function getLtProfilePhotoUrl(
  columnValues: MondayColumnValue[],
): string | undefined {
  return resolveProfilePhotoUrl(
    findColumnByTitle(columnValues, longtermColumnMap.profilePhoto),
    findColumnByTitle(columnValues, longtermColumnMap.files),
  );
}

function getLtPassportFile(
  columnValues: MondayColumnValue[],
): VolunteerFile | undefined {
  return resolvePassportFile(findColumnByTitle(columnValues, longtermColumnMap.files));
}

function getLtFileGallery(columnValues: MondayColumnValue[]): VolunteerFile[] {
  const profilePhotoUrl = getLtProfilePhotoUrl(columnValues);
  const passportFile = getLtPassportFile(columnValues);
  return mergeVolunteerGalleryFiles(
    [
      parseMondayFileColumn(
        findColumnByTitle(columnValues, longtermColumnMap.files),
      ),
      parseMondayFileColumn(
        findColumnByTitle(columnValues, longtermColumnMap.profilePhoto),
      ),
      parseMondayFileColumn(
        findColumnByTitle(columnValues, longtermColumnMap.spousePassport),
      ),
    ],
    { profilePhotoUrl, passportPhotoUrl: passportFile?.url },
  );
}

function buildLongtermDemographics(
  columnValues: MondayColumnValue[],
): ContactDemographics | undefined {
  const dateOfBirth = getLtColumnText(columnValues, 'birthDate');
  const homeAddress = getLtColumnText(columnValues, 'homeAddress');
  const fromHome = homeAddress ? parseFilloutAddress(homeAddress) : undefined;

  if (!dateOfBirth && !fromHome?.address) return undefined;

  return {
    ...(dateOfBirth ? { dateOfBirth } : {}),
    ...(fromHome?.address ? { address: fromHome.address } : {}),
    ...(fromHome?.city ? { city: fromHome.city } : {}),
    ...(fromHome?.state ? { state: fromHome.state } : {}),
    ...(fromHome?.zip ? { zip: fromHome.zip } : {}),
    ...(fromHome?.country ? { country: fromHome.country } : {}),
  };
}

export function buildCoupleFromLongtermDetails(
  primary: VolunteerDetail,
  partner: VolunteerDetail,
): CoupleApplication {
  return {
    isCouple: true,
    displayName: buildLongtermCoupleDisplayName(primary.name, partner.name),
    primaryFirstName: firstNameFromFullName(primary.name),
    partner: {
      firstName: firstNameFromFullName(partner.name),
      name: partner.name,
      email: partner.email !== '—' ? partner.email : undefined,
      phone: partner.phone !== '—' ? partner.phone : undefined,
      dateOfBirth: partner.demographics?.dateOfBirth,
      profilePhotoUrl: partner.profilePhotoUrl,
      passportFile: partner.passportFile,
      childSafeguardingFile: partner.childSafeguardingFile,
    },
  };
}

function resolveGroupStatus(groupTitle: string): {
  status: string;
  fieldLocation?: LongtermFieldLocation;
  isOnField: boolean;
} {
  const pipelineStatus = LONGTERM_GROUP_TO_STATUS[groupTitle];
  if (pipelineStatus) {
    return { status: pipelineStatus, isOnField: false };
  }

  const fieldLocation = LONGTERM_GROUP_TO_FIELD[groupTitle] as
    | LongtermFieldLocation
    | undefined;
  if (fieldLocation) {
    return {
      status: 'on field',
      fieldLocation,
      isOnField: true,
    };
  }

  return { status: groupTitle, isOnField: false };
}

export function mapLongtermItemToVolunteer(item: MondayBoardItem): LongtermVolunteer {
  const groupTitle = item.group?.title || '';
  const { status, fieldLocation, isOnField } = resolveGroupStatus(groupTitle);
  const locationPreference =
    getLtColumnText(item.column_values, 'locationPreference') || 'Other';
  const assignedLocation =
    getLtColumnText(item.column_values, 'assignedLocation') || '—';
  const email = getLtColumnText(item.column_values, 'email') || undefined;

  return {
    id: item.id,
    name: item.name,
    locationPreference,
    location: assignedLocation,
    status,
    timelineId: resolveTimelineId('Long-term'),
    pipelineStage: groupTitle || undefined,
    profilePhotoUrl: getLtProfilePhotoUrl(item.column_values),
    onField: isOnField,
    fieldLocation,
    maritalStatus: getLtColumnText(item.column_values, 'maritalStatus') || undefined,
    homeAddress: getLtColumnText(item.column_values, 'homeAddress') || undefined,
    familyMembersText:
      getLtColumnText(item.column_values, 'familyMembers') || undefined,
    birthDate: getLtColumnText(item.column_values, 'birthDate') || undefined,
    email,
  };
}

export function mapLongtermItemToVolunteerDetail(
  item: MondayItemDetail,
): VolunteerDetail {
  const base = mapLongtermItemToVolunteer(item);
  const email = getLtColumnText(item.column_values, 'email') || '—';
  const phone = getLtColumnText(item.column_values, 'phone') || '—';
  const passportFile = getLtPassportFile(item.column_values);
  const files = getLtFileGallery(item.column_values);
  const demographics = buildLongtermDemographics(item.column_values);

  return {
    ...base,
    email,
    emails: buildApplicationEmails({ volunteerEmail: email }),
    phone,
    passportFile,
    files,
    demographics,
    housing: '—',
    itinerary: {
      arrival: { date: '', time: '', airport: '' },
      departure: { date: '', time: '', airport: '' },
    },
    coordinator: '—',
    termNotes: [],
    rawUpdates: item.updates,
    onboardingSteps: [],
    activityTimeline: [],
    itemCreatedAt: item.created_at || undefined,
    applicationFormFields: buildApplicationFormFields(item.column_values),
    pastorReferenceFormFields: [],
  };
}

export function mapLongtermBoardToVolunteers(
  board: MondayBoardPipeline,
): LongtermVolunteer[] {
  return board.items.map(mapLongtermItemToVolunteer);
}

export function mapLongtermBoardToPipelineSections(
  board: MondayBoardPipeline,
): { stage: string; volunteers: LongtermVolunteer[] }[] {
  const pipelineGroups = board.groups.filter((g) =>
    LONGTERM_PIPELINE_GROUPS.has(g.title),
  );
  const fieldGroups = board.groups.filter((g) =>
    LONGTERM_FIELD_GROUPS.has(g.title),
  );

  const sections: { stage: string; volunteers: LongtermVolunteer[] }[] = [];

  for (const group of pipelineGroups) {
    const status = LONGTERM_GROUP_TO_STATUS[group.title] ?? group.title;
    sections.push({
      stage: status,
      volunteers: board.items
        .filter((item) => item.group?.title === group.title)
        .map(mapLongtermItemToVolunteer),
    });
  }

  for (const group of fieldGroups) {
    const location = LONGTERM_GROUP_TO_FIELD[group.title] ?? group.title;
    sections.push({
      stage: location,
      volunteers: board.items
        .filter((item) => item.group?.title === group.title)
        .map(mapLongtermItemToVolunteer),
    });
  }

  return sections;
}

/** Read referee contact fields for a slot from application item columns. */
export function getRefereeContactFromApplication(
  columnValues: MondayColumnValue[],
  slotIndex: number,
): { name: string; email: string; phone: string; linkedItemId?: string } {
  const slot = longtermRefereeSlotColumns[slotIndex];
  if (!slot) return { name: '', email: '', phone: '' };

  const name =
    findColumnById(columnValues, slot.nameColumnId)?.text?.trim() ||
    findColumnByTitle(columnValues, slot.nameCol)?.text?.trim() ||
    '';
  const email =
    findColumnById(columnValues, slot.emailColumnId)?.text?.trim() ||
    '';
  const phone =
    findColumnById(columnValues, slot.phoneColumnId)?.text?.trim() ||
    '';

  let linkedItemId: string | undefined;
  if ('relationColumnId' in slot && slot.relationColumnId) {
    const relCol = findColumnById(columnValues, slot.relationColumnId);
    if (relCol?.linked_item_ids?.[0]) {
      linkedItemId = String(relCol.linked_item_ids[0]);
    } else if (relCol?.value) {
      try {
        const parsed = JSON.parse(relCol.value) as { linkedPulseIds?: number[] };
        if (parsed.linkedPulseIds?.[0]) {
          linkedItemId = String(parsed.linkedPulseIds[0]);
        }
      } catch {
        // ignore
      }
    }
  }

  return { name, email, phone, linkedItemId };
}

export function getApplicantEmailFromApplication(
  columnValues: MondayColumnValue[],
): string {
  return getLtColumnText(columnValues, 'email');
}

export function asPipelineSectionFromLongterm(
  section: { stage: string; volunteers: LongtermVolunteer[] },
): PipelineSection {
  return {
    stage: section.stage,
    volunteers: visibleLongtermVolunteers(section.volunteers) as PipelineSection['volunteers'],
  };
}

export type { LongtermStatus };
