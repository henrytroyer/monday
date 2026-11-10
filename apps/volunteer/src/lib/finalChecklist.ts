import type { VolunteerApplicationStatus } from '../contract/volunteerApi';
import { resolveOnboardingSteps } from './onboarding';

export const FINAL_CHECKLIST_ITEMS = [
  { id: 'passport', label: 'Passport' },
  { id: 'payment', label: 'Payment method' },
  { id: 'clothing', label: 'Season-appropriate clothing' },
] as const;

export const FINAL_CHECKLIST_SEASON_NOTE = 'Summer and winter packing differ.';

export function finalChecklistIsComplete(
  checked: readonly string[] | undefined,
): boolean {
  return FINAL_CHECKLIST_ITEMS.every((item) => checked?.includes(item.id));
}

/** Share of the Final check-list bubble filled by the items that are checked. */
export function finalChecklistProgress(checked: readonly string[] | undefined): number {
  const done = FINAL_CHECKLIST_ITEMS.filter((item) => checked?.includes(item.id)).length;
  return Math.round((done / FINAL_CHECKLIST_ITEMS.length) * 100);
}

export function withFinalChecklist(
  me: VolunteerApplicationStatus,
  checked: readonly string[],
): VolunteerApplicationStatus {
  const complete = finalChecklistIsComplete(checked);
  const progress = finalChecklistProgress(checked);
  return {
    ...me,
    finalChecklistChecked: checked,
    onboardingSteps: resolveOnboardingSteps(me).map((step) =>
      step.id === 'final_checklist'
        ? {
            ...step,
            status: complete ? 'complete' : 'not_started',
            progress: complete || progress === 0 ? undefined : progress,
          }
        : step,
    ),
  };
}

export function toggleFinalChecklistItem(
  me: VolunteerApplicationStatus,
  id: string,
): VolunteerApplicationStatus {
  const current = me.finalChecklistChecked ?? [];
  const checked = current.includes(id)
    ? current.filter((item) => item !== id)
    : [...current, id];
  return withFinalChecklist(me, checked);
}

export function arriveInEurope(
  me: VolunteerApplicationStatus,
): VolunteerApplicationStatus {
  return { ...me, arrivedInEurope: true };
}
