/**
 * Merge and normalize mailing demographics across CRM boards.
 * Prefer the richest street-level address when combining sources.
 */

import type { ContactDemographics } from '../types/contact';
import { parseFilloutAddress } from './formatContactAddress';

const STREET_WORD =
  /\b(st|street|ave|avenue|rd|road|dr|drive|ln|lane|blvd|way|ct|court|pl|place|ter|terrace|hwy|highway|pkwy|parkway|cir|circle)\b/i;

export function looksLikeStreetLine(value: string | undefined | null): boolean {
  const text = value?.trim() ?? '';
  if (!text) return false;
  if (/^\d/.test(text)) return true;
  return STREET_WORD.test(text);
}

/** Score how complete / useful a demographics blob is for mailing + map pins. */
export function demographicsRichness(
  demographics?: ContactDemographics | null,
): number {
  if (!demographics) return 0;
  let score = 0;
  const address = demographics.address?.trim() ?? '';
  const city = demographics.city?.trim() ?? '';
  const state = demographics.state?.trim() ?? '';
  const zip = demographics.zip?.trim() ?? '';
  const country = demographics.country?.trim() ?? '';

  if (address) {
    score += 20 + Math.min(address.length, 60);
    if (looksLikeStreetLine(address)) score += 25;
  }
  if (city) score += 8;
  if (state) score += 5;
  if (zip) score += 5;
  if (country) score += 3;
  if (demographics.dateOfBirth?.trim()) score += 2;
  return score;
}

/**
 * Parse a single-line mailing address into structured fields when possible.
 * e.g. "123 Oak St, Portland, OR 97201, United States"
 */
export function parseSingleLineMailingAddress(
  text: string | undefined,
): Partial<ContactDemographics> {
  const raw = text?.replace(/\s+/g, ' ').trim() ?? '';
  if (!raw) return {};

  if (raw.includes('\n')) {
    return parseFilloutAddress(raw);
  }

  const parts = raw
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length < 2) {
    return looksLikeStreetLine(raw) ? { address: raw } : { city: raw };
  }

  let country: string | undefined;
  let zip: string | undefined;
  let state: string | undefined;
  let city: string | undefined;
  let address: string | undefined;

  const last = parts[parts.length - 1]!;
  if (/^[A-Za-z][A-Za-z\s.]{2,}$/.test(last) && !/\d/.test(last)) {
    country = last;
    parts.pop();
  }

  if (parts.length === 0) {
    return { ...(country ? { country } : {}) };
  }

  // "OR 97201" or "Ohio 45390" as final segment
  const region = parts[parts.length - 1]!;
  const regionMatch = region.match(
    /^(.+?)\s+(\d{5}(?:-\d{4})?)$/,
  );
  if (regionMatch) {
    state = regionMatch[1]!.trim();
    zip = regionMatch[2]!;
    parts.pop();
  } else if (/^\d{5}(?:-\d{4})?$/.test(region)) {
    zip = region;
    parts.pop();
    if (parts.length > 0) {
      const maybeState = parts[parts.length - 1]!;
      if (/^[A-Za-z]{2}$/.test(maybeState) || /^[A-Za-z][A-Za-z\s.]{1,20}$/.test(maybeState)) {
        state = maybeState;
        parts.pop();
      }
    }
  }

  if (parts.length >= 2 && looksLikeStreetLine(parts[0]!)) {
    address = parts[0];
    city = parts.slice(1).join(', ');
  } else if (parts.length === 1) {
    if (looksLikeStreetLine(parts[0]!)) address = parts[0];
    else city = parts[0];
  } else if (parts.length > 0) {
    address = parts.join(', ');
  }

  return {
    ...(address ? { address } : {}),
    ...(city ? { city } : {}),
    ...(state ? { state } : {}),
    ...(zip ? { zip } : {}),
    ...(country ? { country } : {}),
  };
}

/**
 * Repair stuffed / incomplete address columns so street lands in `address`.
 */
export function normalizeContactDemographics(
  demographics?: ContactDemographics | null,
): ContactDemographics | undefined {
  if (!demographics) return undefined;

  let address = demographics.address?.trim() || '';
  let city = demographics.city?.trim() || '';
  let state = demographics.state?.trim() || '';
  let zip = demographics.zip?.trim() || '';
  let country = demographics.country?.trim() || '';
  const dateOfBirth = demographics.dateOfBirth?.trim() || '';

  // Full blob in address (multiline or single-line) with missing city/zip.
  if (address && (!city || !zip)) {
    const parsed = address.includes('\n')
      ? parseFilloutAddress(address)
      : parseSingleLineMailingAddress(address);
    if (parsed.address && (parsed.city || parsed.zip || parsed.state)) {
      address = parsed.address?.trim() || address;
      city = city || parsed.city?.trim() || '';
      state = state || parsed.state?.trim() || '';
      zip = zip || parsed.zip?.trim() || '';
      country = country || parsed.country?.trim() || '';
    }
  }

  // Street stuffed into City with Address empty.
  if (!address && looksLikeStreetLine(city)) {
    const parsed = parseSingleLineMailingAddress(city);
    if (parsed.address) {
      address = parsed.address;
      city = parsed.city?.trim() || '';
      state = state || parsed.state?.trim() || '';
      zip = zip || parsed.zip?.trim() || '';
      country = country || parsed.country?.trim() || '';
    } else {
      address = city;
      city = '';
    }
  }

  if (!address && !city && !state && !zip && !country && !dateOfBirth) {
    return undefined;
  }

  return {
    ...(dateOfBirth ? { dateOfBirth } : {}),
    ...(address ? { address } : {}),
    ...(city ? { city } : {}),
    ...(state ? { state } : {}),
    ...(zip ? { zip } : {}),
    ...(country ? { country } : {}),
  };
}

/**
 * Combine two demographics blobs, keeping the richest street-level values.
 */
export function mergeRichestDemographics(
  base?: ContactDemographics | null,
  extra?: ContactDemographics | null,
): ContactDemographics | undefined {
  const a = normalizeContactDemographics(base);
  const b = normalizeContactDemographics(extra);
  if (!a && !b) return undefined;
  if (!a) return b;
  if (!b) return a;

  const prefer = (left?: string, right?: string, streetBias = false) => {
    const l = left?.trim() || '';
    const r = right?.trim() || '';
    if (!l) return r || undefined;
    if (!r) return l || undefined;
    if (streetBias) {
      const lStreet = looksLikeStreetLine(l);
      const rStreet = looksLikeStreetLine(r);
      if (lStreet && !rStreet) return l;
      if (rStreet && !lStreet) return r;
      return l.length >= r.length ? l : r;
    }
    return l.length >= r.length ? l : r;
  };

  const merged: ContactDemographics = {
    dateOfBirth: prefer(a.dateOfBirth, b.dateOfBirth),
    address: prefer(a.address, b.address, true),
    city: prefer(a.city, b.city),
    state: prefer(a.state, b.state),
    zip: prefer(a.zip, b.zip),
    country: prefer(a.country, b.country),
  };

  // If one side is overall much richer, fill any remaining gaps from it.
  const richer = demographicsRichness(a) >= demographicsRichness(b) ? a : b;
  const leaner = richer === a ? b : a;
  return normalizeContactDemographics({
    dateOfBirth: merged.dateOfBirth || richer.dateOfBirth || leaner.dateOfBirth,
    address: merged.address || richer.address || leaner.address,
    city: merged.city || richer.city || leaner.city,
    state: merged.state || richer.state || leaner.state,
    zip: merged.zip || richer.zip || leaner.zip,
    country: merged.country || richer.country || leaner.country,
  });
}
