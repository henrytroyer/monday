/**
 * mailingAddress.ts — Format / parse mailing blocks for merge multi-keep.
 *
 * Primary address fills Street/City/State/Zip/Country.
 * Alternates are stored pipe-separated on Monday Alt Address.
 */

import type { ContactListDemographics, ContactListItem } from '../../../types/contact';

export function formatMailingBlock(
  demographics: ContactListDemographics | undefined,
): string {
  if (!demographics) return '';
  const street = demographics.address?.trim() || '';
  const city = demographics.city?.trim() || '';
  const state = demographics.state?.trim() || '';
  const zip = demographics.zip?.trim() || '';
  const country = demographics.country?.trim() || '';
  const cityLine = [city, [state, zip].filter(Boolean).join(' ')]
    .filter(Boolean)
    .join(', ');
  return [street, cityLine, country].filter(Boolean).join('\n').trim();
}

export function parseMailingBlock(
  value: string,
): ContactListDemographics {
  const lines = value
    .split(/\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length === 0) return {};

  if (lines.length === 1) {
    // "City, ST 12345" or a single street line
    const only = lines[0]!;
    const cityState = parseCityStateZip(only);
    if (cityState.city || cityState.state || cityState.zip) {
      return cityState;
    }
    return { address: only };
  }

  const street = lines[0];
  const country =
    lines.length >= 3 ? lines[lines.length - 1] : undefined;
  const cityLine =
    lines.length >= 3 ? lines[1]! : lines.length === 2 ? lines[1]! : '';
  const parsedCity = parseCityStateZip(cityLine);

  // If the "city line" didn't parse and we only have 2 lines, treat line2 as country.
  if (
    lines.length === 2 &&
    !parsedCity.city &&
    !parsedCity.state &&
    !parsedCity.zip
  ) {
    return {
      address: street,
      country: lines[1],
    };
  }

  return {
    address: street,
    ...parsedCity,
    ...(country ? { country } : {}),
  };
}

function parseCityStateZip(line: string): ContactListDemographics {
  const trimmed = line.trim();
  if (!trimmed) return {};

  // "City, ST 12345" or "City, State 12345"
  const match = trimmed.match(
    /^(.+?),\s*([A-Za-z]{2,}(?:\s+[A-Za-z]+)*)\s+(\d[\d-]*)\s*$/,
  );
  if (match) {
    return {
      city: match[1]!.trim(),
      state: match[2]!.trim(),
      zip: match[3]!.trim(),
    };
  }

  const cityOnly = trimmed.match(/^(.+?),\s*([A-Za-z]{2,})\s*$/);
  if (cityOnly) {
    return {
      city: cityOnly[1]!.trim(),
      state: cityOnly[2]!.trim(),
    };
  }

  return { city: trimmed };
}

/** Split Alt Address column into discrete mailing blocks. */
export function splitAltAddresses(value: string | undefined): string[] {
  if (!value?.trim()) return [];
  return value
    .split(/\s*\|\s*/)
    .map((part) => part.trim())
    .filter(Boolean);
}

export function joinAltAddresses(blocks: string[]): string | undefined {
  const cleaned = blocks.map((b) => b.trim()).filter(Boolean);
  return cleaned.length > 0 ? cleaned.join(' | ') : undefined;
}

export function mailingBlocksEqual(a: string, b: string): boolean {
  return normalizeMailingBlock(a) === normalizeMailingBlock(b);
}

function normalizeMailingBlock(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/\s*\|\s*/g, '|');
}

/** Collect unique mailing blocks from a contact (primary + alt). */
export function collectMailingBlocks(contact: ContactListItem): string[] {
  const blocks: string[] = [];
  const primary = formatMailingBlock(contact.demographics);
  if (primary) blocks.push(primary);
  for (const alt of splitAltAddresses(contact.altAddress)) {
    if (!blocks.some((b) => mailingBlocksEqual(b, alt))) {
      blocks.push(alt);
    }
  }
  return blocks;
}
