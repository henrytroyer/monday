import type { VolunteerTermOfService } from '../contract/volunteerApi';

export const TERM_OF_SERVICE_BANNER = 'Term of Service';
export const LOCATION_PREFERENCE_LABEL = 'i58 Location Preference';
export const LOCATION_PREFERENCE_HINT = 'Select as many as apply';
export const PREFERENCE_HEADING = 'PREFERENCE';
export const PREFERENCE_NOTE =
  'PLEASE NOTE that this is a location PREFERENCE only. While i58 will try their best to accommodate your preference, it is important that all i58 volunteers be flexible and willing to serve wherever needed most.';
export const SCHEDULE_NOTE =
  'As of July 2023, i58 will send teams every 6 weeks (instead of every 4 weeks) for a duration of 3 months. If there are any questions or special requests, please email info@i58global.org';
export const LENGTH_OF_TERM_LABEL = 'Length of Term';
export const OTHER_TERM_LABEL = '"Other" Term';
export const PREFERRED_DATES_LABEL = 'Preferred Dates';
export const NEARBY_AIRPORT_LABEL =
  'Preferred nearby airport for international departure/arrival';
export const TRAVEL_NOTE_HEADING = 'Important Note:';
export const TRAVEL_NOTE_BODY =
  'Most teams will have a stateside orientation in Lancaster, PA. From there, you will travel to a nearby airport with your team and fly to your location of service. You will have the option of booking your return ticket to that airport or another airport near your home. i58 works with a Travel Agency to book all your travel. The Travel Agency will be in contact with you 4-6 weeks before departure in order to arrange flights.';
export const TRAVEL_NOTE_FOOTER =
  'More information will be provided after application and acceptance.';

export const LENGTH_OF_TERM_OPTIONS = [
  { id: '3-months', label: '3 months' },
  { id: 'other', label: 'Other' },
] as const;

/** Preview option list — source form choices were not in the screenshots. */
export const LOCATION_PREFERENCE_OPTIONS = [
  'Lesvos Greece',
  'Athens/Malakasa Greece',
  'Germany',
] as const;

/** Preview option list — source form choices were not in the screenshots. */
export const PREFERRED_DATE_OPTIONS = [
  'Summer 2026',
  'Fall 2026',
  'Winter 2026-27',
  'Spring 2027',
] as const;

export const emptyTermOfService = (): VolunteerTermOfService => ({
  locationPreferences: [],
  lengthOfTerm: '',
  otherTerm: '',
  preferredDates: '',
  nearbyAirport: '',
});

export function isTermOfServiceComplete(draft: VolunteerTermOfService): boolean {
  if (draft.locationPreferences.length === 0) return false;
  if (draft.lengthOfTerm !== '3-months' && draft.lengthOfTerm !== 'other') {
    return false;
  }
  if (draft.lengthOfTerm === 'other' && draft.otherTerm.trim().length === 0) {
    return false;
  }
  return (
    draft.preferredDates.trim().length > 0 &&
    draft.nearbyAirport.trim().length > 0
  );
}
