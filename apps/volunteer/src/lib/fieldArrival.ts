import type { VolunteerApplicationStatus } from '../contract/volunteerApi';
import { onboardingFillPercent, resolveOnboardingSteps } from './onboarding';
import { fieldPortalOpensAt } from './teamDates';

/** Shown beside the preparation heading once Team Training is filled. */
export const FIELD_ARRIVAL_NOTICE =
  'The On-Field Volunteer Page will appear the day after you depart.';

/** setTimeout delays are clamped to a 32-bit signed integer. */
export const MAX_ARRIVAL_WAIT_MS = 2_147_483_647;

export { fieldPortalOpensAt };

export function hasLandedInEurope(
  me: VolunteerApplicationStatus,
  now = new Date(),
): boolean {
  const opens = fieldPortalOpensAt(me);
  if (!opens) return false;
  return now.getTime() >= opens.getTime();
}

/** The notice stays up on the preparation page once Team Training is full. */
export function showFieldArrivalNotice(me: VolunteerApplicationStatus): boolean {
  if (me.arrivedInEurope) return false;
  const training = resolveOnboardingSteps(me).find((step) => step.id === 'team_training');
  return training != null && onboardingFillPercent(training) === 100;
}

export function arrivalWaitMs(opens: Date, now = new Date()): number {
  return Math.min(Math.max(0, opens.getTime() - now.getTime()), MAX_ARRIVAL_WAIT_MS);
}
