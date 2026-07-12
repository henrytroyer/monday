/**
 * Map CRM fields to monday.com column titles on your Applications board.
 * Edit these strings to match your board (case-insensitive match at runtime).
 */
const viteEnv = import.meta.env ?? {};

export const columnMap = {
  locationPreference:
    viteEnv.VITE_COL_LOCATION_PREFERENCE || 'Location Preference',
  location: viteEnv.VITE_COL_LOCATION || 'Location',
  status: viteEnv.VITE_COL_STATUS || 'Status',
  signupTimeline:
    viteEnv.VITE_COL_SIGNUP_TIMELINE || 'Signup Timeline',
  housing: viteEnv.VITE_COL_HOUSING || 'Housing',
  /** Long-text / structured itinerary (not file attachments) */
  itinerary: viteEnv.VITE_COL_ITINERARY || 'Itinerary Notes',
  itineraryFiles:
    viteEnv.VITE_COL_ITINERARY_FILES || 'Itinerary',
  arrivalDate: viteEnv.VITE_COL_ARRIVAL_DATE || 'Arrival Date',
  arrivalTime: viteEnv.VITE_COL_ARRIVAL_TIME || 'Arrival Time',
  arrivalAirport:
    viteEnv.VITE_COL_ARRIVAL_AIRPORT || 'Arrival Airport',
  departureDate:
    viteEnv.VITE_COL_DEPARTURE_DATE || 'Departure Date',
  departureTime:
    viteEnv.VITE_COL_DEPARTURE_TIME || 'Departure Time',
  departureAirport:
    viteEnv.VITE_COL_DEPARTURE_AIRPORT || 'Departure Airport',
  /** Legacy single arrival field; used only if itinerary columns are empty */
  arrival: viteEnv.VITE_COL_ARRIVAL || 'Arrival',
  coordinator: viteEnv.VITE_COL_COORDINATOR || 'Coordinator',
  notes: viteEnv.VITE_COL_NOTES || 'Internal Notes',
  applicationSubmitted:
    viteEnv.VITE_COL_APPLICATION_SUBMITTED || 'Application Submitted',
  invoicePaid: viteEnv.VITE_COL_INVOICE_PAID || 'Invoice Paid',
  quickbooksInvoiceId:
    viteEnv.VITE_COL_QUICKBOOKS_INVOICE_ID || 'QuickBooks Invoice ID',
  pastorReference:
    viteEnv.VITE_COL_PASTOR_REFERENCE || 'Pastor Reference',
  addedToChatGroup:
    viteEnv.VITE_COL_ADDED_TO_CHAT_GROUP || 'Added To Chat Group',
  sentToField: viteEnv.VITE_COL_SENT_TO_FIELD || 'Sent To Field',
  email: viteEnv.VITE_COL_EMAIL || 'Email',
  parentEmail: viteEnv.VITE_COL_PARENT_EMAIL || 'Parent Email',
  pastorEmail: viteEnv.VITE_COL_PASTOR_EMAIL || 'Pastor Email',
  otherReferenceEmails:
    viteEnv.VITE_COL_OTHER_REFERENCE_EMAILS ||
    'Other Reference Emails',
  phone: viteEnv.VITE_COL_PHONE || 'Phone',
  profilePhoto: viteEnv.VITE_COL_PROFILE_PHOTO || 'Profile Photo',
  passport: viteEnv.VITE_COL_PASSPORT || 'Passport Photo',
  passportNew:
    viteEnv.VITE_COL_PASSPORT_NEW || 'Please upload New Passport',
  releaseForms: viteEnv.VITE_COL_RELEASE_FORMS || 'Release Forms',
  files: viteEnv.VITE_COL_FILES || 'Files',
  dateOfBirth: viteEnv.VITE_COL_DATE_OF_BIRTH || 'Birthdate',
  addressStreet: viteEnv.VITE_COL_ADDRESS_STREET || 'Street',
  addressCity: viteEnv.VITE_COL_ADDRESS_CITY || 'City',
  addressState: viteEnv.VITE_COL_ADDRESS_STATE || 'State',
  addressZip: viteEnv.VITE_COL_ADDRESS_ZIP || 'Postal Code',
  addressCountry: viteEnv.VITE_COL_ADDRESS_COUNTRY || 'Country',
  addressFillout:
    viteEnv.VITE_COL_ADDRESS_FILLOUT || 'New Address- from fillout',
  contactsLink:
    viteEnv.VITE_COL_CONTACTS_LINK || 'link to Contacts',
  safeguardingMirror:
    viteEnv.VITE_COL_SAFEGUARDING_MIRROR || 'Safeguarding Mirror',
  maritalStatus: viteEnv.VITE_COL_MARITAL_STATUS || 'Marital Status',
  primaryFirstName:
    viteEnv.VITE_COL_PRIMARY_FIRST_NAME || 'First Name Only',
  spouseName: viteEnv.VITE_COL_SPOUSE_NAME || 'Spouse Name',
  spouseEmail: viteEnv.VITE_COL_SPOUSE_EMAIL || 'Spouse Email',
  spousePhone: viteEnv.VITE_COL_SPOUSE_PHONE || 'Spouse Phone',
  spouseBirthday: viteEnv.VITE_COL_SPOUSE_BIRTHDAY || 'Spouse Birthday',
  spouseGender: viteEnv.VITE_COL_SPOUSE_GENDER || 'Spouse Gender',
  spouseProfilePhoto:
    viteEnv.VITE_COL_SPOUSE_PROFILE_PHOTO || 'Spouse Profile Pic',
  spousePassport:
    viteEnv.VITE_COL_SPOUSE_PASSPORT || 'Spouse Passport Photo',
} as const;

export type ColumnMapKey = keyof typeof columnMap;
