import type {
  OnboardingStep,
  OnboardingStepId,
  ShortTermStepId,
  VolunteerApplicationStatus,
} from '../contract/volunteerApi';
import {
  ONBOARDING_STEP_DEFAULTS,
  ONBOARDING_STEP_IDS,
  SHORT_TERM_STEP_DEFAULTS,
} from '../contract/volunteerApi';
import { stepFillPercent } from './formProgress';

export type OnboardingWaterTone = 'blue' | 'green' | 'orange';

/** Guidelines Submit marks that step complete. That is the post-submit trigger. */
export function applicationIsSubmitted(me: VolunteerApplicationStatus): boolean {
  return me.steps.some(
    (step) => step.id === 'guidelines' && step.status === 'complete',
  );
}

export function resolveOnboardingSteps(
  me: VolunteerApplicationStatus,
): OnboardingStep[] {
  return ONBOARDING_STEP_DEFAULTS.map((step) => {
    const live = me.onboardingSteps?.find((item) => item.id === step.id);
    return {
      id: step.id,
      title: step.title,
      status: live?.status ?? 'not_started',
    };
  });
}

/** First post-submit step that staff have not marked received or complete. */
export function nextOnboardingStep(
  me: VolunteerApplicationStatus,
): OnboardingStep | null {
  return (
    resolveOnboardingSteps(me).find(
      (step) => step.status !== 'complete' && step.status !== 'received',
    ) ?? null
  );
}

/** Full water only after staff mark the step received or complete. */
export function onboardingFillPercent(step: OnboardingStep): number {
  return step.status === 'complete' || step.status === 'received' ? 100 : 0;
}

const PROCESS_STEP_COUNT =
  SHORT_TERM_STEP_DEFAULTS.length + ONBOARDING_STEP_DEFAULTS.length;

/** One step occupies an equal share of the departure ring. */
const STEP_ARC = 100 / PROCESS_STEP_COUNT;

/** How many preparation steps the home preview paints as finished. */
const PREVIEW_PREPARATION_FILLED = 8;

function applicationStepFill(
  me: VolunteerApplicationStatus,
  id: ShortTermStepId,
): number {
  const live = me.steps.find((item) => item.id === id);
  if (live?.status === 'complete' || live?.status === 'received') return 100;
  return stepFillPercent(me, id);
}

/**
 * Share of the whole journey finished, from Getting Started through Final check-list.
 * Application drafts count; a received or complete step counts as finished.
 */
export function processCompletionPercent(me: VolunteerApplicationStatus): number {
  const application = SHORT_TERM_STEP_DEFAULTS.reduce(
    (sum, step) => sum + applicationStepFill(me, step.id),
    0,
  );
  const preparation = resolveOnboardingSteps(me).reduce(
    (sum, step) => sum + onboardingFillPercent(step),
    0,
  );
  return Math.round((application + preparation) / PROCESS_STEP_COUNT);
}

export interface ProcessRingSegment {
  tone: OnboardingWaterTone;
  start: number;
  length: number;
}

/**
 * Colored slices of the departure ring. Each step keeps its own place on the
 * circle. Finished steps before Acceptance are blue, Acceptance is green, and
 * later finished steps are orange.
 */
export function processCompletionSegments(
  me: VolunteerApplicationStatus,
): ProcessRingSegment[] {
  const slices: ProcessRingSegment[] = [];
  SHORT_TERM_STEP_DEFAULTS.forEach((step, index) => {
    const length = (applicationStepFill(me, step.id) / 100) * STEP_ARC;
    if (length > 0) slices.push({ tone: 'blue', start: index * STEP_ARC, length });
  });
  resolveOnboardingSteps(me).forEach((step, index) => {
    const length = (onboardingFillPercent(step) / 100) * STEP_ARC;
    if (length > 0) {
      slices.push({
        tone: onboardingWaterTone(step.id),
        start: (SHORT_TERM_STEP_DEFAULTS.length + index) * STEP_ARC,
        length,
      });
    }
  });
  return mergeRingSegments(slices);
}

function mergeRingSegments(slices: ProcessRingSegment[]): ProcessRingSegment[] {
  const merged: ProcessRingSegment[] = [];
  for (const slice of slices) {
    const last = merged[merged.length - 1];
    if (last && last.tone === slice.tone && last.start + last.length === slice.start) {
      last.length += slice.length;
      continue;
    }
    merged.push({ ...slice });
  }
  return merged;
}

/**
 * Home preview: the application is finished and the first eight preparation
 * steps are finished, through Flights. Team Training and Final check-list stay open.
 */
export function previewDepartureProgress(
  me: VolunteerApplicationStatus,
): VolunteerApplicationStatus {
  return {
    ...me,
    onboardingRevealed: true,
    steps: me.steps.map((step) => ({ ...step, status: 'complete' })),
    onboardingSteps: ONBOARDING_STEP_DEFAULTS.map((step, index) => ({
      id: step.id,
      title: step.title,
      status: index < PREVIEW_PREPARATION_FILLED ? 'complete' : 'not_started',
    })),
  };
}

/** Steps before Acceptance are blue, Acceptance is green, and later steps are orange. */
export function onboardingWaterTone(id: OnboardingStepId): OnboardingWaterTone {
  const index = ONBOARDING_STEP_IDS.indexOf(id);
  const acceptance = ONBOARDING_STEP_IDS.indexOf('acceptance');
  if (index < acceptance) return 'blue';
  if (index === acceptance) return 'green';
  return 'orange';
}

export function revealOnboarding(
  me: VolunteerApplicationStatus,
): VolunteerApplicationStatus {
  return {
    ...me,
    onboardingRevealed: true,
    onboardingSteps: resolveOnboardingSteps(me),
  };
}
