import type { VolunteerApplicationStatus } from '../contract/volunteerApi';
import { resolveOnboardingSteps } from './onboarding';

export const FINAL_CHECKLIST_ITEMS = [
  { id: 'passport', label: 'Passport is valid for the whole term' },
  { id: 'flight', label: 'Flight confirmation and arrival plan are saved' },
  { id: 'insurance', label: 'Travel insurance information is with you' },
  { id: 'funds', label: 'Bank card works in Europe, and you have some euros' },
  { id: 'phone', label: 'Phone plan or SIM plan is set for Europe' },
  { id: 'adapter', label: 'Plug adapter is packed' },
  { id: 'medications', label: 'Medications and a small first-aid kit are packed' },
  { id: 'contacts', label: 'Emergency contacts are saved offline' },
  { id: 'chat', label: 'Team chat app is installed' },
  { id: 'arrival', label: 'Field arrival instructions are with you' },
] as const;

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

/** The arrival button stays hidden until every line item is checked. */
export function showArrivalButton(me: VolunteerApplicationStatus): boolean {
  return finalChecklistIsComplete(me.finalChecklistChecked) && !me.arrivedInEurope;
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
