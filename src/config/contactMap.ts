/**
 * Map CRM contact fields to monday.com column titles on the Contacts board.
 */
export const contactMap = {
  email: import.meta.env.VITE_CONTACT_COL_EMAIL || 'Email',
  tags: import.meta.env.VITE_CONTACT_COL_TAGS || 'Tags',
  /** Legacy single-value column from Mailchimp sync */
  type: import.meta.env.VITE_CONTACT_COL_TYPE || 'type',
  phone: import.meta.env.VITE_CONTACT_COL_PHONE || 'Phone',
  profilePhoto:
    import.meta.env.VITE_CONTACT_COL_PROFILE_PHOTO || 'Profile Photo',
  passport: import.meta.env.VITE_CONTACT_COL_PASSPORT || 'Passport Photo',
  files: import.meta.env.VITE_CONTACT_COL_FILES || 'Files',
  quickbooksCustomerId:
    import.meta.env.VITE_CONTACT_COL_QBO_CUSTOMER_ID ||
    'QuickBooks Customer ID',
  applicationsLink:
    import.meta.env.VITE_CONTACT_COL_APPLICATIONS ||
    'Volunteer Service - Short Term',
  serviceEndedLink:
    import.meta.env.VITE_CONTACT_COL_SERVICE_ENDED_LINK ||
    'link to Current Service Ended',
  safeguardingLink:
    import.meta.env.VITE_CONTACT_COL_SAFEGUARDING_LINK ||
    'link to Safeguarding Certificates (2.0)',
  address: import.meta.env.VITE_CONTACT_COL_ADDRESS || 'Address',
  city: import.meta.env.VITE_CONTACT_COL_CITY || 'City',
  state: import.meta.env.VITE_CONTACT_COL_STATE || 'State',
  zip: import.meta.env.VITE_CONTACT_COL_ZIP || 'Zip',
  country: import.meta.env.VITE_CONTACT_COL_COUNTRY || 'Country',
  dateOfBirth:
    import.meta.env.VITE_CONTACT_COL_DATE_OF_BIRTH || 'Date of birth',
  pastorName:
    import.meta.env.VITE_CONTACT_COL_PASTOR_NAME || 'Pastor Name',
  pastorEmail:
    import.meta.env.VITE_CONTACT_COL_PASTOR_EMAIL || 'Pastor Email',
  pastorPhone:
    import.meta.env.VITE_CONTACT_COL_PASTOR_PHONE || 'Pastor Phone',
  churchName: import.meta.env.VITE_CONTACT_COL_CHURCH || 'Church Name',
  pastorReferenceLink:
    import.meta.env.VITE_CONTACT_COL_PASTOR_REFERENCE_LINK || 'Pastor Reference',
  donationsLink:
    import.meta.env.VITE_CONTACT_COL_DONATIONS_LINK || 'Donations',
} as const;

export type ContactMapKey = keyof typeof contactMap;
