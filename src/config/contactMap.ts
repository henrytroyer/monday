/**
 * Map CRM contact fields to monday.com column titles on the Contacts board.
 */

import { readViteEnv } from '../utils/readViteEnv';

const viteEnv = new Proxy({} as Record<string, string | undefined>, {
  get(_target, prop: string) {
    return readViteEnv(prop);
  },
});

export const contactMap = {
  email: viteEnv.VITE_CONTACT_COL_EMAIL || 'Email',
  /** Second address kept when merging contacts with different emails. */
  altEmail: viteEnv.VITE_CONTACT_COL_ALT_EMAIL || 'Alt Email',
  tags: viteEnv.VITE_CONTACT_COL_TAGS || 'Tags',
  /** Legacy single-value column from Mailchimp sync */
  type: viteEnv.VITE_CONTACT_COL_TYPE || 'type',
  phone: viteEnv.VITE_CONTACT_COL_PHONE || 'Phone',
  /** Secondary phone(s) kept when merging (text; comma-separated). */
  altPhone: viteEnv.VITE_CONTACT_COL_ALT_PHONE || 'Alt Phone',
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
  /**
   * Mailing fields on the live Contacts board (titles verified 2026-08):
   * Street, City, State/Providence, Zip Code, Country.
   * Legacy / alternate titles kept as aliases in mapMondayToContact.
   */
  address: viteEnv.VITE_CONTACT_COL_ADDRESS || 'Street',
  city: viteEnv.VITE_CONTACT_COL_CITY || 'City',
  state: viteEnv.VITE_CONTACT_COL_STATE || 'State/Providence',
  zip: viteEnv.VITE_CONTACT_COL_ZIP || 'Zip Code',
  country: viteEnv.VITE_CONTACT_COL_COUNTRY || 'Country',
  /** Secondary mailing block(s) after merge (text; pipe-separated). */
  altAddress: viteEnv.VITE_CONTACT_COL_ALT_ADDRESS || 'Alt Address',
  dateOfBirth: viteEnv.VITE_CONTACT_COL_DATE_OF_BIRTH || 'Date of birth',
  pastorName: viteEnv.VITE_CONTACT_COL_PASTOR_NAME || 'Pastor Name',
  pastorEmail: viteEnv.VITE_CONTACT_COL_PASTOR_EMAIL || 'Pastor Email',
  pastorPhone: viteEnv.VITE_CONTACT_COL_PASTOR_PHONE || 'Pastor Phone',
  churchName: viteEnv.VITE_CONTACT_COL_CHURCH || 'Church Name',
  /** Live title is "link to Pastors Reference(2.0)"; aliases cover older labels. */
  pastorReferenceLink:
    viteEnv.VITE_CONTACT_COL_PASTOR_REFERENCE_LINK ||
    'link to Pastors Reference(2.0)',
  donationsLink: viteEnv.VITE_CONTACT_COL_DONATIONS_LINK || 'Donations',
  parentName: viteEnv.VITE_CONTACT_COL_PARENT_NAME || "Parent's Name",
  parentEmail: viteEnv.VITE_CONTACT_COL_PARENT_EMAIL || 'Parents Email',
  parentPhone: viteEnv.VITE_CONTACT_COL_PARENT_PHONE || 'Parents Phone',
  spouseName: viteEnv.VITE_CONTACT_COL_SPOUSE_NAME || 'Spouse Name',
  spouseEmail: viteEnv.VITE_CONTACT_COL_SPOUSE_EMAIL || 'Spouse Email',
  spouseProfilePhoto:
    viteEnv.VITE_CONTACT_COL_SPOUSE_PROFILE_PHOTO || 'Spouse Profile Photo',
  spousePassport:
    viteEnv.VITE_CONTACT_COL_SPOUSE_PASSPORT || 'Spouse Passport Pic',
  emergencyContact:
    viteEnv.VITE_CONTACT_COL_EMERGENCY_CONTACT || 'Emergency Contact',
  emergencyPhone:
    viteEnv.VITE_CONTACT_COL_EMERGENCY_PHONE || 'Emergency Contact Phone',
  /** Free-text links: couple partners, all pastors attached to a volunteer, etc. */
  connectedTo: viteEnv.VITE_CONTACT_COL_CONNECTED_TO || 'Connected  to:',
  longtermApplicationsLink:
    viteEnv.VITE_CONTACT_COL_LONGTERM_APPLICATIONS ||
    'Volunteer Service - Long Term',
} as const;

export type ContactMapKey = keyof typeof contactMap;
