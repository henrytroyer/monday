/**
 * filterContactForPermissions.ts — Strip sensitive fields for unauthorized operators.
 */

import type { PermissionKey } from '../permissions/permissionKeys';
import type { ContactDetail, ContactListItem } from '../types/contact';
import type { VolunteerDetail } from '../types/volunteer';

function allowed(perms: Set<PermissionKey>, key: PermissionKey): boolean {
  return perms.has(key);
}

/** BASIC-safe contact detail projection. */
export function filterContactForPermissions(
  contact: ContactDetail,
  permissions: Set<PermissionKey>,
): ContactDetail {
  const canFinance = allowed(permissions, 'finance.donations.view');
  const canHrRefs = allowed(permissions, 'hr.references.view');
  const canHrDocs = allowed(permissions, 'hr.documents.view');

  const next: ContactDetail = {
    ...contact,
    donations: canFinance ? contact.donations : [],
    linkedDonationItemIds: canFinance
      ? contact.linkedDonationItemIds
      : undefined,
    pastorReference: canHrRefs ? contact.pastorReference : undefined,
    files: canHrDocs ? contact.files : [],
    passportFile: canHrDocs ? contact.passportFile : undefined,
    childSafeguardingFile: canHrDocs
      ? contact.childSafeguardingFile
      : undefined,
    passportPhotoUrl: canHrDocs ? contact.passportPhotoUrl : undefined,
  };

  return next;
}

/** List items stay lean; strip finance-linked hints when unauthorized. */
export function filterContactListItemForPermissions(
  contact: ContactListItem,
  permissions: Set<PermissionKey>,
): ContactListItem {
  if (allowed(permissions, 'finance.donations.view')) return contact;
  const tags = contact.tags.filter((t) => t !== 'donor');
  return { ...contact, tags };
}

export function filterVolunteerDetailForPermissions(
  detail: VolunteerDetail,
  permissions: Set<PermissionKey>,
): VolunteerDetail {
  const next: VolunteerDetail = { ...detail };
  if (!allowed(permissions, 'hr.confidential_notes.view')) {
    next.termNotes = [];
  }
  if (!allowed(permissions, 'hr.documents.view')) {
    next.files = [];
  }
  return next;
}
