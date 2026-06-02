import { contactMap } from '../config/contactMap';
import type { ContactListItem, ContactTag } from '../types/contact';
import { CONTACT_TAG_LABELS } from '../types/contact';
import type { MondayColumnValue } from './mapMondayToCrm';

export interface MondayContactItem {
  id: string;
  name: string;
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

function getColumnText(
  columnValues: MondayColumnValue[],
  fieldKey: keyof typeof contactMap,
): string {
  return findColumn(columnValues, fieldKey)?.text?.trim() || '';
}

function parseProfilePhotoUrl(col: MondayColumnValue | undefined): string | undefined {
  if (!col?.value) return undefined;
  try {
    const data = JSON.parse(col.value) as {
      files?: Array<Record<string, unknown>>;
    };
    const file = data.files?.[0];
    const url =
      (file?.url as string) ||
      (file?.public_url as string) ||
      (file?.linkToFile as string);
    return url;
  } catch {
    return undefined;
  }
}

const TAG_LABEL_TO_ID: Record<string, ContactTag> = {
  volunteer: 'volunteer',
  pastor: 'pastor',
  parent: 'parent',
  donor: 'donor',
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
  const phone = getColumnText(item.column_values, 'phone') || undefined;
  const profilePhotoUrl = parseProfilePhotoUrl(
    findColumn(item.column_values, 'profilePhoto'),
  );

  return {
    id: item.id,
    name: item.name,
    email,
    phone,
    profilePhotoUrl,
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
