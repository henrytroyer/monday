export const GETTING_STARTED_BANNER = 'A few things to get started...';

export const FULL_NAME_LABEL = 'Your Full Name (No middle name, please)';
export const FULL_NAME_HINT = 'Legal First and Last name';

export const FIRST_NAME_LABEL = 'Your First Name Only';
export const FIRST_NAME_HINT = 'We will use this for communications';

export const EMAIL_LABEL = 'Your Email';
export const EMAIL_HINT = 'Verify Accuracy';

export const PREVIOUS_VOLUNTEER_LABEL =
  'Have you volunteered with i58 previously?';

export const PREVIOUS_YES_NOTE =
  "Note- If married and one of you has been a previous volunteer, please select 'Yes'";

export const PREVIOUS_NO_NOTE =
  "Note- If you have never filled out an application, please select 'No'";
export const PREVIOUS_NO_EXAMPLE =
  'For example- your family served with i58, but you did not get registered to work in camp.';

export const RETURNING_VOLUNTEER_HOLD =
  'Returning volunteer steps come next.';

export const NO_PATH_PLACEHOLDER_TITLE = 'Next form coming next';
export const NO_PATH_PLACEHOLDER_BODY =
  'This is the new-volunteer path. The next form will appear here when it is ready.';

export type PreviousVolunteerAnswer = 'yes' | 'no';

export interface GettingStartedDraft {
  fullName: string;
  firstName: string;
  email: string;
  previousVolunteer: PreviousVolunteerAnswer | '';
}

export function isGettingStartedComplete(draft: GettingStartedDraft): boolean {
  return (
    draft.fullName.trim().length > 0 &&
    draft.firstName.trim().length > 0 &&
    draft.email.trim().includes('@') &&
    (draft.previousVolunteer === 'yes' || draft.previousVolunteer === 'no')
  );
}

export function canContinueNoPath(draft: GettingStartedDraft): boolean {
  return isGettingStartedComplete(draft) && draft.previousVolunteer === 'no';
}
