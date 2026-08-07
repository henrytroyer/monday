/**
 * endOfServiceReviewColumnMap.ts — VS Exit Survey board (staff exit reviews
 * for volunteers who have left the field).
 *
 * Live board id verified 2026-08: 2506931747.
 */

import { readViteEnv } from '../utils/readViteEnv';

const viteEnv = new Proxy({} as Record<string, string | undefined>, {
  get(_target, prop: string) {
    return readViteEnv(prop);
  },
});

/** Default Monday board id for VS Exit Survey. */
export const DEFAULT_EOS_REVIEW_BOARD_ID = '2506931747';

export const endOfServiceReviewColumnMap = {
  /**
   * Optional — VS Exit Survey has no volunteer email column; matching uses
   * Contacts 2.0 link + applicant name.
   */
  email: viteEnv.VITE_EOS_REVIEW_COL_EMAIL || 'Email',
  contactLink:
    viteEnv.VITE_EOS_REVIEW_COL_CONTACT_LINK || 'Contacts 2.0',
  /** When set, used for matching reviews to terms; falls back to item created_at */
  completedDate:
    viteEnv.VITE_EOS_REVIEW_COL_COMPLETED_DATE || 'Date Volunteer left:',
  serviceEndedLink:
    viteEnv.VITE_EOS_REVIEW_COL_SERVICE_ENDED_LINK ||
    'link to Current Service Ended',
  longtermAppLink:
    viteEnv.VITE_EOS_REVIEW_COL_LONGTERM_LINK ||
    'link to Volunteer Service - Long Term',
} as const;

export type EndOfServiceReviewColumnMapKey =
  keyof typeof endOfServiceReviewColumnMap;
