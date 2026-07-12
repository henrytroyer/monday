import { SIGNUP_TIMELINES } from '../data/timelines';

/**
 * Map monday.com dropdown/status labels to internal timeline ids.
 * Add entries when your board uses different wording than timelines.ts labels.
 */
export const labelToTimelineId: Record<string, string> = {
  'Summer 2026 — Team A (Jun 8 – Jul 19)': 'summer-2026-a',
  'Summer 2026 — Team B (Jul 20 – Aug 30)': 'summer-2026-b',
  'Fall 2026 (Sep 15 – Nov 1)': 'fall-2026',
  'Spring 2027 (Mar 1 – Apr 15)': 'spring-2027',
};

export function resolveTimelineId(mondayLabel: string): string {
  const trimmed = mondayLabel.trim();
  if (!trimmed) return 'unknown';

  const mapped = labelToTimelineId[trimmed];
  if (mapped) return mapped;

  const lower = trimmed.toLowerCase();
  for (const [label, id] of Object.entries(labelToTimelineId)) {
    if (label.toLowerCase() === lower) return id;
  }
  for (const timeline of SIGNUP_TIMELINES) {
    if (timeline.label.toLowerCase() === lower) return timeline.id;
  }

  return `raw:${trimmed}`;
}
