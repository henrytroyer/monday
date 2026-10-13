import type { VolunteerHistorySkillsLanguages } from '../contract/volunteerApi';

export const HISTORY_BANNER = 'History';
export const MEDICAL_LABEL = 'Medical Condition / Allergy';
export const MEDICAL_HINT =
  'Please note any medical or allergy information; If applicable';
export const TRAVEL_LABEL = 'Have you travelled internationally before?';
export const HEAR_ABOUT_LABEL = 'How did you hear about i58?';
export const FRIEND_NAME_LABEL = 'Name of friend/sibling/family member';
export const WHY_VOLUNTEER_LABEL = 'Why do you want to volunteer?';
export const WHY_VOLUNTEER_HINT =
  'In one paragraph or less, describe why you want to serve.';
export const TESTIMONY_LABEL = 'Personal Testimony';
export const TESTIMONY_HINT =
  'Briefly describe your personal testimony and relationship with Jesus Christ. Include information about your conversion and present spiritual life.';

export const SKILLS_BANNER = 'Skills';
export const OCCUPATION_LABEL = 'What is your current occupation?';
export const YOUR_SKILLS_LABEL = 'Your Skills';
export const YOUR_SKILLS_HINT = 'Multi-Selector';
export const OTHER_SKILLS_LABEL = 'Other skills';
export const OTHER_SKILLS_HINT = 'If applicable';
export const LEADERSHIP_LABEL =
  'Are you able and willing to be a team leader or serve in a leadership position?';
export const LEADERSHIP_EXPERIENCE_LABEL = 'Leadership Experience';

export const LANGUAGES_BANNER = 'Languages';
export const LANGUAGES_LABEL = 'Languages';
export const LANGUAGES_HINT =
  'List Language(s) that you can hold a basic conversation';
export const OTHER_LANGUAGE_LABEL = 'Other Language';

export const HEAR_ABOUT_OPTIONS = [
  {
    id: 'church',
    label: 'Church Presentation/missions conference',
  },
  { id: 'friend', label: 'Friend' },
  { id: 'online', label: 'Online' },
  { id: 'sibling', label: 'Sibling/family member' },
] as const;

/** Preview option list — source form choices were not in the screenshots. */
export const SKILL_OPTIONS = [
  'Construction',
  'Cooking',
  'Teaching',
  'Childcare',
  'Medical',
  'Music',
  'Driving',
  'Administration',
  'Other',
] as const;

/** Preview option list — source form choices were not in the screenshots. */
export const LANGUAGE_OPTIONS = [
  'English',
  'German',
  'Greek',
  'Arabic',
  'Farsi',
  'French',
  'Spanish',
  'Other',
] as const;

/** Preview option list — source form choices were not in the screenshots. */
export const LEADERSHIP_EXPERIENCE_OPTIONS = [
  'None',
  'Less than 1 year',
  '1-2 years',
  '3 or more years',
] as const;

export const REFERRAL_HEAR_ABOUT_IDS = ['friend', 'sibling'] as const;

export const emptyHistorySkillsLanguages =
  (): VolunteerHistorySkillsLanguages => ({
    medical: '',
    travelledInternationally: '',
    heardAbout: [],
    friendName: '',
    whyVolunteer: '',
    testimony: '',
    occupation: '',
    skills: [],
    otherSkills: '',
    leadership: '',
    leadershipExperience: '',
    languages: [],
    otherLanguage: '',
  });

export function needsReferralName(heardAbout: string[]): boolean {
  return REFERRAL_HEAR_ABOUT_IDS.some((id) => heardAbout.includes(id));
}

export function isHistorySkillsLanguagesComplete(
  draft: VolunteerHistorySkillsLanguages,
): boolean {
  if (
    draft.medical.trim().length === 0 ||
    (draft.travelledInternationally !== 'yes' &&
      draft.travelledInternationally !== 'no') ||
    draft.heardAbout.length === 0 ||
    draft.whyVolunteer.trim().length === 0 ||
    draft.testimony.trim().length === 0 ||
    draft.occupation.trim().length === 0 ||
    draft.skills.length === 0 ||
    (draft.leadership !== 'yes' && draft.leadership !== 'no') ||
    draft.languages.length === 0
  ) {
    return false;
  }
  if (needsReferralName(draft.heardAbout) && draft.friendName.trim().length === 0) {
    return false;
  }
  if (draft.skills.includes('Other') && draft.otherSkills.trim().length === 0) {
    return false;
  }
  if (
    draft.leadership === 'yes' &&
    draft.leadershipExperience.trim().length === 0
  ) {
    return false;
  }
  if (draft.languages.includes('Other') && draft.otherLanguage.trim().length === 0) {
    return false;
  }
  return true;
}
