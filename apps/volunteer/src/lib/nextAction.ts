import type {
  VolunteerApplicationStatus,
  VolunteerStep,
} from '../contract/volunteerApi';

/** First step the volunteer still needs to act on (not complete/received). */
export function nextVolunteerAction(
  me: VolunteerApplicationStatus,
): VolunteerStep | null {
  return (
    me.steps.find(
      (step) =>
        Boolean(step.youDo) &&
        step.status !== 'complete' &&
        step.status !== 'received',
    ) ?? null
  );
}
