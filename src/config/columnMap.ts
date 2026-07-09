/**
 * Map CRM fields to monday.com column titles on your Applications board.
 * Edit these strings to match your board (case-insensitive match at runtime).
 */
export const columnMap = {
  locationPreference:
    import.meta.env.VITE_COL_LOCATION_PREFERENCE || 'Location Preference',
  location: import.meta.env.VITE_COL_LOCATION || 'Location',
  status: import.meta.env.VITE_COL_STATUS || 'Status',
  signupTimeline:
    import.meta.env.VITE_COL_SIGNUP_TIMELINE || 'Signup Timeline',
  housing: import.meta.env.VITE_COL_HOUSING || 'Housing',
  /** Long-text / structured itinerary (not file attachments) */
  itinerary: import.meta.env.VITE_COL_ITINERARY || 'Itinerary Notes',
  itineraryFiles:
    import.meta.env.VITE_COL_ITINERARY_FILES || 'Itinerary',
  arrivalDate: import.meta.env.VITE_COL_ARRIVAL_DATE || 'Arrival Date',
  arrivalTime: import.meta.env.VITE_COL_ARRIVAL_TIME || 'Arrival Time',
  arrivalAirport:
    import.meta.env.VITE_COL_ARRIVAL_AIRPORT || 'Arrival Airport',
  departureDate:
    import.meta.env.VITE_COL_DEPARTURE_DATE || 'Departure Date',
  departureTime:
    import.meta.env.VITE_COL_DEPARTURE_TIME || 'Departure Time',
  departureAirport:
    import.meta.env.VITE_COL_DEPARTURE_AIRPORT || 'Departure Airport',
  /** Legacy single arrival field; used only if itinerary columns are empty */
  arrival: import.meta.env.VITE_COL_ARRIVAL || 'Arrival',
  coordinator: import.meta.env.VITE_COL_COORDINATOR || 'Coordinator',
  notes: import.meta.env.VITE_COL_NOTES || 'Internal Notes',
  applicationSubmitted:
    import.meta.env.VITE_COL_APPLICATION_SUBMITTED || 'Application Submitted',
  invoicePaid: import.meta.env.VITE_COL_INVOICE_PAID || 'Invoice Paid',
  quickbooksInvoiceId:
    import.meta.env.VITE_COL_QUICKBOOKS_INVOICE_ID || 'QuickBooks Invoice ID',
  pastorReference:
    import.meta.env.VITE_COL_PASTOR_REFERENCE || 'Pastor Reference',
  addedToChatGroup:
    import.meta.env.VITE_COL_ADDED_TO_CHAT_GROUP || 'Added To Chat Group',
  sentToField: import.meta.env.VITE_COL_SENT_TO_FIELD || 'Sent To Field',
  email: import.meta.env.VITE_COL_EMAIL || 'Email',
  parentEmail: import.meta.env.VITE_COL_PARENT_EMAIL || 'Parent Email',
  pastorEmail: import.meta.env.VITE_COL_PASTOR_EMAIL || 'Pastor Email',
  otherReferenceEmails:
    import.meta.env.VITE_COL_OTHER_REFERENCE_EMAILS ||
    'Other Reference Emails',
  phone: import.meta.env.VITE_COL_PHONE || 'Phone',
  profilePhoto: import.meta.env.VITE_COL_PROFILE_PHOTO || 'Profile Photo',
  passport: import.meta.env.VITE_COL_PASSPORT || 'Passport Photo',
  passportNew:
    import.meta.env.VITE_COL_PASSPORT_NEW || 'Please upload New Passport',
  releaseForms: import.meta.env.VITE_COL_RELEASE_FORMS || 'Release Forms',
  files: import.meta.env.VITE_COL_FILES || 'Files',
  dateOfBirth: import.meta.env.VITE_COL_DATE_OF_BIRTH || 'Birthdate',
  addressStreet: import.meta.env.VITE_COL_ADDRESS_STREET || 'Street',
  addressCity: import.meta.env.VITE_COL_ADDRESS_CITY || 'City',
  addressState: import.meta.env.VITE_COL_ADDRESS_STATE || 'State',
  addressZip: import.meta.env.VITE_COL_ADDRESS_ZIP || 'Postal Code',
  addressCountry: import.meta.env.VITE_COL_ADDRESS_COUNTRY || 'Country',
  addressFillout:
    import.meta.env.VITE_COL_ADDRESS_FILLOUT || 'New Address- from fillout',
  contactsLink:
    import.meta.env.VITE_COL_CONTACTS_LINK || 'link to Contacts',
  safeguardingMirror:
    import.meta.env.VITE_COL_SAFEGUARDING_MIRROR || 'Safeguarding Mirror',
} as const;

export type ColumnMapKey = keyof typeof columnMap;
