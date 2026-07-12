import { columnMap } from '../config/columnMap';
import type { ApplicationPartner, CoupleApplication, CouplePreview } from '../types/volunteer';
import type { VolunteerFile } from '../types/volunteer';
import {
  parseMondayFileColumn,
  resolveColumnFileUrl,
  resolvePassportFile,
} from './mondayFileColumns';
import type { MondayColumnValue } from './mapMondayToCrm';

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

function getColumnText(
  columnValues: MondayColumnValue[],
  fieldKey: keyof typeof columnMap,
): string {
  return findColumn(columnValues, fieldKey)?.text?.trim() || '';
}

function getSpouseProfilePhotoUrl(
  columnValues: MondayColumnValue[],
): string | undefined {
  const spouseCol = findColumn(columnValues, 'spouseProfilePhoto');
  return (
    resolveColumnFileUrl(spouseCol) ||
    parseMondayFileColumn(spouseCol).find((file) => file.isImage && file.url)
      ?.url
  );
}

function getSpousePassportFile(
  columnValues: MondayColumnValue[],
): VolunteerFile | undefined {
  return resolvePassportFile(findColumn(columnValues, 'spousePassport'));
}

export function firstNameFromFullName(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return '';
  return trimmed.split(/\s+/)[0] ?? trimmed;
}

function isMarriedApplication(columnValues: MondayColumnValue[]): boolean {
  const maritalStatus = getColumnText(columnValues, 'maritalStatus').toLowerCase();
  const spouseName = getColumnText(columnValues, 'spouseName');
  return maritalStatus === 'married' || spouseName.length > 0;
}

export function buildCoupleApplication(
  itemName: string,
  columnValues: MondayColumnValue[],
): CoupleApplication | undefined {
  if (!isMarriedApplication(columnValues)) return undefined;

  const spouseName = getColumnText(columnValues, 'spouseName');
  if (!spouseName) return undefined;

  const primaryFirstName =
    getColumnText(columnValues, 'primaryFirstName') ||
    firstNameFromFullName(itemName.split('&')[0] ?? itemName);

  const partner: ApplicationPartner = {
    firstName: firstNameFromFullName(spouseName),
    name: spouseName,
    email: getColumnText(columnValues, 'spouseEmail') || undefined,
    phone: getColumnText(columnValues, 'spousePhone') || undefined,
    dateOfBirth: getColumnText(columnValues, 'spouseBirthday') || undefined,
    gender: getColumnText(columnValues, 'spouseGender') || undefined,
    profilePhotoUrl: getSpouseProfilePhotoUrl(columnValues),
    passportFile: getSpousePassportFile(columnValues),
  };

  return {
    isCouple: true,
    displayName: itemName,
    primaryFirstName: primaryFirstName || undefined,
    partner,
  };
}

export function buildCouplePreview(
  itemName: string,
  columnValues: MondayColumnValue[],
): CouplePreview | undefined {
  const couple = buildCoupleApplication(itemName, columnValues);
  if (!couple) return undefined;

  const primaryEmail = getColumnText(columnValues, 'email') || undefined;

  return {
    displayName: couple.displayName,
    primaryFirstName: couple.primaryFirstName,
    primaryEmail: primaryEmail && primaryEmail !== '—' ? primaryEmail : undefined,
    partnerName: couple.partner.name,
    partnerFirstName: couple.partner.firstName,
    partnerEmail: couple.partner.email,
    partnerPhotoUrl: couple.partner.profilePhotoUrl,
  };
}
