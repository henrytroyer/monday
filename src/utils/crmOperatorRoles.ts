/**
 * crmOperatorRoles.ts — i58finance Admin role ranks for private-note UI.
 *
 * ACL is enforced server-side; this mirror is for badges / local-dev helpers.
 * Keep in sync with i58finance `ROLE_HIERARCHY` (src/utils/roles.ts).
 */

export type CrmOperatorRole =
  | 'user'
  | 'pr'
  | 'finance_team'
  | 'admin'
  | 'super_admin'
  | 'ceo'
  | 'cfo'
  | 'board_member'
  | 'field_director';

/** Higher number = more senior. */
export const CRM_ROLE_HIERARCHY: Record<CrmOperatorRole, number> = {
  ceo: 9,
  cfo: 8,
  super_admin: 7,
  board_member: 6,
  field_director: 5,
  finance_team: 4,
  admin: 3,
  pr: 2,
  user: 1,
};

export function normalizeCrmRole(role: string | null | undefined): string {
  return String(role ?? '')
    .trim()
    .toLowerCase();
}

/** Unknown / missing roles resolve to the lowest rank (user = 1). */
export function crmRoleRank(role: string | null | undefined): number {
  const normalized = normalizeCrmRole(role);
  if (normalized in CRM_ROLE_HIERARCHY) {
    return CRM_ROLE_HIERARCHY[normalized as CrmOperatorRole];
  }
  return CRM_ROLE_HIERARCHY.user;
}

/** True when viewerRank is strictly above authorRank. */
export function isCrmRoleAbove(
  viewerRole: string | null | undefined,
  authorRole: string | null | undefined,
): boolean {
  return crmRoleRank(viewerRole) > crmRoleRank(authorRole);
}
