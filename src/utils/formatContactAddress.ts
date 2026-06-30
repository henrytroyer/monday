import type { ContactDemographics, ContactTag } from '../types/contact';

export function formatContactAddress(
  demographics: ContactDemographics,
): string | null {
  const lines: string[] = [];
  if (demographics.address?.trim()) lines.push(demographics.address.trim());
  const locality = [demographics.city, demographics.country]
    .filter((p) => p?.trim())
    .join(', ');
  if (locality) lines.push(locality);
  return lines.length > 0 ? lines.join('\n') : null;
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
