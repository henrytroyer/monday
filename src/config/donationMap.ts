/**
 * Map Donations board fields to monday.com column titles.
 */
export const donationMap = {
  donorEmail: import.meta.env.VITE_DONATION_COL_EMAIL || 'Donor Email',
  date: import.meta.env.VITE_DONATION_COL_DATE || 'Date',
  amount: import.meta.env.VITE_DONATION_COL_AMOUNT || 'Amount',
  program: import.meta.env.VITE_DONATION_COL_PROGRAM || 'Program',
  designation: import.meta.env.VITE_DONATION_COL_DESIGNATION || 'Designation',
  details: import.meta.env.VITE_DONATION_COL_DETAILS || 'Details',
  donorName: import.meta.env.VITE_DONATION_COL_NAME || 'Name',
} as const;

export type DonationMapKey = keyof typeof donationMap;
