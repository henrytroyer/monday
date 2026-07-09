import { columnMap } from '../config/columnMap';
import type { ContactDemographics } from '../types/contact';
import type { MondayColumnValue } from '../services/mapMondayToCrm';
import { parseFilloutAddress } from './formatContactAddress';

function normalizeTitle(title: string): string {
  return title.trim().toLowerCase();
}

function columnTitle(col: MondayColumnValue): string {
  return col.column?.title?.trim() || '';
}

function getApplicationColumnText(
  columnValues: MondayColumnValue[],
  fieldKey: keyof typeof columnMap,
): string {
  const target = normalizeTitle(columnMap[fieldKey]);
  return (
    columnValues
      .find((col) => normalizeTitle(columnTitle(col)) === target)
      ?.text?.trim() || ''
  );
}

function structuredAddressComplete(demographics: ContactDemographics): boolean {
  return Boolean(
    demographics.address?.trim() &&
      demographics.city?.trim() &&
      demographics.zip?.trim(),
  );
}

/** Resolve mailing address + birthdate from Applications board columns. */
export function resolveApplicationDemographics(
  columnValues: MondayColumnValue[],
): ContactDemographics | undefined {
  const dateOfBirth = getApplicationColumnText(columnValues, 'dateOfBirth');
  const filloutText = getApplicationColumnText(columnValues, 'addressFillout');
  const fromFillout = parseFilloutAddress(filloutText);

  const structured: ContactDemographics = {
    address: getApplicationColumnText(columnValues, 'addressStreet'),
    city: getApplicationColumnText(columnValues, 'addressCity'),
    state: getApplicationColumnText(columnValues, 'addressState'),
    zip: getApplicationColumnText(columnValues, 'addressZip'),
    country: getApplicationColumnText(columnValues, 'addressCountry'),
  };

  let address = structured.address ?? '';
  let city = structured.city ?? '';
  let state = structured.state ?? '';
  let zip = structured.zip ?? '';
  let country = structured.country ?? '';

  if (fromFillout.address && !structuredAddressComplete(structured)) {
    address = fromFillout.address ?? address;
    city = fromFillout.city ?? city;
    state = fromFillout.state ?? state;
    zip = fromFillout.zip ?? zip;
    country = fromFillout.country ?? country;
  } else {
    address = address || fromFillout.address || '';
    city = city || fromFillout.city || '';
    state = state || fromFillout.state || '';
    zip = zip || fromFillout.zip || '';
    country = country || fromFillout.country || '';
  }

  if (!dateOfBirth && !address && !city && !state && !zip && !country) {
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
