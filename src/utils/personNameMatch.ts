/** Normalized person name for exact comparison (lowercase, alphanumeric + spaces). */
export function normalizePersonName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ');
}

/** Strip board metadata suffixes from monday item titles before name matching. */
export function volunteerNameFromItemTitle(itemName: string): string {
  const trimmed = itemName.trim();
  if (!trimmed) return trimmed;

  for (const separator of [' · ', ' - ', ' – ', ' — ']) {
    const index = trimmed.indexOf(separator);
    if (index > 0) return trimmed.slice(0, index).trim();
  }

  return trimmed;
}

export function namesMatchExact(a: string, b: string): boolean {
  const na = normalizePersonName(a);
  const nb = normalizePersonName(b);
  return Boolean(na && nb && na === nb);
}

const HELLO_SALUTATION =
  /\b(?:hello|hi|dear)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s*[,!.]/g;

const FULL_NAME_STATUS =
  /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\s+is\s+(?:marked\s+for|applying)\b/g;

/** Extract candidate volunteer names from plain note/email body text. */
export function extractVolunteerNamesFromNoteBody(plainBody: string): string[] {
  const candidates = new Set<string>();

  for (const match of plainBody.matchAll(HELLO_SALUTATION)) {
    const name = match[1]?.trim();
    if (name && name.includes(' ')) {
      candidates.add(name);
    }
  }

  for (const match of plainBody.matchAll(FULL_NAME_STATUS)) {
    const name = match[1]?.trim();
    if (name) candidates.add(name);
  }

  return [...candidates];
}

export interface ContactNameLookup {
  contactByNormalizedName: Map<string, { id: string; name: string }[]>;
}

/** Return the sole contact with this exact normalized name, or null if ambiguous/missing. */
export function resolveUniqueContactByName(
  name: string,
  index: ContactNameLookup,
): { id: string; name: string } | null {
  const normalized = normalizePersonName(name);
  if (!normalized) return null;

  const matches = index.contactByNormalizedName.get(normalized) ?? [];
  if (matches.length === 1) return matches[0]!;
  return null;
}
