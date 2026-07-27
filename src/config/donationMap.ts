/**
 * Map Donations board fields to monday.com column titles.
 */
const viteEnv = import.meta.env ?? {};

export const donationMap = {
  donorEmail: viteEnv.VITE_DONATION_COL_EMAIL || 'Donor Email',
  date: viteEnv.VITE_DONATION_COL_DATE || 'Date',
  amount: viteEnv.VITE_DONATION_COL_AMOUNT || 'Amount',
  program: viteEnv.VITE_DONATION_COL_PROGRAM || 'Program',
  designation: viteEnv.VITE_DONATION_COL_DESIGNATION || 'Designation',
  details: viteEnv.VITE_DONATION_COL_DETAILS || 'Details',
  donorName: viteEnv.VITE_DONATION_COL_NAME || 'Name',
} as const;

export type DonationMapKey = keyof typeof donationMap;
