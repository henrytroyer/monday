/**
 * monday.com Volunteer Service - Long Term board (2927925742).
 * Column titles — override via VITE_LT_COL_* in .env.
 */

const viteEnv = import.meta.env;

export const longtermColumnMap = {
  status: viteEnv.VITE_LT_COL_STATUS || 'Status',
  email: viteEnv.VITE_LT_COL_EMAIL || 'Your Email',
  phone: viteEnv.VITE_LT_COL_PHONE || 'Your Phone Number',
  locationPreference:
    viteEnv.VITE_LT_COL_LOCATION_PREFERENCE ||
    'Where would you be interested in serving?',
  assignedLocation: viteEnv.VITE_LT_COL_ASSIGNED_LOCATION || 'Location',
  profilePhoto: viteEnv.VITE_LT_COL_PROFILE_PHOTO || 'Profile Photo',
  files: viteEnv.VITE_LT_COL_FILES || 'Passport Photo',
  /** Mirror column — received reference count hint */
  referenceMirror: viteEnv.VITE_LT_COL_REF_MIRROR || 'LT Reff Mirror',
  maritalStatus: viteEnv.VITE_LT_COL_MARITAL_STATUS || 'Marital Status',
  homeAddress: viteEnv.VITE_LT_COL_HOME_ADDRESS || 'Home Address',
  familyMembers:
    viteEnv.VITE_LT_COL_FAMILY_MEMBERS ||
    'List all family members who will be coming with you: Name, Age, and Gender.',
  birthDate: viteEnv.VITE_LT_COL_BIRTH_DATE || 'BirthDate',
  spousePassport:
    viteEnv.VITE_LT_COL_SPOUSE_PASSPORT || 'Passport Photo of Spouse',
} as const;

export type LongtermColumnKey = keyof typeof longtermColumnMap;

/** Per-slot referee contact columns on the application item (5 slots). */
export const longtermRefereeSlotColumns = [
  {
    slotIndex: 0,
    label: 'Friend',
    nameCol: viteEnv.VITE_LT_REF_FRIEND_NAME || 'Reference (Friend)',
    emailCol: viteEnv.VITE_LT_REF_FRIEND_EMAIL || 'Reference (Friend)',
    phoneCol: viteEnv.VITE_LT_REF_FRIEND_PHONE || 'Reference (Friend)',
    /** email/phone columns use distinct titles on board — resolved by id below */
    nameColumnId: 'text44',
    emailColumnId: 'email4',
    phoneColumnId: 'phone_19',
    relationColumnId:
      viteEnv.VITE_LT_REF_FRIEND_LINK_ID || undefined,
  },
  {
    slotIndex: 1,
    label: 'Employer',
    nameCol: viteEnv.VITE_LT_REF_EMPLOYER_NAME || 'Reference (Employer) Name',
    emailCol: viteEnv.VITE_LT_REF_EMPLOYER_EMAIL || 'Reference (Employer) Email',
    phoneCol: viteEnv.VITE_LT_REF_EMPLOYER_PHONE || 'Reference (Employer) Phone',
    nameColumnId: 'short_textjcxt5gn4',
    emailColumnId: 'emailyuq6khki',
    phoneColumnId: 'phonectspcpc2',
    relationColumnId:
      viteEnv.VITE_LT_REF_EMPLOYER_LINK_ID || 'board_relation_mm3pbyk1',
    relationBoardId: viteEnv.VITE_LT_EMPLOYER_REFERENCE_BOARD_ID || '18414703692',
  },
  {
    slotIndex: 2,
    label: 'Pastor',
    nameCol: viteEnv.VITE_LT_REF_PASTOR_NAME || 'Reference (Pastor)',
    emailCol: viteEnv.VITE_LT_REF_PASTOR_EMAIL || 'Reference (Pastor)',
    phoneCol: viteEnv.VITE_LT_REF_PASTOR_PHONE || 'Reference (Pastor)',
    nameColumnId: 'text69',
    emailColumnId: 'email1',
    phoneColumnId: 'phone_1',
    relationColumnId:
      viteEnv.VITE_LT_REF_PASTOR_LINK_ID || 'link_to_pastors_reference',
  },
  {
    slotIndex: 3,
    label: 'Youth Pastor / Mentor',
    nameCol:
      viteEnv.VITE_LT_REF_MENTOR_NAME || 'Reference (Youth Pastor/Mentor)',
    emailCol:
      viteEnv.VITE_LT_REF_MENTOR_EMAIL || 'Reference (Youth Pastor/Mentor)',
    phoneCol:
      viteEnv.VITE_LT_REF_MENTOR_PHONE || 'Reference (Youth Pastor/Mentor)',
    nameColumnId: 'text05',
    emailColumnId: 'email7',
    phoneColumnId: 'phone_15',
  },
  {
    slotIndex: 4,
    label: 'Parent',
    nameCol: viteEnv.VITE_LT_REF_PARENT_NAME || 'Reference (Parent)',
    emailCol: viteEnv.VITE_LT_REF_PARENT_EMAIL || 'Reference (Parent)',
    phoneCol: viteEnv.VITE_LT_REF_PARENT_PHONE || 'Reference (Parent)',
    nameColumnId: 'text51',
    emailColumnId: 'email6',
    phoneColumnId: 'phone_14',
  },
] as const;

/** Pipeline group title → CRM status id */
export const LONGTERM_GROUP_TO_STATUS: Record<string, string> = {
  'New Applications': 'New',
  'References Sent': 'references sent',
  Holding: 'Holding',
  Approved: 'approved',
  Clearances: 'clearances',
  Preparation: 'prepartation',
};

/** On-field group title → field location */
export const LONGTERM_GROUP_TO_FIELD: Record<string, string> = {
  'Lesvos Team': 'Lesvos',
  'Malakasa Team': 'Malakasa',
  'Taunusstein Team': 'Taunusstien',
  'Neustadt Team': 'Neustadt',
  'Giessen Team': 'Giessen',
  'Intern Team': 'Intern',
};

export const LONGTERM_PIPELINE_GROUPS = new Set(
  Object.keys(LONGTERM_GROUP_TO_STATUS),
);

export const LONGTERM_FIELD_GROUPS = new Set(
  Object.keys(LONGTERM_GROUP_TO_FIELD),
);
