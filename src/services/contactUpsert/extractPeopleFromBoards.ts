/**
 * extractPeopleFromBoards.ts — Pull person payloads from ST / LT / CSE / Donation items.
 */

import { columnMap } from '../../config/columnMap';
import { longtermColumnMap, longtermRefereeSlotColumns } from '../../config/longtermColumnMap';
import type { ContactListDemographics, ContactTag } from '../../types/contact';
import { resolveApplicationDemographics } from '../../utils/applicationDemographics';
import { parseFilloutAddress } from '../../utils/formatContactAddress';
import { volunteerNameFromItemTitle } from '../../utils/personNameMatch';
import {
  getColumnText,
  type MondayBoardItem,
  type MondayColumnValue,
} from '../mapMondayToCrm';
import { getDonationColumnText } from '../mapMondayToDonation';
import { getServiceEndedColumnText } from '../mapServiceEndedToTerm';
import { parseAssetIdFromColumn } from '../mondayFileColumns';
import type { ContactFileSlot } from './syncContactFiles';

export interface ExtractedPerson {
  role: 'volunteer' | 'parent' | 'pastor' | 'spouse' | 'donor';
  name: string;
  email?: string;
  phone?: string;
  tags: ContactTag[];
  demographics?: ContactListDemographics;
  church?: string;
  /** File assets to sync onto this person's contact. */
  files?: Array<{ slot: ContactFileSlot; assetId: string; fileName?: string }>;
}

export interface ExtractedApplicationBundle {
  sourceItemId: string;
  sourceLabel: string;
  volunteer: ExtractedPerson;
  parents?: ExtractedPerson;
  pastor?: ExtractedPerson;
  newPastor?: ExtractedPerson;
  spouse?: ExtractedPerson;
  emergency?: { name?: string; phone?: string };
}

function findByTitle(
  columnValues: MondayColumnValue[],
  title: string,
): MondayColumnValue | undefined {
  const target = title.trim().toLowerCase();
  return columnValues.find(
    (col) => (col.column?.title?.trim() || '').toLowerCase() === target,
  );
}

function textByTitle(
  columnValues: MondayColumnValue[],
  title: string,
): string {
  return findByTitle(columnValues, title)?.text?.trim() || '';
}

function fileAsset(
  columnValues: MondayColumnValue[],
  title: string,
  slot: ContactFileSlot,
): { slot: ContactFileSlot; assetId: string; fileName?: string } | undefined {
  const col = findByTitle(columnValues, title);
  if (!col) return undefined;
  const assetId = parseAssetIdFromColumn(col);
  if (!assetId) return undefined;
  return {
    slot,
    assetId,
    fileName: col.text?.trim() || undefined,
  };
}

export function extractShortTermBundle(
  item: MondayBoardItem,
): ExtractedApplicationBundle {
  const columnValues = item.column_values;
  const volunteerName =
    volunteerNameFromItemTitle(item.name ?? '') || item.name || 'Volunteer';
  const demographics = resolveApplicationDemographics(columnValues);
  const files = [
    fileAsset(columnValues, columnMap.profilePhoto, 'profilePhoto'),
    fileAsset(columnValues, columnMap.passport, 'passport'),
    fileAsset(columnValues, columnMap.passportNew, 'passport'),
  ].filter(Boolean) as ExtractedPerson['files'];

  const bundle: ExtractedApplicationBundle = {
    sourceItemId: item.id,
    sourceLabel: 'short-term-application',
    volunteer: {
      role: 'volunteer',
      name: volunteerName,
      email: getColumnText(columnValues, 'email') || undefined,
      phone: getColumnText(columnValues, 'phone') || undefined,
      tags: ['volunteer'],
      demographics: demographics
        ? {
            address: demographics.address,
            city: demographics.city,
            state: demographics.state,
            zip: demographics.zip,
            country: demographics.country,
          }
        : undefined,
      files,
    },
  };

  const parentName = textByTitle(columnValues, 'Parents Names');
  const parentEmail = getColumnText(columnValues, 'parentEmail');
  const parentPhone = textByTitle(columnValues, "Parent's Phone Number");
  if (parentName || parentEmail) {
    bundle.parents = {
      role: 'parent',
      name: parentName || `Parent of ${volunteerName}`,
      email: parentEmail || undefined,
      phone: parentPhone || undefined,
      tags: ['parent'],
    };
  }

  const pastorName = textByTitle(columnValues, "Pastor's Full Name");
  const pastorEmail = getColumnText(columnValues, 'pastorEmail');
  const pastorPhone = textByTitle(columnValues, "Pastor's Phone");
  const church = textByTitle(columnValues, 'Church Name');
  if (pastorName || pastorEmail) {
    bundle.pastor = {
      role: 'pastor',
      name: pastorName || `Pastor for ${volunteerName}`,
      email: pastorEmail || undefined,
      phone: pastorPhone || undefined,
      tags: ['pastor'],
      church: church || undefined,
    };
  }

  const newPastorName = textByTitle(columnValues, "New Pastor's Name");
  const newPastorEmail = textByTitle(columnValues, "New Pastor's Email");
  const newPastorPhone = textByTitle(columnValues, "New Pastor's Phone");
  if (newPastorName || newPastorEmail) {
    bundle.newPastor = {
      role: 'pastor',
      name: newPastorName || `New pastor for ${volunteerName}`,
      email: newPastorEmail || undefined,
      phone: newPastorPhone || undefined,
      tags: ['pastor'],
      church: church || undefined,
    };
  }

  const spouseName = getColumnText(columnValues, 'spouseName');
  if (spouseName) {
    const spouseFiles = [
      fileAsset(
        columnValues,
        columnMap.spouseProfilePhoto,
        'spouseProfilePhoto',
      ),
      fileAsset(columnValues, columnMap.spousePassport, 'spousePassport'),
    ].filter(Boolean) as ExtractedPerson['files'];
    bundle.spouse = {
      role: 'spouse',
      name: spouseName,
      email: getColumnText(columnValues, 'spouseEmail') || undefined,
      phone: getColumnText(columnValues, 'spousePhone') || undefined,
      tags: ['volunteer'],
      files: spouseFiles,
    };
  }

  const emergencyName = textByTitle(
    columnValues,
    'Full Name of Emergency Contact',
  );
  const emergencyPhone = textByTitle(
    columnValues,
    'Emergency Contact Phone Number',
  );
  if (emergencyName || emergencyPhone) {
    bundle.emergency = {
      name: emergencyName || undefined,
      phone: emergencyPhone || undefined,
    };
  }

  return bundle;
}

export function extractLongtermBundle(
  item: MondayBoardItem,
): ExtractedApplicationBundle {
  const columnValues = item.column_values;
  const volunteerName =
    volunteerNameFromItemTitle(item.name ?? '') || item.name || 'Volunteer';

  const email =
    findByTitle(columnValues, longtermColumnMap.email)?.text?.trim() || '';
  const phone =
    findByTitle(columnValues, longtermColumnMap.phone)?.text?.trim() || '';
  const homeAddress =
    findByTitle(columnValues, longtermColumnMap.homeAddress)?.text?.trim() ||
    '';
  const fromHome = homeAddress
    ? homeAddress.includes('\n')
      ? parseFilloutAddress(homeAddress)
      : { address: homeAddress }
    : undefined;

  const files = [
    fileAsset(columnValues, longtermColumnMap.profilePhoto, 'profilePhoto'),
    fileAsset(columnValues, longtermColumnMap.files, 'passport'),
  ].filter(Boolean) as ExtractedPerson['files'];

  const pastorSlot = longtermRefereeSlotColumns.find((s) => s.label === 'Pastor');
  const parentSlot = longtermRefereeSlotColumns.find((s) => s.label === 'Parent');

  const pastorName = pastorSlot
    ? textByTitle(columnValues, pastorSlot.nameCol)
    : '';
  const pastorEmail = pastorSlot
    ? columnValues.find((c) => c.id === pastorSlot.emailColumnId)?.text?.trim() ||
      textByTitle(columnValues, pastorSlot.emailCol)
    : '';
  const pastorPhone = pastorSlot
    ? columnValues.find((c) => c.id === pastorSlot.phoneColumnId)?.text?.trim() ||
      textByTitle(columnValues, pastorSlot.phoneCol)
    : '';

  const parentName = parentSlot
    ? textByTitle(columnValues, parentSlot.nameCol)
    : '';
  const parentEmail = parentSlot
    ? columnValues.find((c) => c.id === parentSlot.emailColumnId)?.text?.trim() ||
      textByTitle(columnValues, parentSlot.emailCol)
    : '';
  const parentPhone = parentSlot
    ? columnValues.find((c) => c.id === parentSlot.phoneColumnId)?.text?.trim() ||
      textByTitle(columnValues, parentSlot.phoneCol)
    : '';

  const bundle: ExtractedApplicationBundle = {
    sourceItemId: item.id,
    sourceLabel: 'long-term-application',
    volunteer: {
      role: 'volunteer',
      name: volunteerName,
      email: email || undefined,
      phone: phone || undefined,
      tags: ['volunteer'],
      demographics: fromHome
        ? {
            address: fromHome.address,
            city: fromHome.city,
            state: fromHome.state,
            zip: fromHome.zip,
            country: fromHome.country,
          }
        : undefined,
      files,
    },
  };

  if (parentName || parentEmail) {
    bundle.parents = {
      role: 'parent',
      name: parentName || `Parent of ${volunteerName}`,
      email: parentEmail || undefined,
      phone: parentPhone || undefined,
      tags: ['parent'],
    };
  }

  if (pastorName || pastorEmail) {
    bundle.pastor = {
      role: 'pastor',
      name: pastorName || `Pastor for ${volunteerName}`,
      email: pastorEmail || undefined,
      phone: pastorPhone || undefined,
      tags: ['pastor'],
    };
  }

  return bundle;
}

export function extractServiceEndedBundle(
  item: MondayBoardItem,
): ExtractedApplicationBundle {
  // CSE shares many titles with ST — reuse ST extractor with CSE-specific email/phone.
  const base = extractShortTermBundle(item);
  const email = getServiceEndedColumnText(item.column_values, 'email');
  const phone = getServiceEndedColumnText(item.column_values, 'phone');
  if (email) base.volunteer.email = email;
  if (phone) base.volunteer.phone = phone;
  base.sourceLabel = 'service-ended';
  return base;
}

export function extractDonorPerson(item: MondayBoardItem): ExtractedPerson {
  const email = getDonationColumnText(item.column_values, 'donorEmail');
  const donorName =
    getDonationColumnText(item.column_values, 'donorName') ||
    item.name ||
    'Donor';
  const phone = textByTitle(item.column_values, 'Phone text');
  const address = textByTitle(item.column_values, 'Address');
  const city = textByTitle(item.column_values, 'City');

  return {
    role: 'donor',
    name: donorName,
    email: email || undefined,
    phone: phone || undefined,
    tags: ['donor'],
    demographics:
      address || city
        ? { address: address || undefined, city: city || undefined }
        : undefined,
  };
}
