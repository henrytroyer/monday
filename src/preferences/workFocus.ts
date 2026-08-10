/**
 * workFocus.ts — Operator work focus (CRM layout preference).
 *
 * Supplies section render order for Contact / Application / Term detail panels.
 * Access is open; this only reorders what is shown.
 */

/** Stable section keys used for detail-panel ordering. */
export const SECTION_IDS = [
  'contact.profile',
  'contact.church',
  'contact.internal_notes',
  'contact.email_history',
  'contact.files',
  'contact.connected_people',
  'contact.current_application',
  'contact.terms',
  'contact.volunteers_referenced',
  'contact.connected_volunteers',
  'contact.donations',
  'contact.billing',
  'contact.term_files',
  'contact.term_notes',
  'contact.term_invoice',
  'contact.term_references',
  'application.contact_card',
  'application.practical_info',
  'application.onboarding',
  'application.invoice',
  'application.term_notes',
  'application.email',
  'application.activity',
  'application.identity',
  'application.files',
  'application.email_send',
  'application.quick_actions',
  'application.full_form',
  'application.pastor_reference',
  'application.longterm_references',
] as const;

export type SectionId = (typeof SECTION_IDS)[number];

export const WORK_FOCUSES = [
  'finance',
  'hr',
  'communications',
  'general',
] as const;

export type WorkFocus = (typeof WORK_FOCUSES)[number];

export const WORK_FOCUS_META: Record<
  WorkFocus,
  { label: string; description: string }
> = {
  finance: {
    label: 'Finance',
    description: 'Donations, billing, and invoices first',
  },
  hr: {
    label: 'HR',
    description: 'Applications, onboarding, and terms first',
  },
  communications: {
    label: 'Communications',
    description: 'Email correspondence first',
  },
  general: {
    label: 'General',
    description: 'Default CRM layout',
  },
};

export function isWorkFocus(value: string): value is WorkFocus {
  return (WORK_FOCUSES as readonly string[]).includes(value);
}

/**
 * Effective focus: optional local override, else general.
 * Invalid overrides fall back to general.
 */
export function effectiveWorkFocus(
  override: string | null | undefined,
): WorkFocus {
  if (override && isWorkFocus(override)) return override;
  return 'general';
}

/** Default landing page id when the operator has not saved a preference. */
export function defaultLandingPageForFocus(focus: WorkFocus): string {
  switch (focus) {
    case 'hr':
      return 'applications';
    case 'communications':
      return 'email-templates';
    case 'finance':
    case 'general':
    default:
      return 'contacts';
  }
}

/** Contact detail section order (profile always first). */
export const CONTACT_SECTION_ORDER: Record<WorkFocus, SectionId[]> = {
  general: [
    'contact.profile',
    'contact.church',
    'contact.internal_notes',
    'contact.email_history',
    'contact.files',
    'contact.connected_people',
    'contact.current_application',
    'contact.terms',
    'contact.volunteers_referenced',
    'contact.connected_volunteers',
    'contact.donations',
    'contact.billing',
  ],
  finance: [
    'contact.profile',
    'contact.donations',
    'contact.billing',
    'contact.connected_people',
    'contact.current_application',
    'contact.terms',
    'contact.church',
    'contact.files',
    'contact.internal_notes',
    'contact.email_history',
    'contact.volunteers_referenced',
    'contact.connected_volunteers',
  ],
  hr: [
    'contact.profile',
    'contact.current_application',
    'contact.terms',
    'contact.church',
    'contact.files',
    'contact.internal_notes',
    'contact.email_history',
    'contact.connected_people',
    'contact.volunteers_referenced',
    'contact.connected_volunteers',
    'contact.donations',
    'contact.billing',
  ],
  communications: [
    'contact.profile',
    'contact.email_history',
    'contact.connected_people',
    'contact.current_application',
    'contact.terms',
    'contact.church',
    'contact.files',
    'contact.internal_notes',
    'contact.volunteers_referenced',
    'contact.connected_volunteers',
    'contact.donations',
    'contact.billing',
  ],
};

/** Application detail order after identity (identity stays sticky above scroll). */
export const APPLICATION_SECTION_ORDER: Record<WorkFocus, SectionId[]> = {
  general: [
    'application.contact_card',
    'application.practical_info',
    'application.onboarding',
    'application.invoice',
    'application.term_notes',
    'application.email',
    'application.activity',
  ],
  hr: [
    'application.contact_card',
    'application.practical_info',
    'application.onboarding',
    'application.term_notes',
    'application.email',
    'application.activity',
    'application.invoice',
  ],
  finance: [
    'application.contact_card',
    'application.invoice',
    'application.practical_info',
    'application.onboarding',
    'application.email',
    'application.activity',
    'application.term_notes',
  ],
  communications: [
    'application.contact_card',
    'application.email',
    'application.practical_info',
    'application.onboarding',
    'application.activity',
    'application.term_notes',
    'application.invoice',
  ],
};

/** Term detail scroll sections (summary is always first, not a SectionId). */
export const TERM_SECTION_ORDER: Record<WorkFocus, SectionId[]> = {
  general: [
    'contact.term_files',
    'contact.terms',
    'contact.term_notes',
    'contact.email_history',
    'contact.term_invoice',
    'contact.term_references',
  ],
  finance: [
    'contact.term_invoice',
    'contact.email_history',
    'contact.term_files',
    'contact.terms',
    'contact.term_notes',
    'contact.term_references',
  ],
  hr: [
    'contact.term_files',
    'contact.terms',
    'contact.term_notes',
    'contact.term_references',
    'contact.term_invoice',
    'contact.email_history',
  ],
  communications: [
    'contact.email_history',
    'contact.term_files',
    'contact.terms',
    'contact.term_notes',
    'contact.term_invoice',
    'contact.term_references',
  ],
};

/**
 * Sort section nodes by focus order. Unknown keys append in original insertion
 * order after known keys.
 */
export function orderSectionEntries<T>(
  _focus: WorkFocus,
  order: readonly SectionId[],
  entries: Partial<Record<SectionId, T>>,
): T[] {
  const seen = new Set<SectionId>();
  const ordered: T[] = [];
  for (const id of order) {
    const node = entries[id];
    if (node !== undefined) {
      ordered.push(node);
      seen.add(id);
    }
  }
  for (const [id, node] of Object.entries(entries) as Array<
    [SectionId, T | undefined]
  >) {
    if (node !== undefined && !seen.has(id)) ordered.push(node);
  }
  return ordered;
}

export function contactSectionOrder(focus: WorkFocus): SectionId[] {
  return CONTACT_SECTION_ORDER[focus];
}

export function applicationSectionOrder(focus: WorkFocus): SectionId[] {
  return APPLICATION_SECTION_ORDER[focus];
}

export function termSectionOrder(focus: WorkFocus): SectionId[] {
  return TERM_SECTION_ORDER[focus];
}
