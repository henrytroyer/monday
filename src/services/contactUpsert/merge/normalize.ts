/**
 * normalize.ts — Comparison-only normalization for contact merge.
 * Does not mutate stored Monday values.
 */

import { normalizeEmail as baseNormalizeEmail } from '../contactMatch';
import { normalizePersonName as baseNormalizePersonName } from '../../../utils/personNameMatch';

/** Normalized email for comparison, or null if empty/invalid. */
export function normalizeEmailForMerge(
  value: string | undefined | null,
): string | null {
  if (value == null) return null;
  const trimmed = String(value).trim();
  if (!trimmed) return null;
  return baseNormalizeEmail(trimmed);
}

/** Normalized full name for comparison, or null if empty. */
export function normalizeNameForMerge(
  value: string | undefined | null,
): string | null {
  if (value == null) return null;
  const trimmed = String(value).trim().replace(/\s+/g, ' ');
  if (!trimmed) return null;
  const normalized = baseNormalizePersonName(trimmed);
  return normalized || null;
}

export function namesEqualForMerge(
  a: string | undefined | null,
  b: string | undefined | null,
): boolean {
  const na = normalizeNameForMerge(a);
  const nb = normalizeNameForMerge(b);
  return Boolean(na && nb && na === nb);
}

export function emailsEqualForMerge(
  a: string | undefined | null,
  b: string | undefined | null,
): boolean {
  const ea = normalizeEmailForMerge(a);
  const eb = normalizeEmailForMerge(b);
  return Boolean(ea && eb && ea === eb);
}

const NAME_STOPWORDS = new Set(['and', 'or', 'the', 'of', '&']);

/** Significant name tokens for relatedness (drops and/or/& and tiny tokens). */
export function nameTokensForMerge(
  value: string | undefined | null,
): string[] {
  const normalized = normalizeNameForMerge(value);
  if (!normalized) return [];
  return normalized
    .split(/\s+/)
    .map((t) => t.replace(/[^a-z0-9]/g, ''))
    .filter((t) => t.length >= 3 && !NAME_STOPWORDS.has(t));
}

/**
 * True when names look like the same household / person variants
 * (shared surname/given name, or one name contained in the other).
 * Clarence and Erla vs Kristalyn Martin → false.
 */
export function namesRelatedForMerge(
  a: string | undefined | null,
  b: string | undefined | null,
): boolean {
  if (namesEqualForMerge(a, b)) return true;
  const ta = nameTokensForMerge(a);
  const tb = nameTokensForMerge(b);
  if (ta.length === 0 || tb.length === 0) return false;
  const setB = new Set(tb);
  if (ta.some((t) => setB.has(t))) return true;
  // Containment on full normalized string (e.g. "gary wagler" in "gary and becky wagler")
  const na = normalizeNameForMerge(a);
  const nb = normalizeNameForMerge(b);
  if (!na || !nb) return false;
  return na.includes(nb) || nb.includes(na);
}

/** True when every contact pair in the set shares related names. */
export function allNamesRelatedForMerge(
  contacts: Array<{ name: string }>,
): boolean {
  if (contacts.length < 2) return true;
  const first = contacts[0]!.name;
  return contacts.every((c) => namesRelatedForMerge(first, c.name));
}
