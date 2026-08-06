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
