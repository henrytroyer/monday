/**
 * resolveSectionPermission.ts — Merge section catalog domains with DEV overrides.
 *
 * Domain view = full access for that domain (no separate edit/upload keys).
 */

import type { PermissionKey } from './permissionKeys';
import {
  SECTION_BY_ID,
  VISIBILITY_DOMAIN_META,
  domainFromPermissionKey,
  isVisibilityDomain,
  type SectionId,
  type SectionVisibilityOverrides,
  type VisibilityDomain,
} from './sectionCatalog';

export function getDomainForSection(
  sectionId: SectionId,
  overrides?: SectionVisibilityOverrides | null,
): VisibilityDomain {
  const override = overrides?.[sectionId];
  if (override && isVisibilityDomain(override)) return override;
  return SECTION_BY_ID[sectionId]?.domain ?? 'contacts';
}

/** View permission that unlocks the whole domain. */
export function getRequiredPermissionForSection(
  sectionId: SectionId,
  overrides?: SectionVisibilityOverrides | null,
): PermissionKey {
  const domain = getDomainForSection(sectionId, overrides);
  return VISIBILITY_DOMAIN_META[domain].viewPermission;
}

export function canViewSection(
  sectionId: SectionId,
  permissions: Set<PermissionKey>,
  overrides?: SectionVisibilityOverrides | null,
): boolean {
  return permissions.has(
    getRequiredPermissionForSection(sectionId, overrides),
  );
}

export function canAccessDomain(
  domain: VisibilityDomain,
  permissions: Set<PermissionKey>,
): boolean {
  return permissions.has(VISIBILITY_DOMAIN_META[domain].viewPermission);
}

/** Keep only known section ids and domains; migrate legacy permission-key overrides. */
export function sanitizeSectionVisibilityOverrides(
  raw: unknown,
): SectionVisibilityOverrides {
  if (!raw || typeof raw !== 'object') return {};
  const out: SectionVisibilityOverrides = {};
  for (const [key, value] of Object.entries(
    raw as Record<string, unknown>,
  )) {
    if (!(key in SECTION_BY_ID)) continue;
    if (typeof value !== 'string') continue;
    const domain = domainFromPermissionKey(value);
    if (!domain) continue;
    const def = SECTION_BY_ID[key as SectionId];
    if (domain === def.domain) continue; // store overrides only
    out[key as SectionId] = domain;
  }
  return out;
}
