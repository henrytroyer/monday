import { contactMap } from '../config/contactMap';
import type { ContactListItem, ContactTag } from '../types/contact';
import { CONTACT_TAG_LABELS } from '../types/contact';
import type { VolunteerFile } from '../types/volunteer';
import { inferVolunteerFileIsImage } from '../utils/inferVolunteerFileIsImage';
import { getColumnPhone } from '../utils/phoneFormat';
import type { MondayColumnValue } from './mapMondayToCrm';

export interface MondayContactItem {
  id: string;
  name: string;
  created_at?: string;
  column_values: MondayColumnValue[];
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

function mondayAssetProxyUrl(assetId: string): string | undefined {
  const base = import.meta.env.VITE_MONDAY_API_PROXY_URL?.trim().replace(/\/$/, '');
  if (!base) return undefined;
  return `${base}/assets/${assetId}`;
}

function parseAssetIdFromColumn(col: MondayColumnValue): string | undefined {
  if (!col.value) return undefined;
  try {
    const data = JSON.parse(col.value) as {
      files?: Array<{ assetId?: number | string }>;
    };
    const assetId = data.files?.[0]?.assetId;
    return assetId != null ? String(assetId) : undefined;
  } catch {
    return undefined;
  }
}

function assetIdFromProtectedUrl(text: string): string | undefined {
  const match = text.match(/\/resources\/(\d+)\//);
  return match?.[1];
}

function resolveColumnFileUrl(col: MondayColumnValue | undefined): string | undefined {
  if (!col) return undefined;

  const assetId =
    parseAssetIdFromColumn(col) ||
    (col.text?.trim().startsWith('http')
      ? assetIdFromProtectedUrl(col.text.trim())
      : undefined);

  if (assetId) {
    return mondayAssetProxyUrl(assetId);
  }

  const text = col.text?.trim();
  if (text?.startsWith('http')) {
    return text;
  }

  return undefined;
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
        const assetId =
          file.assetId != null ? String(file.assetId) : undefined;
        const url =
          (assetId ? mondayAssetProxyUrl(assetId) : undefined) ||
          (file.url as string | undefined) ||
          (file.public_url as string | undefined) ||
          (file.linkToFile as string | undefined) ||
          resolveColumnFileUrl(col);
        const isImage = inferVolunteerFileIsImage(
          url ?? '',
          name,
          file.isImage as boolean | string | undefined,
        );

        return {
          id: assetId ?? String(file.id ?? index),
          name,
          url,
          isImage,
        };
      });
    } catch {
      // fall through to text
    }
  }

  const directUrl = resolveColumnFileUrl(col);
  if (directUrl) {
    const name =
      col.text?.trim().split('/').pop()?.split('?')[0] || 'File';
    return [
      {
        id: parseAssetIdFromColumn(col) ?? 'text-0',
        name,
        url: directUrl,
        isImage: inferVolunteerFileIsImage(directUrl, name),
      },
    ];
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

export function getContactProfilePhotoUrl(
  columnValues: MondayColumnValue[],
): string | undefined {
  const profileCol = findColumn(columnValues, 'profilePhoto');
  const fromProfile =
    resolveColumnFileUrl(profileCol) ||
    parseMondayFiles(profileCol).find((file) => file.isImage && file.url)?.url;
  if (fromProfile) return fromProfile;

  const fromGallery = parseMondayFiles(findColumn(columnValues, 'files')).find(
    (file) => file.isImage && file.url,
  );
  return fromGallery?.url;
}

export function getContactPassportFile(
  columnValues: MondayColumnValue[],
): VolunteerFile | undefined {
  const passportCol = findPassportColumn(columnValues);
  const fromFiles = parseMondayFiles(passportCol).find((file) => file.url);
  if (fromFiles) {
    return {
      ...fromFiles,
      name: /passport/i.test(fromFiles.name)
        ? fromFiles.name
        : `Passport - ${fromFiles.name}`,
    };
  }

  const url = resolveColumnFileUrl(passportCol);
  if (!url) return undefined;

  const name =
    passportCol?.text?.trim().split('/').pop()?.split('?')[0] || 'Passport';
  return {
    id: parseAssetIdFromColumn(passportCol!) ?? 'passport',
    name: /passport/i.test(name) ? name : `Passport - ${name}`,
    url,
    isImage: inferVolunteerFileIsImage(url, name),
  };
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
  const passport = passportFile ? [passportFile] : [];
  const gallery = parseMondayFiles(findColumn(columnValues, 'files'));
  const profileFiles = parseMondayFiles(findColumn(columnValues, 'profilePhoto'));
  const profilePhotoUrl = getContactProfilePhotoUrl(columnValues);
  const passportPhotoUrl = getContactPassportUrl(columnValues);

  const merged = [...passport, ...gallery, ...profileFiles];
  const seen = new Set<string>();

  return merged.filter((file) => {
    if (
      profilePhotoUrl &&
      file.isImage &&
      file.url === profilePhotoUrl
    ) {
      return false;
    }
    if (passportPhotoUrl && file.url === passportPhotoUrl) {
      return false;
    }
    const key = `${file.id}-${file.name}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
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

export function parseLinkedApplicationIds(
  columnValues: MondayColumnValue[],
): string[] {
  const col = findColumn(columnValues, 'applicationsLink');
  if (!col?.value) return [];

  try {
    const parsed = JSON.parse(col.value) as {
      linkedPulseIds?: number[];
      linked_item_ids?: string[];
    };
    if (parsed.linkedPulseIds?.length) {
      return parsed.linkedPulseIds.map(String);
    }
    if (parsed.linked_item_ids?.length) {
      return parsed.linked_item_ids.map(String);
    }
  } catch {
    // fall through
  }

  return [];
}
