import { columnMap } from '../config/columnMap';

export type MondayBoardColumnRef = {
  id: string;
  title: string;
  type: string;
  settings_str?: string;
};

function normalizeColumnTitle(title: string): string {
  return title.trim().toLowerCase();
}

/**
 * Parse monday column settings_str into display labels.
 * Supports dropdown (`labels: [{ name }]`) and status (`labels: { "0": "..." }`) formats.
 */
export function parseColumnLabelsFromSettings(settingsStr: string): string[] {
  if (!settingsStr?.trim()) return [];

  try {
    const data = JSON.parse(settingsStr) as {
      labels?:
        | Array<{ name?: string; text?: string } | string>
        | Record<string, string>;
    };

    const raw = data.labels;
    if (!raw) return [];

    if (Array.isArray(raw)) {
      return raw
        .map((label) => {
          if (typeof label === 'string') return label.trim();
          return (label.name ?? label.text)?.trim();
        })
        .filter((name): name is string => Boolean(name));
    }

    if (typeof raw === 'object') {
      return Object.values(raw)
        .map((value) => (typeof value === 'string' ? value.trim() : ''))
        .filter(Boolean);
    }

    return [];
  } catch {
    return [];
  }
}

/** Drop auto-created multi-select combo labels; keep canonical board dropdown options. */
export function filterBoardDropdownLabels(labels: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const label of labels) {
    const trimmed = label.trim();
    if (!trimmed || trimmed.includes(',')) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(trimmed);
  }

  return result;
}

/**
 * Resolve the Location Preference column: exact env/title match, then fuzzy title match.
 * Prefers dropdown-type columns when multiple fuzzy matches exist.
 */
export function resolveLocationPreferenceColumn(
  columns: MondayBoardColumnRef[],
): MondayBoardColumnRef | undefined {
  const target = normalizeColumnTitle(columnMap.locationPreference);

  const exact = columns.find(
    (column) => normalizeColumnTitle(column.title) === target,
  );
  if (exact) return exact;

  const fuzzyMatches = columns.filter((column) => {
    const title = normalizeColumnTitle(column.title);
    return title.includes('location') && title.includes('preference');
  });

  if (fuzzyMatches.length === 0) return undefined;

  const dropdown = fuzzyMatches.find((column) => column.type === 'dropdown');
  return dropdown ?? fuzzyMatches[0];
}

export function parseLocationOptionsFromColumn(
  column: MondayBoardColumnRef | undefined,
): string[] {
  if (!column) return [];
  return filterBoardDropdownLabels(
    parseColumnLabelsFromSettings(column.settings_str ?? ''),
  );
}
