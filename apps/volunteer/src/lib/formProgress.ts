import type {
  ShortTermStepId,
  VolunteerApplicationStatus,
  VolunteerFamilyStatus,
  VolunteerGeneralInformation,
  VolunteerGuidelines,
  VolunteerHistorySkillsLanguages,
  VolunteerOtherContacts,
  VolunteerPassportDetails,
  VolunteerProfilePhoto,
  VolunteerSpouseApplication,
  VolunteerTermOfService,
} from '../contract/volunteerApi';
import type { GettingStartedDraft } from '../process/gettingStarted';
import { needsReferralName } from '../process/historySkillsLanguages';
import { MARITAL_STATUS_OPTIONS } from '../process/familyStatus';
import { SPOUSE_GENDER_OPTIONS } from '../process/spouseApplication';

function ratio(checks: boolean[]): number {
  if (checks.length === 0) return 0;
  const filled = checks.filter(Boolean).length;
  return Math.round((filled / checks.length) * 100);
}

function filled(value: string): boolean {
  return value.trim().length > 0;
}

export function gettingStartedProgress(draft: GettingStartedDraft): number {
  return ratio([
    filled(draft.fullName),
    filled(draft.firstName),
    draft.email.trim().includes('@'),
    draft.previousVolunteer === 'yes' || draft.previousVolunteer === 'no',
  ]);
}

export function generalInformationProgress(
  draft: VolunteerGeneralInformation,
): number {
  return ratio([
    draft.gender === 'male' || draft.gender === 'female',
    filled(draft.birthdate),
    filled(draft.phone),
    filled(draft.street),
    filled(draft.city),
    filled(draft.state),
    filled(draft.postalCode),
    filled(draft.country),
  ]);
}

export function passportDetailsProgress(draft: VolunteerPassportDetails): number {
  return ratio([
    filled(draft.photoFileName),
    filled(draft.passportNumber),
    filled(draft.expirationDate),
  ]);
}

export function profilePhotoProgress(draft: VolunteerProfilePhoto): number {
  return filled(draft.photoFileName) ? 100 : 0;
}

export function historySkillsLanguagesProgress(
  draft: VolunteerHistorySkillsLanguages,
): number {
  const checks = [
    filled(draft.medical),
    draft.travelledInternationally === 'yes' || draft.travelledInternationally === 'no',
    draft.heardAbout.length > 0,
    filled(draft.whyVolunteer),
    filled(draft.testimony),
    filled(draft.occupation),
    draft.skills.length > 0,
    draft.leadership === 'yes' || draft.leadership === 'no',
    draft.languages.length > 0,
  ];
  if (needsReferralName(draft.heardAbout)) checks.push(filled(draft.friendName));
  if (draft.skills.includes('Other')) checks.push(filled(draft.otherSkills));
  if (draft.leadership === 'yes') checks.push(filled(draft.leadershipExperience));
  if (draft.languages.includes('Other')) checks.push(filled(draft.otherLanguage));
  return ratio(checks);
}

export function familyStatusProgress(draft: VolunteerFamilyStatus): number {
  const checks = [
    MARITAL_STATUS_OPTIONS.some((option) => option.id === draft.maritalStatus),
    draft.childrenComing === 'yes' || draft.childrenComing === 'no',
  ];
  if (draft.childrenComing === 'yes') checks.push(filled(draft.familyMembers));
  return ratio(checks);
}

export function spouseApplicationProgress(draft: VolunteerSpouseApplication): number {
  if (draft.spouseJoining === 'no') return 100;
  if (draft.spouseJoining !== 'yes') return 0;
  const checks = [
    filled(draft.name),
    filled(draft.email),
    filled(draft.phone),
    draft.previousVolunteer === 'yes' || draft.previousVolunteer === 'no',
    filled(draft.birthdate),
    SPOUSE_GENDER_OPTIONS.some((option) => option.id === draft.gender),
    filled(draft.passportPhotoFileName),
    filled(draft.passportNumber),
    filled(draft.passportExpiration),
    draft.updateProfilePhoto === 'yes' || draft.updateProfilePhoto === 'no',
    filled(draft.profilePhotoFileName),
    filled(draft.testimony),
    draft.languages.length > 0,
    draft.skills.length > 0,
  ];
  if (draft.previousVolunteer === 'yes') checks.push(filled(draft.lastTermDate));
  if (draft.languages.includes('Other')) checks.push(filled(draft.otherLanguage));
  if (draft.skills.includes('Other')) checks.push(filled(draft.otherSkills));
  return ratio(checks);
}

export function termOfServiceProgress(draft: VolunteerTermOfService): number {
  const checks = [
    draft.locationPreferences.length > 0,
    draft.lengthOfTerm === '3-months' || draft.lengthOfTerm === 'other',
    filled(draft.preferredDates),
    filled(draft.nearbyAirport),
  ];
  if (draft.lengthOfTerm === 'other') checks.push(filled(draft.otherTerm));
  return ratio(checks);
}

export function otherContactsProgress(draft: VolunteerOtherContacts): number {
  const checks = [
    filled(draft.churchName),
    filled(draft.pastorName),
    filled(draft.pastorEmail),
    filled(draft.pastorPhone),
    filled(draft.parentsNames),
    filled(draft.parentEmail),
    filled(draft.parentPhone),
    filled(draft.emergencyName),
    filled(draft.emergencyEmail),
    filled(draft.emergencyPhone),
    draft.emergencyRelation.length > 0,
    filled(draft.accountableName),
    filled(draft.accountableEmail),
    filled(draft.accountablePhone),
    draft.fieldContact === 'yes' || draft.fieldContact === 'no',
  ];
  if (draft.fieldContact === 'yes') checks.push(filled(draft.fieldContactName));
  return ratio(checks);
}

export function guidelinesProgress(draft: VolunteerGuidelines): number {
  return draft.agreed ? 100 : 0;
}

/** 100 when the step is submitted. Otherwise the share of that form already saved. */
export function stepFillPercent(
  me: VolunteerApplicationStatus,
  id: ShortTermStepId,
): number {
  const step = me.steps.find((item) => item.id === id);
  if (step?.status === 'complete') return 100;
  switch (id) {
    case 'application_received':
      return me.gettingStarted ? gettingStartedProgress(me.gettingStarted) : 0;
    case 'pastor_reference':
      return me.generalInformation
        ? generalInformationProgress(me.generalInformation)
        : 0;
    case 'in_review':
      return me.passportDetails ? passportDetailsProgress(me.passportDetails) : 0;
    case 'background_check':
      return me.profilePhoto ? profilePhotoProgress(me.profilePhoto) : 0;
    case 'child_safeguarding':
      return me.historySkillsLanguages
        ? historySkillsLanguagesProgress(me.historySkillsLanguages)
        : 0;
    case 'approved':
      return me.familyStatus ? familyStatusProgress(me.familyStatus) : 0;
    case 'flight_info':
      return me.spouseApplication
        ? spouseApplicationProgress(me.spouseApplication)
        : 0;
    case 'invoice':
      return me.termOfService ? termOfServiceProgress(me.termOfService) : 0;
    case 'sent_to_field':
      return me.otherContacts ? otherContactsProgress(me.otherContacts) : 0;
    case 'guidelines':
      return me.guidelines ? guidelinesProgress(me.guidelines) : 0;
    default:
      return 0;
  }
}
