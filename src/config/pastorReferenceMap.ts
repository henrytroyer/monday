/**
 * pastorReferenceMap.ts — Pastors Reference 2.0 board (form board linked from Contacts).
 * Live board id verified 2026-08 via Contacts column link_to_pastors_reference7.
 */

import { readViteEnv } from '../utils/readViteEnv';

const viteEnv = new Proxy({} as Record<string, string | undefined>, {
  get(_target, prop: string) {
    return readViteEnv(prop);
  },
});

/** Default Monday board id for Pastors Reference 2.0. */
export const DEFAULT_PASTOR_REFERENCE_BOARD_ID = '3561493558';

export const pastorReferenceMap = {
  boardId:
    viteEnv.VITE_PASTOR_REFERENCE_BOARD_ID || DEFAULT_PASTOR_REFERENCE_BOARD_ID,
  /** board_relation → Contacts */
  contactLink:
    viteEnv.VITE_PASTOR_REF_COL_CONTACT_LINK || 'Pas Ref Contact (2.0)',
  contactLinkId:
    viteEnv.VITE_PASTOR_REF_COL_CONTACT_LINK_ID || 'connect_boards4',
  /** board_relation → short-term Applications */
  applicationLink:
    viteEnv.VITE_PASTOR_REF_COL_APPLICATION_LINK || 'Application',
  applicationLinkId:
    viteEnv.VITE_PASTOR_REF_COL_APPLICATION_LINK_ID ||
    'link_to_volunteer_service___short_term',
  refereeName:
    viteEnv.VITE_PASTOR_REF_COL_REFEREE_NAME || 'Person completing reference',
  refereeEmail:
    viteEnv.VITE_PASTOR_REF_COL_REFEREE_EMAIL ||
    'Person completing reference email address',
  refereePhone:
    viteEnv.VITE_PASTOR_REF_COL_REFEREE_PHONE ||
    'Person completing reference phone number',
  relationship:
    viteEnv.VITE_PASTOR_REF_COL_RELATIONSHIP || 'Relationship to Applicant',
  status: viteEnv.VITE_PASTOR_REF_COL_STATUS || 'Status',
  dateReceived: viteEnv.VITE_PASTOR_REF_COL_DATE_RECEIVED || 'Date Received',
} as const;
