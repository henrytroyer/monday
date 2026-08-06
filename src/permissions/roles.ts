/**
 * roles.ts — CRM operator system roles (Monday Project only).
 */

export const CRM_ROLES = [
  'BASIC',
  'HR',
  'FINANCE',
  'COMMUNICATIONS',
  'ADMIN',
  'DEV',
] as const;

export type CrmRole = (typeof CRM_ROLES)[number];

export const CRM_ROLE_META: Record<
  CrmRole,
  { displayName: string; description: string; system: true }
> = {
  BASIC: {
    displayName: 'Basic',
    description: 'Non-sensitive contact profile access only.',
    system: true,
  },
  HR: {
    displayName: 'HR',
    description: 'Applications, references, and confidential personnel info.',
    system: true,
  },
  FINANCE: {
    displayName: 'Finance',
    description: 'Donations, invoices, and financial reports.',
    system: true,
  },
  COMMUNICATIONS: {
    displayName: 'Communications',
    description: 'Email, templates, and campaigns (non-confidential).',
    system: true,
  },
  ADMIN: {
    displayName: 'Admin',
    description: 'User management and normal CRM administration (not Settings).',
    system: true,
  },
  DEV: {
    displayName: 'Developer',
    description: 'Full access including Settings, permissions, and audit logs.',
    system: true,
  },
};

export function isCrmRole(value: string): value is CrmRole {
  return (CRM_ROLES as readonly string[]).includes(value);
}

export function normalizeCrmRoles(roles: string[] | undefined | null): CrmRole[] {
  const next = new Set<CrmRole>();
  for (const raw of roles ?? []) {
    const key = String(raw ?? '')
      .trim()
      .toUpperCase();
    if (isCrmRole(key)) next.add(key);
  }
  if (next.size === 0) next.add('BASIC');
  if (![...next].some((r) => r === 'BASIC') && ![...next].includes('DEV')) {
    // Spec: every active user has BASIC; DEV implies full access but still keep BASIC tag when present.
  }
  if (![...next].includes('BASIC')) next.add('BASIC');
  return CRM_ROLES.filter((role) => next.has(role));
}
