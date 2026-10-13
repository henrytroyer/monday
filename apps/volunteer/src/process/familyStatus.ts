import type { VolunteerFamilyStatus } from '../contract/volunteerApi';

export const FAMILY_STATUS_BANNER = 'Family Status';
export const MARITAL_STATUS_LABEL = 'Marital Status';
export const CHILDREN_COMING_LABEL =
  'Do you have children that will be coming with you?';
export const CHILDREN_18_HEADING = 'Children 18yrs+';
export const CHILDREN_18_NOTE =
  'Any children over 18 years old must fill out their own application';
export const FAMILY_MEMBERS_LABEL =
  'List all family members who will be coming with you: Name, Age, Gender.';
export const FAMILY_MEMBERS_HINT = 'Example- Jane, 3, Female';

export const MARITAL_STATUS_OPTIONS = [
  { id: 'single', label: 'Single' },
  { id: 'dating', label: 'Dating' },
  { id: 'engaged', label: 'Engaged' },
  { id: 'married', label: 'Married' },
] as const;

export const emptyFamilyStatus = (): VolunteerFamilyStatus => ({
  maritalStatus: '',
  childrenComing: '',
  familyMembers: '',
});

export function isFamilyStatusComplete(draft: VolunteerFamilyStatus): boolean {
  const maritalOk = MARITAL_STATUS_OPTIONS.some(
    (option) => option.id === draft.maritalStatus,
  );
  if (!maritalOk) return false;
  if (draft.childrenComing !== 'yes' && draft.childrenComing !== 'no') {
    return false;
  }
  if (draft.childrenComing === 'yes' && draft.familyMembers.trim().length === 0) {
    return false;
  }
  return true;
}
