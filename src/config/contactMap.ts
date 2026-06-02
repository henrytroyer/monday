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
  quickbooksCustomerId:
    import.meta.env.VITE_CONTACT_COL_QBO_CUSTOMER_ID ||
    'QuickBooks Customer ID',
  applicationsLink:
    import.meta.env.VITE_CONTACT_COL_APPLICATIONS || 'Applications',
  address: import.meta.env.VITE_CONTACT_COL_ADDRESS || 'Address',
  city: import.meta.env.VITE_CONTACT_COL_CITY || 'City',
  country: import.meta.env.VITE_CONTACT_COL_COUNTRY || 'Country',
  dateOfBirth:
    import.meta.env.VITE_CONTACT_COL_DATE_OF_BIRTH || 'Date of birth',
} as const;

export type ContactMapKey = keyof typeof contactMap;
