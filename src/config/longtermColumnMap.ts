/**
 * Map CRM fields to monday.com column titles on Volunteer Service - Long Term.
 */
const viteEnv = import.meta.env ?? {};

export const longtermColumnMap = {
  status: viteEnv.VITE_LONGTERM_COL_STATUS || 'Status',
  email: viteEnv.VITE_LONGTERM_COL_EMAIL || 'Your Email',
  phone: viteEnv.VITE_LONGTERM_COL_PHONE || 'Your Phone Number',
  location: viteEnv.VITE_LONGTERM_COL_LOCATION || 'Location',
  currentLocation: viteEnv.VITE_LONGTERM_COL_CURRENT_LOCATION || 'Current Location',
  locationPreference:
    viteEnv.VITE_LONGTERM_COL_LOCATION_PREFERENCE ||
    'Where would you be interested in serving?',
  termRange: viteEnv.VITE_LONGTERM_COL_TERM_RANGE || 'Length of Term',
  signupTimeline: viteEnv.VITE_LONGTERM_COL_SIGNUP_TIMELINE || 'Preferred start month',
  profilePhoto: viteEnv.VITE_LONGTERM_COL_PROFILE_PHOTO || 'Profile Photo',
  passport: viteEnv.VITE_LONGTERM_COL_PASSPORT || 'Passport Photo',
  pastorReferenceLink:
    viteEnv.VITE_LONGTERM_COL_PASTOR_REFERENCE_LINK || 'link to Pastors Reference',
  contactsLink: viteEnv.VITE_LONGTERM_COL_CONTACTS_LINK || 'link to Contacts (2.0)',
  referenceParentName: viteEnv.VITE_LONGTERM_COL_REF_PARENT_NAME || 'Reference (Parent)',
  referenceParentEmail: viteEnv.VITE_LONGTERM_COL_REF_PARENT_EMAIL || 'Reference (Parent)',
  referencePastorName: viteEnv.VITE_LONGTERM_COL_REF_PASTOR_NAME || 'Reference (Pastor)',
  referencePastorEmail: viteEnv.VITE_LONGTERM_COL_REF_PASTOR_EMAIL || 'Reference (Pastor)',
  referenceYouthName:
    viteEnv.VITE_LONGTERM_COL_REF_YOUTH_NAME || 'Reference (Youth Pastor/Mentor)',
  referenceYouthEmail:
    viteEnv.VITE_LONGTERM_COL_REF_YOUTH_EMAIL || 'Reference (Youth Pastor/Mentor)',
  referenceFriendName: viteEnv.VITE_LONGTERM_COL_REF_FRIEND_NAME || 'Reference (Friend)',
  referenceFriendEmail: viteEnv.VITE_LONGTERM_COL_REF_FRIEND_EMAIL || 'Reference (Friend)',
  referenceEmployerName:
    viteEnv.VITE_LONGTERM_COL_REF_EMPLOYER_NAME || 'Reference (Employer) Name',
  referenceEmployerEmail:
    viteEnv.VITE_LONGTERM_COL_REF_EMPLOYER_EMAIL || 'Reference (Employer) Email',
} as const;

export type LongtermColumnMapKey = keyof typeof longtermColumnMap;

/** Monday board groups treated as on-field deployment teams. */
export const LONGTERM_ON_FIELD_GROUP_MAP: Record<string, string> = {
  'Lesvos Team': 'Lesvos',
  'Malakasa Team': 'Malakasa',
  'Taunusstein Team': 'Taunusstien',
  'Neustadt Team': 'Neustadt',
  'Giessen Team': 'Giessen',
  'Intern Team': 'Intern',
};

/** Monday pipeline groups → CRM status labels. */
export const LONGTERM_PIPELINE_GROUP_MAP: Record<string, string> = {
  'New Applications': 'New',
  'References Sent': 'references sent',
  Holding: 'Holding',
  Approved: 'approved',
  Clearances: 'clearances',
  Preparation: 'prepartation',
};

/** Groups hidden from pipeline and on-field views. */
export const LONGTERM_EXCLUDED_GROUPS = new Set([
  'Term Ended',
  'Archive',
  'Kids 0-18',
]);
