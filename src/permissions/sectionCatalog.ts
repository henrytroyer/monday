/**
 * sectionCatalog.ts — CRM section → visibility domain (code defaults).
 *
 * Domains are simple tags (HR, Finance, …). If an operator can view a domain,
 * they have full access to every section in that domain (no view vs edit split).
 *
 * DEV overrides live on Portal Things `sectionVisibilityOverrides`.
 */

import type { PermissionKey } from './permissionKeys';

export const SECTION_AREAS = [
  'contacts',
  'applications',
  'navigation',
  'account',
] as const;

export type SectionArea = (typeof SECTION_AREAS)[number];

/** Simple access domains — pick one of these in Settings, not granular keys. */
export const VISIBILITY_DOMAINS = [
  'contacts',
  'hr',
  'finance',
  'communications',
  'history',
  'users',
  'settings',
] as const;

export type VisibilityDomain = (typeof VISIBILITY_DOMAINS)[number];

export const VISIBILITY_DOMAIN_META: Record<
  VisibilityDomain,
  { label: string; description: string; viewPermission: PermissionKey }
> = {
  contacts: {
    label: 'Contacts',
    description: 'Basic profile identity shared with everyone who can open Contacts',
    viewPermission: 'contacts.view',
  },
  hr: {
    label: 'HR',
    description: 'Applications, files, references, notes, recruitment, long-term',
    viewPermission: 'hr.view',
  },
  finance: {
    label: 'Finance',
    description: 'Donations, invoices, and finance reports',
    viewPermission: 'finance.view',
  },
  communications: {
    label: 'Communications',
    description: 'Email history, send, templates, and campaigns',
    viewPermission: 'communications.view',
  },
  history: {
    label: 'History',
    description: 'Activity history and application activity timelines',
    viewPermission: 'history.view',
  },
  users: {
    label: 'Users',
    description: 'CRM operator user management',
    viewPermission: 'users.view',
  },
  settings: {
    label: 'Settings',
    description: 'Roles, visibility, audit, forms, automations',
    viewPermission: 'settings.view',
  },
};

export const SECTION_IDS = [
  'contact.profile',
  'contact.connected_people',
  'contact.church',
  'contact.files',
  'contact.internal_notes',
  'contact.email_history',
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

  'application.identity',
  'application.contact_card',
  'application.files',
  'application.quick_actions',
  'application.onboarding',
  'application.full_form',
  'application.pastor_reference',
  'application.longterm_references',
  'application.term_notes',
  'application.invoice',
  'application.email',
  'application.email_send',
  'application.activity',

  'nav.contacts',
  'nav.applications',
  'nav.recruitment',
  'nav.longterm-applications',
  'nav.email-templates',
  'nav.email-campaigns',
  'nav.history',
  'nav.users',
  'nav.forms',
  'nav.automations',
  'nav.user-settings',
  'nav.roles-permissions',
  'nav.audit-log',
  'nav.contact-merge-ops',
] as const;

export type SectionId = (typeof SECTION_IDS)[number];

export interface SectionDef {
  id: SectionId;
  label: string;
  area: SectionArea;
  domain: VisibilityDomain;
  description: string;
}

function def(
  id: SectionId,
  label: string,
  area: SectionArea,
  domain: VisibilityDomain,
  description: string,
): SectionDef {
  return { id, label, area, domain, description };
}

/** Code defaults — CRM works without Portal Things overrides. */
export const SECTION_CATALOG: SectionDef[] = [
  def('contact.profile', 'Contact profile', 'contacts', 'contacts', 'Name, email, phone, DOB, address, tags'),
  def('contact.connected_people', 'Connected people', 'contacts', 'contacts', 'Spouse, connected-to, emergency contact'),
  def('contact.church', 'Church / pastor', 'contacts', 'hr', 'Pastor and church reference card'),
  def('contact.files', 'Contact files', 'contacts', 'hr', 'Passport, safeguarding, gallery files'),
  def('contact.internal_notes', 'Internal notes', 'contacts', 'hr', 'Confidential contact / term notes'),
  def('contact.email_history', 'Email correspondence', 'contacts', 'communications', 'Contact email history'),
  def('contact.current_application', 'Current application', 'contacts', 'hr', 'Active pipeline application summary'),
  def('contact.terms', 'Terms of service', 'contacts', 'hr', 'Service terms list and term drill-down'),
  def('contact.volunteers_referenced', 'Volunteers referenced', 'contacts', 'hr', 'Pastor-linked volunteer applications'),
  def('contact.connected_volunteers', 'Connected volunteers', 'contacts', 'hr', 'Parent-linked volunteers'),
  def('contact.donations', 'Donations & payments', 'contacts', 'finance', 'Donation history and receipts'),
  def('contact.billing', 'Billing & invoices', 'contacts', 'finance', 'Service-term billing list and QuickBooks invoices without full HR term chrome'),
  def('contact.term_files', 'Term files', 'contacts', 'hr', 'Files inside a term of service'),
  def('contact.term_notes', 'Term notes', 'contacts', 'hr', 'Notes inside a term of service'),
  def('contact.term_invoice', 'Term invoice', 'contacts', 'finance', 'QuickBooks invoice on a term'),
  def('contact.term_references', 'Term references & application', 'contacts', 'hr', 'References block inside a term'),

  def('application.identity', 'Application identity bar', 'applications', 'contacts', 'Name, status, location strip'),
  def('application.contact_card', 'Application contact card', 'applications', 'contacts', 'Email, phone, DOB, address on application'),
  def('application.files', 'Application files', 'applications', 'hr', 'Files on the application contact card'),
  def('application.quick_actions', 'Application quick actions', 'applications', 'hr', 'Open monday, full application, pastor reference'),
  def('application.onboarding', 'Onboarding progress', 'applications', 'hr', 'Onboarding checklist'),
  def('application.full_form', 'Full application form', 'applications', 'hr', 'Application Q&A fields'),
  def('application.pastor_reference', 'Pastor reference form', 'applications', 'hr', 'Pastor reference Q&A'),
  def('application.longterm_references', 'Long-term references', 'applications', 'hr', 'Long-term reference command center'),
  def('application.term_notes', 'Application term notes', 'applications', 'hr', 'Confidential notes on the application'),
  def('application.invoice', 'Application invoice', 'applications', 'finance', 'Invoice paid / QuickBooks on onboarding'),
  def('application.email', 'Application email history', 'applications', 'communications', 'Term email correspondence'),
  def('application.email_send', 'Send application email', 'applications', 'communications', 'Send email quick action and modal'),
  def('application.activity', 'Application activity', 'applications', 'history', 'Application activity timeline'),

  def('nav.contacts', 'Menu: Contacts', 'navigation', 'contacts', 'Sidebar Contacts'),
  def('nav.applications', 'Menu: Short-term applications', 'navigation', 'hr', 'Sidebar short-term applications'),
  def('nav.recruitment', 'Menu: Recruitment', 'navigation', 'hr', 'Sidebar recruitment'),
  def('nav.longterm-applications', 'Menu: Long-term applications', 'navigation', 'hr', 'Sidebar long-term applications'),
  def('nav.email-templates', 'Menu: Email templates', 'navigation', 'communications', 'Sidebar email templates'),
  def('nav.email-campaigns', 'Menu: Email campaigns', 'navigation', 'communications', 'Sidebar email campaigns'),
  def('nav.history', 'Menu: History', 'navigation', 'history', 'Sidebar history'),
  def('nav.users', 'Menu: Users', 'navigation', 'users', 'Sidebar users'),
  def('nav.forms', 'Menu: Forms', 'navigation', 'settings', 'Sidebar forms'),
  def('nav.automations', 'Menu: Automations', 'navigation', 'settings', 'Sidebar automations'),
  def('nav.user-settings', 'Menu: User settings', 'account', 'contacts', 'Account menu user settings'),
  def('nav.roles-permissions', 'Menu: Roles & permissions', 'navigation', 'settings', 'Settings roles matrix + visibility'),
  def('nav.audit-log', 'Menu: Audit log', 'navigation', 'settings', 'Settings audit log'),
  def('nav.contact-merge-ops', 'Menu: Contact merge ops', 'navigation', 'contacts', 'Settings contact merge reports'),
];

export const SECTION_BY_ID: Record<SectionId, SectionDef> = Object.fromEntries(
  SECTION_CATALOG.map((s) => [s.id, s]),
) as Record<SectionId, SectionDef>;

/** Overrides store domain tags only. */
export type SectionVisibilityOverrides = Partial<
  Record<SectionId, VisibilityDomain>
>;

export function isSectionId(value: string): value is SectionId {
  return (SECTION_IDS as readonly string[]).includes(value);
}

export function isVisibilityDomain(value: string): value is VisibilityDomain {
  return (VISIBILITY_DOMAINS as readonly string[]).includes(value);
}

export function navSectionIdForPage(pageId: string): SectionId | null {
  const id = `nav.${pageId}`;
  return isSectionId(id) ? id : null;
}

/** Map a legacy permission key (or domain string) onto a visibility domain. */
export function domainFromPermissionKey(key: string): VisibilityDomain | null {
  if (isVisibilityDomain(key)) return key;
  const prefix = key.split('.')[0];
  if (isVisibilityDomain(prefix)) return prefix;
  return null;
}
