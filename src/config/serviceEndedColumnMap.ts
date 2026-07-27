/**
 * Map CRM fields to monday.com column titles on the Current Service Ended board.
 */
const viteEnv = import.meta.env ?? {};

export const serviceEndedColumnMap = {
  email: viteEnv.VITE_SERVICE_ENDED_COL_EMAIL || 'Email Address',
  signupTimeline:
    viteEnv.VITE_SERVICE_ENDED_COL_SIGNUP_TIMELINE || 'Preferred Dates',
  status: viteEnv.VITE_SERVICE_ENDED_COL_STATUS || 'Status ↗️',
  location: viteEnv.VITE_SERVICE_ENDED_COL_LOCATION || 'Location',
  termRange:
    viteEnv.VITE_SERVICE_ENDED_COL_TERM_RANGE || 'Arrival/Departure Date',
  shortTermAppLink:
    viteEnv.VITE_SERVICE_ENDED_COL_SHORT_TERM_LINK ||
    'link to Volunteer Service - Short Term',
  contactLink: viteEnv.VITE_SERVICE_ENDED_COL_CONTACT_LINK || 'Contact',
  locationPreference:
    viteEnv.VITE_SERVICE_ENDED_COL_LOCATION_PREFERENCE ||
    'i58 Location Preference',
  parentEmail: viteEnv.VITE_SERVICE_ENDED_COL_PARENT_EMAIL || "Parent's Email",
  pastorEmail: viteEnv.VITE_SERVICE_ENDED_COL_PASTOR_EMAIL || "Pastor's Email",
  phone: viteEnv.VITE_SERVICE_ENDED_COL_PHONE || 'Phone',
  profilePhoto:
    viteEnv.VITE_SERVICE_ENDED_COL_PROFILE_PHOTO || 'Profile Photo',
  passport: viteEnv.VITE_SERVICE_ENDED_COL_PASSPORT || 'Passport Photo',
  passportNew:
    viteEnv.VITE_SERVICE_ENDED_COL_PASSPORT_NEW || 'Please upload New Passport',
  releaseForms:
    viteEnv.VITE_SERVICE_ENDED_COL_RELEASE_FORMS || 'Release Forms',
  notes: viteEnv.VITE_SERVICE_ENDED_COL_NOTES || 'Notes',
  dateOfBirth: viteEnv.VITE_SERVICE_ENDED_COL_DATE_OF_BIRTH || 'Birthdate',
} as const;

export type ServiceEndedColumnMapKey = keyof typeof serviceEndedColumnMap;
