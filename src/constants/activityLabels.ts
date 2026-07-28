/**
 * Human-readable labels for the global History / activity log UI.
 * Keep Monday jargon out of coordinator-facing copy.
 */
import type { CrmActivityCategory, CrmActivityEntityType } from '../types/activityLog';

export const ACTIVITY_CATEGORY_LABELS: Record<CrmActivityCategory, string> = {
  created: 'Created',
  updated: 'Updated',
  deleted: 'Deleted',
  moved: 'Moved',
  comment: 'Comment',
  email: 'Email',
  other: 'Other',
};

/** Singular noun used in activity summaries (e.g. "Created application"). */
export function activityEntityNoun(entityType?: CrmActivityEntityType): string {
  switch (entityType) {
    case 'contact':
      return 'contact';
    case 'application':
      return 'application';
    case 'donation':
      return 'donation';
    case 'recruitment':
      return 'prospect';
    default:
      return 'record';
  }
}

/**
 * CRM-facing board / area label for History filters and chips.
 * Prefer role-based names over raw monday.com board titles.
 */
export function friendlyActivityBoardLabel(
  boardId: string,
  fallbackName?: string,
  boardRole?: 'contacts' | 'applications' | 'other',
): string {
  if (boardRole === 'contacts') return 'Contacts';
  if (boardRole === 'applications') return 'Applications';

  const env = import.meta.env as Record<string, string | undefined> | undefined;
  const id = String(boardId);

  if (env?.VITE_CONTACTS_BOARD_ID && id === String(env.VITE_CONTACTS_BOARD_ID)) {
    return 'Contacts';
  }
  if (
    env?.VITE_APPLICATIONS_BOARD_ID &&
    id === String(env.VITE_APPLICATIONS_BOARD_ID)
  ) {
    return 'Applications';
  }
  if (env?.VITE_DONATIONS_BOARD_ID && id === String(env.VITE_DONATIONS_BOARD_ID)) {
    return 'Donations';
  }
  if (
    env?.VITE_SERVICE_ENDED_BOARD_ID &&
    id === String(env.VITE_SERVICE_ENDED_BOARD_ID)
  ) {
    return 'Service ended';
  }
  if (env?.VITE_EOS_REVIEW_BOARD_ID && id === String(env.VITE_EOS_REVIEW_BOARD_ID)) {
    return 'End of service review';
  }
  if (
    env?.VITE_LONGTERM_APPLICATIONS_BOARD_ID &&
    id === String(env.VITE_LONGTERM_APPLICATIONS_BOARD_ID)
  ) {
    return 'Long-term applications';
  }
  if (
    env?.VITE_LONGTERM_REFERENCES_BOARD_ID &&
    id === String(env.VITE_LONGTERM_REFERENCES_BOARD_ID)
  ) {
    return 'Long-term references';
  }

  const cleaned = fallbackName
    ?.trim()
    .replace(/\s+Test(?:\s+Board)?$/i, '')
    .trim();
  if (cleaned) return cleaned;
  return 'Other';
}
