import { contactMap } from '../config/contactMap';
import type { ContactListItem, ContactPastorReference, ContactTag } from '../types/contact';
import { CONTACT_TAG_LABELS } from '../types/contact';
import type { VolunteerFile } from '../types/volunteer';
import {
  mergeVolunteerGalleryFiles,
  parseLinkedBoardRelationIds,
  parseMondayFileColumn,
  resolvePassportFile,
  resolveProfilePhotoUrl,
} from './mondayFileColumns';
import { getColumnPhone } from '../utils/phoneFormat';
import type { MondayColumnValue } from './mapMondayToCrm';
import {
  contactTagsUseSimpleColumnValue,
  formatContactTagsColumnValue,
  formatContactTagsSimpleValue,
  resolveContactTagsWriteColumn as resolveContactTagsWriteColumnCore,
  statusColumnAllowsMultipleLabels,
  type ContactBoardColumn,
} from './contactTagColumnWrite';

export type { ContactBoardColumn };
export {
  contactTagsUseSimpleColumnValue,
  formatContactTagsColumnValue,
  formatContactTagsSimpleValue,
  statusColumnAllowsMultipleLabels,
};

export function resolveContactTagsWriteColumn(
  columns: ContactBoardColumn[],
): ContactBoardColumn | undefined {
  return resolveContactTagsWriteColumnCore(columns, {
    tagsColumnTitle: contactMap.tags,
    typeColumnTitle: contactMap.type,
    explicitTagsColumnEnv: import.meta.env.VITE_CONTACT_COL_TAGS,
  });
}

export interface MondayContactItem {
  id: string;
  name: string;
  created_at?: string;
  column_values: MondayColumnValue[];
  updates?: import('./termNotes').MondayItemUpdateRaw[];
}

function normalizeTitle(title: string): string {
  return title.trim().toLowerCase();
}

function columnTitle(col: MondayColumnValue): string {
  return col.column?.title?.trim() || '';
}

function findColumn(
  columnValues: MondayColumnValue[],
  fieldKey: keyof typeof contactMap,
): MondayColumnValue | undefined {
  const pastorLinkColumnId = import.meta.env
    .VITE_CONTACT_COL_PASTOR_REFERENCE_LINK_ID as string | undefined;
  if (fieldKey === 'pastorReferenceLink' && pastorLinkColumnId?.trim()) {
    const byId = columnValues.find((col) => col.id === pastorLinkColumnId.trim());
    if (byId) return byId;
  }

  const donationsLinkColumnId = import.meta.env
    .VITE_CONTACT_COL_DONATIONS_LINK_ID as string | undefined;
  if (fieldKey === 'donationsLink' && donationsLinkColumnId?.trim()) {
    const byId = columnValues.find((col) => col.id === donationsLinkColumnId.trim());
    if (byId) return byId;
  }

  const target = normalizeTitle(contactMap[fieldKey]);
  return columnValues.find(
    (c) => normalizeTitle(columnTitle(c)) === target,
  );
}

function isPassportFileColumnTitle(title: string): boolean {
  const normalized = normalizeTitle(title);
  if (normalized.includes('passport number')) return false;
  if (normalized.includes('expiration')) return false;
  return normalized === 'passport photo' || normalized === 'passport';
}

function findPassportColumn(
  columnValues: MondayColumnValue[],
): MondayColumnValue | undefined {
  const mapped = findColumn(columnValues, 'passport');
  if (mapped) return mapped;
  return columnValues.find((col) =>
    isPassportFileColumnTitle(columnTitle(col)),
  );
}

function getColumnText(
  columnValues: MondayColumnValue[],
  fieldKey: keyof typeof contactMap,
): string {
  return findColumn(columnValues, fieldKey)?.text?.trim() || '';
}

export function getContactProfilePhotoUrl(
  columnValues: MondayColumnValue[],
): string | undefined {
  return resolveProfilePhotoUrl(
    findColumn(columnValues, 'profilePhoto'),
    findColumn(columnValues, 'files'),
  );
}

export function getContactPassportFile(
  columnValues: MondayColumnValue[],
): VolunteerFile | undefined {
  return resolvePassportFile(findPassportColumn(columnValues));
}

export function getContactPassportUrl(
  columnValues: MondayColumnValue[],
): string | undefined {
  return getContactPassportFile(columnValues)?.url;
}

export function getContactFilesFromColumns(
  columnValues: MondayColumnValue[],
): VolunteerFile[] {
  const passportFile = getContactPassportFile(columnValues);
  const profilePhotoUrl = getContactProfilePhotoUrl(columnValues);
  const passportPhotoUrl = getContactPassportUrl(columnValues);

  return mergeVolunteerGalleryFiles(
    [
      passportFile ? [passportFile] : [],
      parseMondayFileColumn(findColumn(columnValues, 'files')),
      parseMondayFileColumn(findColumn(columnValues, 'profilePhoto')),
    ],
    { profilePhotoUrl, passportPhotoUrl },
  );
}

const TAG_LABEL_TO_ID: Record<string, ContactTag> = {
  volunteer: 'volunteer',
  pastor: 'pastor',
  parent: 'parent',
  donor: 'donor',
  recruitment: 'recruitment',
};

function parseTagLabel(label: string): ContactTag | null {
  const key = label.trim().toLowerCase();
  return TAG_LABEL_TO_ID[key] ?? null;
}

export function parseContactTags(columnValues: MondayColumnValue[]): ContactTag[] {
  const tagsCol = findColumn(columnValues, 'tags');
  const typeCol = findColumn(columnValues, 'type');
  const tags = new Set<ContactTag>();

  const parseValue = (col: MondayColumnValue | undefined) => {
    if (!col) return;
    if (col.text?.trim()) {
      col.text.split(/[,;]/).forEach((part) => {
        const tag = parseTagLabel(part);
        if (tag) tags.add(tag);
      });
    }
    if (col.value) {
      try {
        const parsed = JSON.parse(col.value) as {
          labels?: Array<{ text?: string } | string>;
          label?: string;
        };
        if (parsed.label) {
          const tag = parseTagLabel(parsed.label);
          if (tag) tags.add(tag);
        }
        if (Array.isArray(parsed.labels)) {
          parsed.labels.forEach((entry) => {
            const text =
              typeof entry === 'string' ? entry : entry?.text ?? '';
            const tag = parseTagLabel(text);
            if (tag) tags.add(tag);
          });
        }
      } catch {
        // ignore
      }
    }
  };

  parseValue(tagsCol);
  parseValue(typeCol);

  return [...tags];
}

export function formatContactTagsForMonday(tags: ContactTag[]): string {
  const labels = tags.map((t) => CONTACT_TAG_LABELS[t]);
  return JSON.stringify({ labels });
}

export function mapItemToContactListItem(item: MondayContactItem): ContactListItem {
  const email = getColumnText(item.column_values, 'email') || '—';
  const phoneRaw = getColumnPhone(item.column_values, contactMap);
  const phone = phoneRaw || undefined;
  const profilePhotoUrl = getContactProfilePhotoUrl(item.column_values);

  return {
    id: item.id,
    name: item.name,
    email,
    phone,
    profilePhotoUrl,
    createdAt: item.created_at ?? undefined,
    tags: parseContactTags(item.column_values),
  };
}

export function getContactColumnText(
  columnValues: MondayColumnValue[],
  fieldKey: keyof typeof contactMap,
): string {
  return getColumnText(columnValues, fieldKey);
}

export function mapContactPastorReference(
  columnValues: MondayColumnValue[],
): ContactPastorReference | undefined {
  const name = getContactColumnText(columnValues, 'pastorName') || undefined;
  const email = getContactColumnText(columnValues, 'pastorEmail') || undefined;
  const phone =
    getColumnPhone(columnValues, { phone: contactMap.pastorPhone }) || undefined;
  const church = getContactColumnText(columnValues, 'churchName') || undefined;
  const linkedItemIds = parseLinkedPastorReferenceItemIds(columnValues);

  if (!name && !email && !phone && !church && linkedItemIds.length === 0) {
    return undefined;
  }

  return {
    ...(name ? { name } : {}),
    ...(email ? { email } : {}),
    ...(phone ? { phone } : {}),
    ...(church ? { church } : {}),
    ...(linkedItemIds.length > 0 ? { linkedItemIds } : {}),
  };
}

export function parseLinkedPastorReferenceItemIds(
  columnValues: MondayColumnValue[],
): string[] {
  const col = findColumn(columnValues, 'pastorReferenceLink');
  return parseLinkedBoardRelationIds(col);
}

/** @deprecated Use parseLinkedPastorReferenceItemIds */
export function parseLinkedPastorReferenceItemId(
  columnValues: MondayColumnValue[],
): string | undefined {
  return parseLinkedPastorReferenceItemIds(columnValues)[0];
}

export function parseLinkedApplicationIds(
  columnValues: MondayColumnValue[],
): string[] {
  const col = findColumn(columnValues, 'applicationsLink');
  return parseLinkedBoardRelationIds(col);
}

export function parseLinkedDonationItemIds(
  columnValues: MondayColumnValue[],
): string[] {
  const col = findColumn(columnValues, 'donationsLink');
  return parseLinkedBoardRelationIds(col);
}
