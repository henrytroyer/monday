import type { ShortTermStepId } from '../contract/volunteerApi';

/**
 * Temporary editing aid: any volunteer form step is open from the process list.
 * Set to `false` to restore linear access (finish the previous form first).
 */
export const PREVIEW_OPEN_ANY_STEP = true;

export type VolunteerFormView =
  | 'advice'
  | 'getting-started'
  | 'general-information'
  | 'passport-details'
  | 'profile-photo'
  | 'history-skills-languages'
  | 'family-status'
  | 'spouse-application'
  | 'term-of-service'
  | 'other-contacts'
  | 'guidelines';

export function previewViewForStep(
  id: ShortTermStepId,
): VolunteerFormView | null {
  switch (id) {
    case 'application_received':
      return 'advice';
    case 'pastor_reference':
      return 'general-information';
    case 'in_review':
      return 'passport-details';
    case 'background_check':
      return 'profile-photo';
    case 'child_safeguarding':
      return 'history-skills-languages';
    case 'approved':
      return 'family-status';
    case 'flight_info':
      return 'spouse-application';
    case 'invoice':
      return 'term-of-service';
    case 'sent_to_field':
      return 'other-contacts';
    case 'guidelines':
      return 'guidelines';
    default:
      return null;
  }
}

/** When preview unlock is off, only Getting Started is open from the list. */
export function canOpenProcessStep(
  id: ShortTermStepId,
  previewOpenAnyStep = PREVIEW_OPEN_ANY_STEP,
): boolean {
  const view = previewViewForStep(id);
  if (!view) return false;
  if (previewOpenAnyStep) return true;
  return id === 'application_received';
}
