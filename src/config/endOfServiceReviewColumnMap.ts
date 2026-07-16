/**
 * Map CRM fields to monday.com column titles on the End of Service Review board
 * (Volunteer Feedback Form by default).
 */
const viteEnv = import.meta.env ?? {};

export const endOfServiceReviewColumnMap = {
  email: viteEnv.VITE_EOS_REVIEW_COL_EMAIL || 'Email',
  contactLink: viteEnv.VITE_EOS_REVIEW_COL_CONTACT_LINK || 'Contacts',
  /** When set, used for matching reviews to terms; falls back to item created_at */
  completedDate: viteEnv.VITE_EOS_REVIEW_COL_COMPLETED_DATE || '',
  serviceEndedLink:
    viteEnv.VITE_EOS_REVIEW_COL_SERVICE_ENDED_LINK ||
    'link to Current Service Ended',
} as const;

export type EndOfServiceReviewColumnMapKey =
  keyof typeof endOfServiceReviewColumnMap;
