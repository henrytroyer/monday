import type {
  VolunteerApplicationStatus,
  VolunteerStep,
  VolunteerStepAudience,
  VolunteerStepStatus,
} from '../contract/volunteerApi';
import { nextVolunteerAction } from './nextAction';

export type JourneyRegion = 'greece' | 'germany' | 'europe';

export interface JourneyDestination {
  label: string;
  region: JourneyRegion;
}

/** Index of the current waypoint, or `steps.length` when the plane has arrived. */
export function journeyPlaneIndex(me: VolunteerApplicationStatus): number {
  const next = nextVolunteerAction(me);
  if (!next) return me.steps.length;
  const index = me.steps.findIndex((step) => step.id === next.id);
  return index === -1 ? me.steps.length : index;
}

export function journeyArrived(me: VolunteerApplicationStatus): boolean {
  return journeyPlaneIndex(me) >= me.steps.length;
}

/** 0 at the North America start, 1 when the plane has arrived in Europe. */
export function journeyProgress(me: VolunteerApplicationStatus): number {
  const total = me.steps.length;
  if (total === 0) return 1;
  return Math.min(1, Math.max(0, journeyPlaneIndex(me) / total));
}

export function journeyDestination(
  me: VolunteerApplicationStatus,
): JourneyDestination {
  const fromLocation = classifyPlace(me.location);
  if (fromLocation && !isPlaceholderLocation(me.location)) {
    return fromLocation;
  }

  const prefs = me.termOfService?.locationPreferences ?? [];
  const fromPrefs = prefs
    .map(classifyPlace)
    .find((place): place is JourneyDestination => place !== null);
  if (fromPrefs) return fromPrefs;

  return { label: 'Europe', region: 'europe' };
}

export function warmerStatusLabel(
  status: VolunteerStepStatus,
  audience: VolunteerStepAudience = 'volunteer',
): string {
  switch (status) {
    case 'complete':
      return 'Done';
    case 'not_started':
      return 'Not started';
    case 'waiting':
      return 'Waiting';
    case 'received':
      return audience === 'volunteer'
        ? 'Waiting on your reference'
        : 'Waiting on i58';
    default:
      return status;
  }
}

export function journeyCurrentStep(
  me: VolunteerApplicationStatus,
): VolunteerStep | null {
  return nextVolunteerAction(me);
}

function isPlaceholderLocation(location: string): boolean {
  return /not listed/i.test(location.trim());
}

function classifyPlace(value: string): JourneyDestination | null {
  const text = value.trim();
  if (!text) return null;
  if (/germany|neustadt|taunusstein/i.test(text)) {
    return { label: 'Germany', region: 'germany' };
  }
  if (/lesvos/i.test(text)) {
    return { label: 'Lesvos', region: 'greece' };
  }
  if (/greece|malakasa|athens/i.test(text)) {
    return { label: 'Greece', region: 'greece' };
  }
  return null;
}
