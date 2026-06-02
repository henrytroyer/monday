import type { SignupTimeline } from '../types/volunteer';

export const SIGNUP_TIMELINES: SignupTimeline[] = [
  {
    id: 'summer-2026-a',
    label: 'Summer 2026 — Team A (Jun 8 – Jul 19)',
    startDate: '2026-06-08',
    endDate: '2026-07-19',
  },
  {
    id: 'summer-2026-b',
    label: 'Summer 2026 — Team B (Jul 20 – Aug 30)',
    startDate: '2026-07-20',
    endDate: '2026-08-30',
  },
  {
    id: 'fall-2026',
    label: 'Fall 2026 (Sep 15 – Nov 1)',
    startDate: '2026-09-15',
    endDate: '2026-11-01',
  },
  {
    id: 'spring-2027',
    label: 'Spring 2027 (Mar 1 – Apr 15)',
    startDate: '2027-03-01',
    endDate: '2027-04-15',
  },
];

const timelineById = new Map(
  SIGNUP_TIMELINES.map((timeline) => [timeline.id, timeline]),
);

export function getTimelineById(id: string): SignupTimeline | undefined {
  if (id.startsWith('raw:')) return undefined;
  return timelineById.get(id);
}

export function getTimelineLabel(id: string): string {
  if (id.startsWith('raw:')) return id.slice(4);
  return getTimelineById(id)?.label ?? (id || 'Unknown timeline');
}

export function formatTimelineArrival(id: string, fallbackArrival?: string): string {
  if (fallbackArrival?.trim()) return fallbackArrival.trim();
  const timeline = getTimelineById(id);
  if (!timeline) return '—';
  const start = new Date(timeline.startDate + 'T00:00:00');
  return start.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}
