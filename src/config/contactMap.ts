/**
 * Map CRM contact fields to monday.com column titles on the Contacts board.
 */
const viteEnv = import.meta.env ?? {};

export const contactMap = {
  email: viteEnv.VITE_CONTACT_COL_EMAIL || 'Email',
  tags: viteEnv.VITE_CONTACT_COL_TAGS || 'Tags',
  /** Legacy single-value column from Mailchimp sync */
  type: viteEnv.VITE_CONTACT_COL_TYPE || 'type',
  phone: viteEnv.VITE_CONTACT_COL_PHONE || 'Phone',
  profilePhoto: viteEnv.VITE_CONTACT_COL_PROFILE_PHOTO || 'Profile Photo',
  passport: viteEnv.VITE_CONTACT_COL_PASSPORT || 'Passport Photo',
  files: viteEnv.VITE_CONTACT_COL_FILES || 'Files',
  quickbooksCustomerId:
    viteEnv.VITE_CONTACT_COL_QBO_CUSTOMER_ID || 'QuickBooks Customer ID',
  applicationsLink:
    viteEnv.VITE_CONTACT_COL_APPLICATIONS ||
    'Volunteer Service - Short Term',
  serviceEndedLink:
    viteEnv.VITE_CONTACT_COL_SERVICE_ENDED_LINK ||
    'link to Current Service Ended',
  safeguardingLink:
    viteEnv.VITE_CONTACT_COL_SAFEGUARDING_LINK ||
    'link to Safeguarding Certificates (2.0)',
  address: viteEnv.VITE_CONTACT_COL_ADDRESS || 'Address',
  city: viteEnv.VITE_CONTACT_COL_CITY || 'City',
  state: viteEnv.VITE_CONTACT_COL_STATE || 'State',
  zip: viteEnv.VITE_CONTACT_COL_ZIP || 'Zip',
  country: viteEnv.VITE_CONTACT_COL_COUNTRY || 'Country',
  dateOfBirth: viteEnv.VITE_CONTACT_COL_DATE_OF_BIRTH || 'Date of birth',
  pastorName: viteEnv.VITE_CONTACT_COL_PASTOR_NAME || 'Pastor Name',
  pastorEmail: viteEnv.VITE_CONTACT_COL_PASTOR_EMAIL || 'Pastor Email',
  pastorPhone: viteEnv.VITE_CONTACT_COL_PASTOR_PHONE || 'Pastor Phone',
  churchName: viteEnv.VITE_CONTACT_COL_CHURCH || 'Church Name',
  pastorReferenceLink:
    viteEnv.VITE_CONTACT_COL_PASTOR_REFERENCE_LINK || 'Pastor Reference',
  donationsLink: viteEnv.VITE_CONTACT_COL_DONATIONS_LINK || 'Donations',
} as const;

export type ContactMapKey = keyof typeof contactMap;
