/**
 * Remove this file, the home arrows, and the README note before production.
 * The arrows only change which homepage is on screen. They never write the account.
 */

import {
  ONBOARDING_STEP_DEFAULTS,
  type OnboardingStep,
  type PreparationDocumentId,
  type VolunteerApplicationStatus,
  type VolunteerStep,
} from '../contract/volunteerApi';
import {
  documentIsAccepted,
  documentIsEdited,
  documentProgress,
  isPreparationDocument,
} from './preparationDocuments';
import { finalChecklistProgress } from './finalChecklist';
import { showWelcomeHome } from './portalSession';

/** Turn this off and delete the arrow control before production. */
export const PREVIEW_HOME_STEPPER = true;

export const PREVIEW_HOME_COUNT = 5;

export const PREVIEW_HOME_LABELS = [
  'Welcome',
  'Application',
  'Submitted',
  'Preparation',
  'Arrived',
] as const;

export type PreviewHomeIndex = 0 | 1 | 2 | 3 | 4;

const GUIDELINES = 'guidelines';

/** Seven of the ten preparation bubbles: two-thirds, rounded to the nearest step. */
const PREVIEW_PREPARATION_FILLED = Math.round((ONBOARDING_STEP_DEFAULTS.length * 2) / 3);

function withEveryStepComplete(me: VolunteerApplicationStatus): VolunteerApplicationStatus {
  return {
    ...me,
    steps: me.steps.map((step) => ({ ...step, status: 'complete' })),
  };
}

function withPreparationFilled(me: VolunteerApplicationStatus): VolunteerApplicationStatus {
  return {
    ...withEveryStepComplete(me),
    onboardingSteps: ONBOARDING_STEP_DEFAULTS.map((step, index) =>
      preparationPreviewStep(me, step, index),
    ),
  };
}

function preparationPreviewStep(
  me: VolunteerApplicationStatus,
  step: (typeof ONBOARDING_STEP_DEFAULTS)[number],
  index: number,
): OnboardingStep {
  if (isPreparationDocument(step.id)) {
    return documentPreviewStep(me, step.id, step.title, index);
  }
  if (step.id === 'final_checklist') {
    return finalChecklistPreviewStep(me, step.title);
  }
  return {
    id: step.id,
    title: step.title,
    status: index < PREVIEW_PREPARATION_FILLED ? 'complete' : 'not_started',
  };
}

function finalChecklistPreviewStep(
  me: VolunteerApplicationStatus,
  title: string,
): OnboardingStep {
  const progress = finalChecklistProgress(me.finalChecklistChecked);
  if (progress >= 100) return { id: 'final_checklist', title, status: 'complete' };
  return {
    id: 'final_checklist',
    title,
    status: 'not_started',
    ...(progress > 0 ? { progress } : {}),
  };
}

function documentPreviewStep(
  me: VolunteerApplicationStatus,
  id: PreparationDocumentId,
  title: string,
  index: number,
): OnboardingStep {
  const draft = me.preparationDocuments?.[id];
  if (!documentIsEdited(draft)) {
    return {
      id,
      title,
      status: index < PREVIEW_PREPARATION_FILLED ? 'received' : 'not_started',
    };
  }
  if (documentIsAccepted(me, id)) return { id, title, status: 'received' };
  return {
    id,
    title,
    status: draft?.submitted ? 'waiting' : 'not_started',
    progress: draft ? documentProgress(draft) : 0,
  };
}

function withGuidelines(
  me: VolunteerApplicationStatus,
  status: VolunteerStep['status'],
): VolunteerApplicationStatus {
  return {
    ...me,
    steps: me.steps.map((step) => (step.id === GUIDELINES ? { ...step, status } : step)),
  };
}

/** Which homepage this account is actually on. */
export function homeIndexFor(me: VolunteerApplicationStatus): PreviewHomeIndex {
  if (me.arrivedInEurope) return 4;
  const submitted = me.steps.some((step) => step.id === GUIDELINES && step.status === 'complete');
  if (submitted && me.onboardingRevealed) return 3;
  if (submitted) return 2;
  if (showWelcomeHome(me)) return 0;
  return 1;
}

/** A display copy for one homepage. The saved account is left unchanged. */
export function previewHomeStatus(
  me: VolunteerApplicationStatus,
  index: PreviewHomeIndex,
): VolunteerApplicationStatus {
  if (index === 0) {
    return {
      ...me,
      applicationStarted: false,
      onboardingRevealed: false,
      arrivedInEurope: false,
      steps: me.steps.map((step) => ({ ...step, status: 'not_started' })),
    };
  }
  if (index === 1) {
    return {
      ...withEveryStepComplete(me),
      applicationStarted: true,
      onboardingRevealed: false,
      arrivedInEurope: false,
    };
  }
  if (index === 2) {
    return {
      ...withGuidelines(me, 'complete'),
      applicationStarted: true,
      onboardingRevealed: false,
      arrivedInEurope: false,
    };
  }
  if (index === 3) {
    return {
      ...withPreparationFilled(me),
      applicationStarted: true,
      onboardingRevealed: true,
      arrivedInEurope: false,
    };
  }
  return { ...me, arrivedInEurope: true };
}
