/**
 * monday.com Long Term Reference Form board (4510144248).
 */

const viteEnv = import.meta.env;

export const longtermReferenceMap = {
  boardId: viteEnv.VITE_LONGTERM_REFERENCES_BOARD_ID || '4510144248',
  employerBoardId:
    viteEnv.VITE_LT_EMPLOYER_REFERENCE_BOARD_ID || '18414703692',
  refereeEmail: viteEnv.VITE_LT_REF_FORM_EMAIL || 'Your Email',
  refereeName: viteEnv.VITE_LT_REF_FORM_NAME || 'Name',
  applicantName:
    viteEnv.VITE_LT_REF_FORM_APPLICANT_NAME ||
    'Long Term Applicants First and Last Name',
  applicantEmail:
    viteEnv.VITE_LT_REF_FORM_APPLICANT_EMAIL ||
    'Long Term Applicants Email',
  relationship:
    viteEnv.VITE_LT_REF_FORM_RELATIONSHIP ||
    'Your relationship with the applicant',
  applicationLink:
    viteEnv.VITE_LT_REF_FORM_APP_LINK ||
    'link to Volunteer Service - Long Term',
  applicationStatus: viteEnv.VITE_LT_REF_FORM_STATUS || 'Application',
} as const;

/** Columns excluded from reference Q&A panel */
export const LONGTERM_REFERENCE_EXCLUDED_TITLES = new Set([
  'name',
  longtermReferenceMap.applicationStatus.toLowerCase(),
  longtermReferenceMap.applicationLink.toLowerCase(),
  'contacts (2.0)',
  'link to contacts (2.0)',
]);
