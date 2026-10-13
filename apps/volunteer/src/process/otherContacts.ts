import type { VolunteerOtherContacts } from '../contract/volunteerApi';

export const OTHER_CONTACTS_BANNER = 'Other Contacts';
export const CHURCH_INFO_SECTION = 'Church Info';
export const CHURCH_NAME_LABEL = 'Church Name';
export const PASTOR_NAME_LABEL = "Pastor's first and last name";
export const PASTOR_NAME_HINT = 'We may contact this person for reference information';
export const PASTOR_EMAIL_LABEL = "Pastor's Email";
export const PASTOR_EMAIL_HINT = 'Verify Accuracy';
export const PASTOR_PHONE_LABEL = "Pastor's Phone";
export const PHONE_HINT = 'Enter without dashes and slashes';

export const PARENTS_INFO_SECTION = 'Parents Info';
export const PARENTS_ENTRY_NOTE_LEAD = 'Please enter as: Frank and Mary';
export const PARENTS_ENTRY_NOTE_EMPHASIS = '*without last names';
export const PARENTS_NAMES_LABEL = 'Parents Names';
export const PARENTS_NAMES_HINT =
  'Please be advised, we may contact this person for reference information';
export const PARENT_EMAIL_LABEL = "Parent's Email";
export const PARENT_PHONE_LABEL = "Parent's Phone Number";

export const EMERGENCY_INFO_SECTION = 'Emergency Contact Info';
export const EMERGENCY_NAME_LABEL = 'Full Name of Emergency Contact';
export const EMERGENCY_EMAIL_LABEL = 'Emergency Contact Email Address';
export const EMERGENCY_PHONE_LABEL = 'Emergency Contact Phone Number';
export const EMERGENCY_RELATION_LABEL = 'Emergency Contact Relation';

export const ACCOUNTABILITY_INFO_SECTION = 'Accountability Info';
export const ACCOUNTABLE_NAME_LABEL = 'Person You Are Accountable To';
export const ACCOUNTABLE_NAME_HINT =
  'Please be advised, we may contact this person for reference information';
export const ACCOUNTABLE_AUTOFILL_LINE_1 =
  'This is auto-filled from Parents names.';
export const ACCOUNTABLE_AUTOFILL_LINE_2 =
  'Please update if you are accountable to someone else';
export const ACCOUNTABLE_EMAIL_LABEL =
  'Person You Are Accountable To Email Address';
export const ACCOUNTABLE_PHONE_LABEL =
  'Person You Are Accountable To Phone Number';
export const FIELD_CONTACT_LABEL =
  'Were you in direct contact with anyone on the field?';
export const FIELD_CONTACT_HINT =
  'Please do not include any communication with stateside coordinators. (info@i58global.org)';
export const FIELD_CONTACT_NAME_LABEL = 'Name of person you are in contact with';
export const EMAIL_HINT = 'Verify Accuracy';

export const EMERGENCY_RELATION_OPTIONS = [
  'Friend',
  'Other Family Member',
  'Parent',
  'Sibling',
  'Volunteer',
] as const;

export const emptyOtherContacts = (): VolunteerOtherContacts => ({
  churchName: '',
  pastorName: '',
  pastorEmail: '',
  pastorPhone: '',
  parentsNames: '',
  parentEmail: '',
  parentPhone: '',
  emergencyName: '',
  emergencyEmail: '',
  emergencyPhone: '',
  emergencyRelation: [],
  accountableName: '',
  accountableEmail: '',
  accountablePhone: '',
  fieldContact: '',
  fieldContactName: '',
});

export function isOtherContactsComplete(draft: VolunteerOtherContacts): boolean {
  if (
    draft.churchName.trim().length === 0 ||
    draft.pastorName.trim().length === 0 ||
    draft.pastorEmail.trim().length === 0 ||
    draft.pastorPhone.trim().length === 0 ||
    draft.parentsNames.trim().length === 0 ||
    draft.parentEmail.trim().length === 0 ||
    draft.parentPhone.trim().length === 0 ||
    draft.emergencyName.trim().length === 0 ||
    draft.emergencyEmail.trim().length === 0 ||
    draft.emergencyPhone.trim().length === 0 ||
    draft.emergencyRelation.length === 0 ||
    draft.accountableName.trim().length === 0 ||
    draft.accountableEmail.trim().length === 0 ||
    draft.accountablePhone.trim().length === 0 ||
    (draft.fieldContact !== 'yes' && draft.fieldContact !== 'no')
  ) {
    return false;
  }
  if (draft.fieldContact === 'yes' && draft.fieldContactName.trim().length === 0) {
    return false;
  }
  return true;
}
