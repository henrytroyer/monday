import type { ContactDemographics, ContactTag } from '../types/contact';

function formatCityStateZip(demographics: ContactDemographics): string | null {
  const city = demographics.city?.trim();
  const state = demographics.state?.trim();
  const zip = demographics.zip?.trim();

  const stateZip = [state, zip].filter(Boolean).join(' ');
  if (city && stateZip) return `${city}, ${stateZip}`;
  if (city) return city;
  if (stateZip) return stateZip;
  return null;
}

export function formatContactAddress(
  demographics: ContactDemographics,
): string | null {
  const lines: string[] = [];
  if (demographics.address?.trim()) {
    lines.push(demographics.address.trim());
  }

  const cityStateZip = formatCityStateZip(demographics);
  if (cityStateZip) lines.push(cityStateZip);

  if (demographics.country?.trim()) {
    lines.push(demographics.country.trim());
  }

  return lines.length > 0 ? lines.join('\n') : null;
}

/** Prefer contact demographics; fill gaps from linked application record. */
export function mergeContactAndApplicationDemographics(
  contact?: ContactDemographics,
  application?: ContactDemographics,
): ContactDemographics | undefined {
  const hasFields = (demographics?: ContactDemographics) =>
    Boolean(
      demographics &&
        (demographics.dateOfBirth?.trim() ||
          demographics.address?.trim() ||
          demographics.city?.trim() ||
          demographics.state?.trim() ||
          demographics.zip?.trim() ||
          demographics.country?.trim()),
    );

  if (!hasFields(contact) && !hasFields(application)) {
    return undefined;
  }

  return {
    dateOfBirth:
      contact?.dateOfBirth?.trim() ||
      application?.dateOfBirth?.trim() ||
      undefined,
    address:
      contact?.address?.trim() || application?.address?.trim() || undefined,
    city: contact?.city?.trim() || application?.city?.trim() || undefined,
    state:
      contact?.state?.trim() || application?.state?.trim() || undefined,
    zip: contact?.zip?.trim() || application?.zip?.trim() || undefined,
    country:
      contact?.country?.trim() || application?.country?.trim() || undefined,
  };
}

/** Parse multiline fillout address (street / city, state zip / country). */
export function parseFilloutAddress(
  text: string | undefined,
): Partial<ContactDemographics> {
  const lines = (text ?? '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length === 0) return {};

  const result: Partial<ContactDemographics> = {
    address: lines[0],
  };

  if (lines.length >= 2) {
    const parsed = parseCityStateZipLine(lines[1]);
    if (parsed) {
      result.city = parsed.city;
      result.state = parsed.state;
      result.zip = parsed.zip;
    } else {
      result.city = lines[1];
    }
  }

  if (lines.length >= 3) {
    result.country = lines[2];
  }

  return result;
}

function parseCityStateZipLine(
  line: string,
): { city: string; state: string; zip: string } | null {
  const match = line.match(/^(.+?),\s*(.+?)\s+(\d{5}(?:-\d{4})?)$/);
  if (!match) return null;

  return {
    city: match[1].trim(),
    state: match[2].trim(),
    zip: match[3],
  };
}

/** Open formatted address in Google Maps (new tab). */
export function buildGoogleMapsUrl(formattedAddress: string): string {
  const query = formattedAddress.replace(/\n/g, ', ').trim();
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

/** Donor-only contacts show mailing address on the profile card (not volunteers). */
export function showDonorMailingOnProfile(tags: ContactTag[]): boolean {
  return tags.includes('donor') && !tags.includes('volunteer');
}

export function hasContactDemographics(
  demographics: ContactDemographics,
): boolean {
  return Boolean(
    demographics.dateOfBirth?.trim() || formatContactAddress(demographics),
  );
}
