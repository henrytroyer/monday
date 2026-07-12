/** Predefined application status labels (monday Status column semantics). */
export const APPLICATION_STATUS_OPTIONS = [
  'New',
  'Awaiting Reference',
  'Reference Complete',
  'Ready For Placement',
  'Housing Confirmed',
  'Placement Confirmed',
  'Pre-arrival',
  'Awaiting Arrival',
  'Active',
  'On Field',
] as const;

export type ApplicationStatusOption =
  (typeof APPLICATION_STATUS_OPTIONS)[number];

/** Statuses at or after term confirmation — keep green "Confirmed" display. */
export const POST_CONFIRMATION_TERM_STATUSES: readonly ApplicationStatusOption[] =
  [
    'Housing Confirmed',
    'Placement Confirmed',
    'Pre-arrival',
    'Awaiting Arrival',
    'Active',
    'On Field',
  ];

const postConfirmationStatusSet = new Set(
  POST_CONFIRMATION_TERM_STATUSES.map((s) => s.toLowerCase()),
);

/** Pipeline groups at or after term confirmation — keep green "Confirmed" display. */
export const POST_CONFIRMATION_PIPELINE_STAGES = [
  'Confirmed Location',
  'Added To Chat Group',
  'Sent To Field',
] as const;

const postConfirmationPipelineSet = new Set(
  POST_CONFIRMATION_PIPELINE_STAGES.map((s) => s.toLowerCase()),
);

export function isPostConfirmationPipelineStage(stage: string): boolean {
  const normalized = stage.trim().toLowerCase();
  if (!normalized || normalized === '—') return false;
  if (postConfirmationPipelineSet.has(normalized)) return true;
  if (normalized.includes('confirmed location')) return true;
  if (normalized.includes('chat group')) return true;
  if (normalized.includes('sent to field')) return true;
  return false;
}

export function isSentToFieldPipelineStage(stage: string): boolean {
  const normalized = stage.trim().toLowerCase();
  if (!normalized || normalized === '—') return false;
  return normalized === 'sent to field' || normalized.includes('sent to field');
}

export function isPostConfirmationTermStatus(status: string): boolean {
  const normalized = status.trim().toLowerCase();
  if (!normalized || normalized === '—') return false;
  if (postConfirmationStatusSet.has(normalized)) return true;
  if (normalized.includes('confirmed')) return true;
  if (normalized.includes('pre-arrival') || normalized.includes('pre arrival')) {
    return true;
  }
  if (normalized.includes('awaiting arrival')) return true;
  if (normalized === 'active' || normalized.includes('on field')) return true;
  return false;
}
