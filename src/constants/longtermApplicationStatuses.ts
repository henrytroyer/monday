/** Long-term application pipeline stages (also used as editable row tags). */
export const LONGTERM_STATUS_OPTIONS = [
  'New',
  'references sent',
  'Holding',
  'approved',
  'clearances',
  'prepartation',
] as const;

export type LongtermStatus = (typeof LONGTERM_STATUS_OPTIONS)[number];
