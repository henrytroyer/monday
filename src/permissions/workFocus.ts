/**
 * workFocus.ts — Operator work focus (role-shaped CRM layout).
 *
 * Derives a primary job focus from CrmRole tags, then supplies section render
 * order for Contact / Application / Term detail panels. Access control stays
 * in sectionCatalog + SectionGate; this only reorders what is already visible.
 */

import type { CrmRole } from './roles';
import type { SectionId } from './sectionCatalog';

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

/** Specialty role → focus. First match in this order wins for multi-role. */
const ROLE_FOCUS_PRIORITY: Array<{ role: CrmRole; focus: WorkFocus }> = [
  { role: 'FINANCE', focus: 'finance' },
  { role: 'HR', focus: 'hr' },
  { role: 'COMMUNICATIONS', focus: 'communications' },
];

export function isWorkFocus(value: string): value is WorkFocus {
  return (WORK_FOCUSES as readonly string[]).includes(value);
}

/** Derive work focus from operator roles (FINANCE > HR > COMMUNICATIONS > general). */
export function resolveWorkFocus(roles: readonly CrmRole[]): WorkFocus {
  for (const { role, focus } of ROLE_FOCUS_PRIORITY) {
    if (roles.includes(role)) return focus;
  }
  return 'general';
}

/**
 * Effective focus: optional local override, else derived from roles.
 * Invalid overrides fall back to derived.
 */
export function effectiveWorkFocus(
  roles: readonly CrmRole[],
  override: string | null | undefined,
): WorkFocus {
  if (override && isWorkFocus(override)) return override;
  return resolveWorkFocus(roles);
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
    'application.onboarding',
    'application.invoice',
    'application.term_notes',
    'application.email',
    'application.activity',
  ],
  hr: [
    'application.contact_card',
    'application.onboarding',
    'application.term_notes',
    'application.email',
    'application.activity',
    'application.invoice',
  ],
  finance: [
    'application.contact_card',
    'application.invoice',
    'application.onboarding',
    'application.email',
    'application.activity',
    'application.term_notes',
  ],
  communications: [
    'application.contact_card',
    'application.email',
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
  focus: WorkFocus,
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
