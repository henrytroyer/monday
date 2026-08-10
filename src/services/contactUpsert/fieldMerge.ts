/**
 * fieldMerge.ts — Shared string/demographics merge helpers for contact upsert.
 * fill-gaps (default), prefer-incoming (CSE), richest (Fillout builder).
 */

import type { ContactDemographics } from '../../types/contact';

export type ContactFieldMergeMode = 'fill-gaps' | 'prefer-incoming' | 'richest';

/** Fill gaps: keep existing when set; never wipe with empty. */
export function fillGap(
  existing: string | undefined,
  incoming: string | undefined,
): string | undefined {
  const e = existing?.trim();
  const i = incoming?.trim();
  if (e) return e;
  if (i) return i;
  return undefined;
}

/** Prefer newer non-empty incoming (CSE); never wipe with empty. */
export function preferIncomingValue(
  existing: string | undefined,
  incoming: string | undefined,
): string | undefined {
  const e = existing?.trim();
  const i = incoming?.trim();
  if (i) return i;
  if (e) return e;
  return undefined;
}

/**
 * Per-field richest: non-empty wins; when both set prefer the longer trimmed value.
 * Never wipe with empty.
 */
export function pickRicherField(
  existing: string | undefined,
  incoming: string | undefined,
): string | undefined {
  const e = existing?.trim();
  const i = incoming?.trim();
  if (e && i) return i.length > e.length ? i : e;
  if (e) return e;
  if (i) return i;
  return undefined;
}

export function mergeFieldByMode(
  existing: string | undefined,
  incoming: string | undefined,
  mode: ContactFieldMergeMode,
): string | undefined {
  if (mode === 'prefer-incoming') {
    return preferIncomingValue(existing, incoming);
  }
  if (mode === 'richest') {
    return pickRicherField(existing, incoming);
  }
  return fillGap(existing, incoming);
}

export function mergeDemographicsByMode(
  existing: ContactDemographics | undefined,
  incoming: ContactDemographics | undefined,
  mode: ContactFieldMergeMode,
): ContactDemographics | undefined {
  if (!existing && !incoming) return undefined;
  const pick = (a?: string, b?: string) => mergeFieldByMode(a, b, mode);
  const merged: ContactDemographics = {
    address: pick(existing?.address, incoming?.address),
    city: pick(existing?.city, incoming?.city),
    state: pick(existing?.state, incoming?.state),
    zip: pick(existing?.zip, incoming?.zip),
    country: pick(existing?.country, incoming?.country),
    dateOfBirth: pick(existing?.dateOfBirth, incoming?.dateOfBirth),
  };
  if (
    !merged.address &&
    !merged.city &&
    !merged.state &&
    !merged.zip &&
    !merged.country &&
    !merged.dateOfBirth
  ) {
    return undefined;
  }
  return merged;
}

/** Resolve merge mode from upsert flags (preferIncoming kept for CSE callers). */
export function resolveContactFieldMergeMode(input: {
  mergeMode?: ContactFieldMergeMode;
  preferIncoming?: boolean;
}): ContactFieldMergeMode {
  if (input.mergeMode) return input.mergeMode;
  if (input.preferIncoming) return 'prefer-incoming';
  return 'fill-gaps';
}
