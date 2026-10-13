import type { VolunteerSpouseApplication } from '../contract/volunteerApi';
import { LANGUAGE_OPTIONS, SKILL_OPTIONS } from './historySkillsLanguages';

export const SPOUSE_APPLICATION_BANNER = 'Spouse Application';
export const SPOUSE_JOINING_LABEL =
  'Do you have a spouse joining you as a volunteer?';
export const SPOUSE_INFO_HEADING = 'Spouse Information';
export const SPOUSE_INFO_LINE_1 =
  'We need specific information about your spouse to register with local authority (where applicable)';
export const SPOUSE_INFO_LINE_2 =
  'We also need to know a little bit about your spouse.';
export const SPOUSE_NAME_LABEL = 'Spouse Name';
export const SPOUSE_NAME_HINT = 'First and Last';
export const SPOUSE_EMAIL_LABEL = 'Spouse Email';
export const SPOUSE_EMAIL_HINT = 'Verify Accuracy';
export const SPOUSE_PHONE_LABEL = 'Spouse Phone Number';
export const SPOUSE_PHONE_HINT = 'Enter without dashes and slashes';
export const SPOUSE_PREVIOUS_LABEL = 'Spouse - Are you a previous volunteer?';
export const SPOUSE_LAST_TERM_LABEL = 'Spouse - Date of Last Term of Service';
export const SPOUSE_BIRTHDATE_LABEL = 'Spouse Birthdate';
export const SPOUSE_GENDER_LABEL = 'Spouse Gender';
export const PASSPORT_SECTION = 'Passport';
export const SPOUSE_PASSPORT_UPDATED_LABEL =
  'Spouse - Have you updated your passport?';
export const SPOUSE_PASSPORT_PHOTO_LABEL = 'Spouse Passport Photo';
export const SPOUSE_PASSPORT_PHOTO_HINT = 'Please ensure a clear photo';
export const SPOUSE_PASSPORT_NUMBER_LABEL = 'Review/Fill Spouse Passport Number';
export const SPOUSE_PASSPORT_EXPIRATION_LABEL =
  'Review/Fill Spouse Passport Expiration';
export const PROFILE_SECTION = 'Profile Photo';
export const SPOUSE_UPDATE_PHOTO_LABEL =
  'Spouse - Do you want to update your profile photo?';
export const SPOUSE_PROFILE_TIP_HEADING = 'Profile Photo';
export const SPOUSE_PROFILE_TIP_LEAD =
  'Please upload a photo that resembles the one below.';
export const SPOUSE_PROFILE_TIP_NOTE =
  'Note- Only you in the picture and with a white background.';
export const SPOUSE_PROFILE_TIP_ACCESS =
  'This photo is submitted to local authorities (where applicable) for access.';
export const SPOUSE_PROFILE_PICTURE_LABEL = 'Spouse Profile Picture';
export const SPOUSE_TESTIMONY_LABEL = 'Spouse Testimony';
export const SPOUSE_LANGUAGES_LABEL = 'Spouse Languages';
export const SPOUSE_LANGUAGES_HINT =
  "Select the languages that you can have 'basic conversation' in.";
export const SPOUSE_OTHER_LABEL = "Describe 'Other'";
export const SPOUSE_SKILLS_LABEL = 'Spouse Skills';
export const SPOUSE_SKILLS_HINT = 'Multi-Selector';
export const SPOUSE_MEDICAL_LABEL = 'Medical Condition / Allergies';
export const SPOUSE_MEDICAL_HINT = 'Please note any medical or allergy information';
export const FILE_DROP_LEAD = 'Drag & drop a file or';
export const FILE_BROWSE = 'browse';

export const SPOUSE_GENDER_OPTIONS = [
  { id: 'male', label: 'Male' },
  { id: 'female', label: 'Female' },
] as const;

export const SPOUSE_LANGUAGE_OPTIONS = LANGUAGE_OPTIONS;
export const SPOUSE_SKILL_OPTIONS = SKILL_OPTIONS;

export const emptySpouseApplication = (): VolunteerSpouseApplication => ({
  spouseJoining: '',
  name: '',
  email: '',
  phone: '',
  previousVolunteer: '',
  lastTermDate: '',
  birthdate: '',
  gender: '',
  passportUpdated: '',
  passportPhotoFileName: '',
  passportNumber: '',
  passportExpiration: '',
  updateProfilePhoto: '',
  profilePhotoFileName: '',
  testimony: '',
  languages: [],
  otherLanguage: '',
  skills: [],
  otherSkills: '',
  medical: '',
});

export function isSpouseApplicationComplete(
  draft: VolunteerSpouseApplication,
): boolean {
  if (draft.spouseJoining === 'no') return true;
  if (draft.spouseJoining !== 'yes') return false;
  if (
    draft.name.trim().length === 0 ||
    draft.email.trim().length === 0 ||
    draft.phone.trim().length === 0 ||
    (draft.previousVolunteer !== 'yes' && draft.previousVolunteer !== 'no') ||
    draft.birthdate.trim().length === 0 ||
    !SPOUSE_GENDER_OPTIONS.some((option) => option.id === draft.gender) ||
    draft.passportPhotoFileName.trim().length === 0 ||
    draft.passportNumber.trim().length === 0 ||
    draft.passportExpiration.trim().length === 0 ||
    (draft.updateProfilePhoto !== 'yes' && draft.updateProfilePhoto !== 'no') ||
    draft.profilePhotoFileName.trim().length === 0 ||
    draft.testimony.trim().length === 0 ||
    draft.languages.length === 0 ||
    draft.skills.length === 0
  ) {
    return false;
  }
  if (
    draft.previousVolunteer === 'yes' &&
    draft.lastTermDate.trim().length === 0
  ) {
    return false;
  }
  if (draft.languages.includes('Other') && draft.otherLanguage.trim().length === 0) {
    return false;
  }
  if (draft.skills.includes('Other') && draft.otherSkills.trim().length === 0) {
    return false;
  }
  return true;
}
