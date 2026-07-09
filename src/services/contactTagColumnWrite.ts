import { CONTACT_TAG_LABELS, type ContactTag } from '../types/contact';

export type ContactBoardColumn = {
  id: string;
  title: string;
  type: string;
  settings_str?: string;
};

function normalizeTitle(title: string): string {
  return title.trim().toLowerCase();
}

/** Whether a monday status column allows multiple labels. */
export function statusColumnAllowsMultipleLabels(
  settingsStr?: string,
): boolean {
  if (!settingsStr?.trim()) return false;

  try {
    const settings = JSON.parse(settingsStr) as {
      limit_select?: number;
    };
    if (settings.limit_select === 0) return true;
    if (
      typeof settings.limit_select === 'number' &&
      settings.limit_select > 1
    ) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

function parseStatusLabelsFromSettings(settingsStr?: string): string[] {
  if (!settingsStr?.trim()) return [];

  try {
    const data = JSON.parse(settingsStr) as {
      labels?: Array<{ name?: string }>;
    };
    return (data.labels ?? [])
      .map((label) => label.name?.trim())
      .filter((name): name is string => Boolean(name));
  } catch {
    return [];
  }
}

function statusColumnHasCrmLabels(settingsStr?: string): boolean {
  const boardLabels = new Set(
    parseStatusLabelsFromSettings(settingsStr).map((label) =>
      label.toLowerCase(),
    ),
  );
  return Object.values(CONTACT_TAG_LABELS).some((label) =>
    boardLabels.has(label.toLowerCase()),
  );
}

function isTextLikeColumnType(columnType: string): boolean {
  return columnType === 'text' || columnType === 'long_text';
}

export interface ResolveContactTagsColumnOptions {
  tagsColumnTitle: string;
  typeColumnTitle: string;
  explicitTagsColumnEnv?: string;
}

/** Pick the Contacts board column used to persist CRM tags. */
export function resolveContactTagsWriteColumn(
  columns: ContactBoardColumn[],
  options: ResolveContactTagsColumnOptions,
): ContactBoardColumn | undefined {
  const tagsTitle = normalizeTitle(options.tagsColumnTitle);
  const typeTitle = normalizeTitle(options.typeColumnTitle);
  const tagsCol = columns.find(
    (column) => normalizeTitle(column.title) === tagsTitle,
  );
  const typeCol = columns.find(
    (column) => normalizeTitle(column.title) === typeTitle,
  );

  if (options.explicitTagsColumnEnv?.trim()) {
    const explicit = columns.find(
      (column) => normalizeTitle(column.title) === tagsTitle,
    );
    if (explicit) return explicit;
  }

  if (typeCol && isTextLikeColumnType(typeCol.type)) {
    return typeCol;
  }

  if (
    tagsCol &&
    (tagsCol.type === 'status' || tagsCol.type === 'dropdown') &&
    statusColumnHasCrmLabels(tagsCol.settings_str)
  ) {
    return tagsCol;
  }

  return typeCol ?? tagsCol;
}

/** Plain string for change_simple_column_value on text tag columns. */
export function formatContactTagsSimpleValue(tags: ContactTag[]): string {
  return tags.map((tag) => CONTACT_TAG_LABELS[tag]).join(', ');
}

/** Format tags for change_column_value based on the board column type. */
export function formatContactTagsColumnValue(
  tags: ContactTag[],
  columnType: string,
  settingsStr?: string,
  columnTitle = 'tags',
): string {
  const labels = tags.map((tag) => CONTACT_TAG_LABELS[tag]);

  if (columnType === 'status') {
    if (labels.length === 0) {
      return JSON.stringify({ label: null });
    }
    if (statusColumnAllowsMultipleLabels(settingsStr)) {
      return JSON.stringify({ labels });
    }
    return JSON.stringify({ label: labels[0] });
  }

  if (columnType === 'dropdown') {
    if (labels.length === 0) {
      return JSON.stringify({ labels: [] });
    }
    return JSON.stringify({ labels });
  }

  throw new Error(
    `Unsupported tag column "${columnTitle}" (${columnType}). Use a text "type" column or a status/dropdown Tags column.`,
  );
}

export function contactTagsUseSimpleColumnValue(columnType: string): boolean {
  return isTextLikeColumnType(columnType);
}
