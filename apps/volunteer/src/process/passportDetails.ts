import type { VolunteerPassportDetails } from '../contract/volunteerApi';

export const PASSPORT_DETAILS_BANNER = 'Passport Details';
export const PASSPORT_EXAMPLE_SRC = '/examples/passport-specimen.png';
export const PASSPORT_EXAMPLE_ALT = 'Example of a clear passport photo';
export const PASSPORT_PHOTO_LABEL = 'Passport Photo';
export const PASSPORT_PHOTO_HINT = 'Please ensure a clear photo';
export const PASSPORT_DROP_LEAD = 'Drag & drop a file or';
export const PASSPORT_BROWSE = 'browse';
export const PASSPORT_NUMBER_LABEL = 'Passport Number';
export const PASSPORT_EXPIRATION_LABEL = 'Passport Expiration Date';

export const emptyPassportDetails = (): VolunteerPassportDetails => ({
  photoFileName: '',
  passportNumber: '',
  expirationDate: '',
});

export function isPassportDetailsComplete(
  draft: VolunteerPassportDetails,
): boolean {
  return (
    draft.photoFileName.trim().length > 0 &&
    draft.passportNumber.trim().length > 0 &&
    draft.expirationDate.trim().length > 0
  );
}
