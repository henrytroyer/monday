import {
  SHORT_TERM_STEP_DEFAULTS,
  type ShortTermStepId,
  type VolunteerStep,
} from '../contract/volunteerApi';

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

export type ApplicationStepBackLabel = 'Back' | 'Home';

/** Home leaves the step. Back returns to an earlier page of the same step. */
export function applicationStepBackLabel(view: VolunteerFormView): ApplicationStepBackLabel {
  return view === 'getting-started' ? 'Back' : 'Home';
}

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

/**
 * Mock only. Set this to false before production.
 * While it is true, any application step can be opened.
 * At launch, a step opens only after the one before it is finished.
 */
export const PREVIEW_OPEN_ANY_STEP = true;

/** The volunteer has submitted this step, or the team already has it. */
export function stepIsFinished(status: VolunteerStep['status']): boolean {
  return status === 'complete' || status === 'received';
}

/**
 * A step opens only after the one before it is finished. The first step is always open.
 * Pass `false` to test the launch rule. The portal uses `PREVIEW_OPEN_ANY_STEP`.
 */
export function canOpenProcessStep(
  id: ShortTermStepId,
  steps: readonly Pick<VolunteerStep, 'id' | 'status'>[],
  openAnyStep = PREVIEW_OPEN_ANY_STEP,
): boolean {
  const view = previewViewForStep(id);
  if (!view) return false;
  if (openAnyStep) return true;
  const order = SHORT_TERM_STEP_DEFAULTS.map((step) => step.id);
  const index = order.indexOf(id);
  if (index <= 0) return true;
  const previous = steps.find((step) => step.id === order[index - 1]);
  return previous ? stepIsFinished(previous.status) : false;
}
