/**
 * filterContactForPermissions.ts — Strip sensitive fields for unauthorized operators.
 *
 * Uses visibility domains (view = full domain access) via the section catalog.
 * When CRM RBAC is disabled, returns contacts unchanged.
 */

import { CRM_PERMISSIONS_DISABLED } from '../permissions/crmPermissionsDisabled';
import { getSectionVisibilityOverrides } from '../permissions/crmPermissionsRuntime';
import type { PermissionKey } from '../permissions/permissionKeys';
import { canAccessDomain } from '../permissions/resolveSectionPermission';
import { getDomainForSection } from '../permissions/resolveSectionPermission';
import type {
  SectionId,
  SectionVisibilityOverrides,
  VisibilityDomain,
} from '../permissions/sectionCatalog';
import type { ContactDetail, ContactListItem } from '../types/contact';
import type { VolunteerDetail } from '../types/volunteer';
import { slimBillingTerms } from './slimBillingTerms';

function overridesOrRuntime(
  overrides?: SectionVisibilityOverrides | null,
): SectionVisibilityOverrides {
  return overrides ?? getSectionVisibilityOverrides();
}

function hasDomain(
  perms: Set<PermissionKey>,
  sectionId: SectionId,
  overrides: SectionVisibilityOverrides,
): boolean {
  const domain: VisibilityDomain = getDomainForSection(sectionId, overrides);
  return canAccessDomain(domain, perms);
}

/** BASIC-safe contact detail projection. */
export function filterContactForPermissions(
  contact: ContactDetail,
  permissions: Set<PermissionKey>,
  overrides?: SectionVisibilityOverrides | null,
): ContactDetail {
  if (CRM_PERMISSIONS_DISABLED) return contact;
  const ov = overridesOrRuntime(overrides);
  const canFinance = hasDomain(permissions, 'contact.donations', ov);
  const canBilling = hasDomain(permissions, 'contact.billing', ov);
  const canHr = hasDomain(permissions, 'contact.terms', ov);
  const canEmail = hasDomain(permissions, 'contact.email_history', ov);

  let serviceTerms = contact.serviceTerms;
  if (canHr) {
    serviceTerms = contact.serviceTerms;
  } else if (canBilling || canFinance) {
    serviceTerms = slimBillingTerms(contact.serviceTerms);
  } else {
    serviceTerms = [];
  }

  return {
    ...contact,
    donations: canFinance ? contact.donations : [],
    linkedDonationItemIds: canFinance
      ? contact.linkedDonationItemIds
      : undefined,
    pastorReference: canHr ? contact.pastorReference : undefined,
    files: canHr ? contact.files : [],
    passportFile: canHr ? contact.passportFile : undefined,
    childSafeguardingFile: canHr ? contact.childSafeguardingFile : undefined,
    passportPhotoUrl: canHr ? contact.passportPhotoUrl : undefined,
    currentApplication: canHr ? contact.currentApplication : null,
    serviceTerms,
    linkedVolunteers: canHr ? contact.linkedVolunteers : [],
    emailCorrespondence: canEmail ? contact.emailCorrespondence : [],
  };
}

/** List items stay lean; strip finance-linked hints when unauthorized. */
export function filterContactListItemForPermissions(
  contact: ContactListItem,
  permissions: Set<PermissionKey>,
  overrides?: SectionVisibilityOverrides | null,
): ContactListItem {
  if (CRM_PERMISSIONS_DISABLED) return contact;
  const ov = overridesOrRuntime(overrides);
  if (hasDomain(permissions, 'contact.donations', ov)) return contact;
  const tags = contact.tags.filter((t) => t !== 'donor');
  return { ...contact, tags };
}

export function filterContactListForPermissions(
  contacts: ContactListItem[],
  permissions: Set<PermissionKey>,
  overrides?: SectionVisibilityOverrides | null,
): ContactListItem[] {
  if (CRM_PERMISSIONS_DISABLED) return contacts;
  return contacts.map((c) =>
    filterContactListItemForPermissions(c, permissions, overrides),
  );
}

export function filterVolunteerDetailForPermissions(
  detail: VolunteerDetail,
  permissions: Set<PermissionKey>,
  overrides?: SectionVisibilityOverrides | null,
): VolunteerDetail {
  if (CRM_PERMISSIONS_DISABLED) return detail;
  const ov = overridesOrRuntime(overrides);
  const next: VolunteerDetail = { ...detail };
  const canHr = hasDomain(permissions, 'application.files', ov);
  const canFinance = hasDomain(permissions, 'application.invoice', ov);

  if (!canHr) {
    next.termNotes = [];
    next.files = [];
    next.passportFile = undefined;
    next.childSafeguardingFile = undefined;
    next.passportPhotoUrl = undefined;
    next.applicationFormFields = [];
    next.pastorReferenceFormFields = [];
  }
  if (!canFinance) {
    next.quickbooksInvoiceId = undefined;
  }

  return next;
}
