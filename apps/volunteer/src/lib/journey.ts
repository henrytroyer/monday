import type {
  ShortTermStepId,
  VolunteerApplicationStatus,
  VolunteerStep,
  VolunteerStepAudience,
  VolunteerStepStatus,
} from '../contract/volunteerApi';
import { nextVolunteerAction } from './nextAction';
import { GERMANY_GREETING_BACKDROP, HOME_GREETING_BACKDROP } from './nav';

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

/** Greece photo until a Germany assignment or preference is the place they are going. */
export function greetingBackdrop(region: JourneyRegion): string {
  return region === 'germany' ? GERMANY_GREETING_BACKDROP : HOME_GREETING_BACKDROP;
}

export const APPLICATION_PHASES = [
  {
    id: 'about-you',
    title: 'Your info',
    stepIds: [
      'application_received',
      'pastor_reference',
      'in_review',
      'background_check',
    ],
  },
  {
    id: 'your-story',
    title: 'Your story',
    stepIds: ['child_safeguarding', 'approved', 'flight_info'],
  },
  {
    id: 'your-service',
    title: 'Your service',
    stepIds: ['invoice', 'sent_to_field', 'guidelines'],
  },
] as const satisfies readonly {
  id: string;
  title: string;
  stepIds: readonly ShortTermStepId[];
}[];

export type ApplicationPhaseTone = 'done' | 'active' | 'upcoming';

export interface ApplicationPhaseProgress {
  id: (typeof APPLICATION_PHASES)[number]['id'];
  title: string;
  tone: ApplicationPhaseTone;
  done: number;
  total: number;
}

export function applicationPhaseProgress(me: VolunteerApplicationStatus): {
  phases: ApplicationPhaseProgress[];
  serviceComplete: boolean;
} {
  const phases = APPLICATION_PHASES.map((phase) => {
    const done = phase.stepIds.filter((id) => stepIsComplete(me, id)).length;
    return {
      id: phase.id,
      title: phase.title,
      tone: 'upcoming' as ApplicationPhaseTone,
      done,
      total: phase.stepIds.length,
    };
  });
  const activeIndex = phases.findIndex((phase) => phase.done < phase.total);
  if (activeIndex === -1) {
    return {
      phases: phases.map((phase) => ({ ...phase, tone: 'done' as const })),
      serviceComplete: true,
    };
  }
  return {
    phases: phases.map((phase, index) => ({
      ...phase,
      tone: index < activeIndex ? 'done' : index === activeIndex ? 'active' : 'upcoming',
    })),
    serviceComplete: false,
  };
}

function stepIsComplete(me: VolunteerApplicationStatus, id: ShortTermStepId): boolean {
  return me.steps.find((step) => step.id === id)?.status === 'complete';
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
