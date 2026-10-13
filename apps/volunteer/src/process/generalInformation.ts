import type { VolunteerGeneralInformation } from '../contract/volunteerApi';

export const VOLUNTEER_INFO_BANNER = 'Volunteer Information';
export const GENDER_LABEL = 'Gender';
export const BIRTHDATE_LABEL = 'Birthdate';
export const PHONE_LABEL = 'Phone Number';
export const PHONE_HINT = 'Enter without dashes and slashes';

export const MAILING_ADDRESS_BANNER = 'Mailing Address';
export const STREET_LABEL = 'Street Number and Name';
export const CITY_LABEL = 'City';
export const STATE_LABEL = 'State/Providence';
export const STATE_HINT = 'Two letters for States';
export const POSTAL_LABEL = 'Postal Code';
export const COUNTRY_LABEL = 'Country';
export const COUNTRY_HINT = 'USA: for the States';

export const emptyGeneralInformation = (): VolunteerGeneralInformation => ({
  gender: '',
  birthdate: '',
  phone: '',
  street: '',
  city: '',
  state: '',
  postalCode: '',
  country: '',
});

export function isGeneralInformationComplete(
  draft: VolunteerGeneralInformation,
): boolean {
  return (
    (draft.gender === 'male' || draft.gender === 'female') &&
    draft.birthdate.trim().length > 0 &&
    draft.phone.trim().length > 0 &&
    draft.street.trim().length > 0 &&
    draft.city.trim().length > 0 &&
    draft.state.trim().length > 0 &&
    draft.postalCode.trim().length > 0 &&
    draft.country.trim().length > 0
  );
}
