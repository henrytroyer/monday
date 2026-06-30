import type { ContactDetail } from '../types/contact';
import type { ContactCoreFields } from './contactStorage';
import { ensureContactTag } from './contactStorage';
import {
  findProspectByContactId,
  updateRecruitmentProspect,
} from './recruitmentStorage';

function fieldsMatch(
  a: ContactCoreFields,
  b: ContactCoreFields,
): boolean {
  return (
    a.name.trim() === b.name.trim() &&
    (a.email === '—' ? '' : a.email.trim()) ===
      (b.email === '—' ? '' : b.email.trim()) &&
    (a.phone?.trim() ?? '') === (b.phone?.trim() ?? '')
  );
}

/** Push contact profile edits to the linked active recruitment prospect. */
export function onContactCoreFieldsUpdated(
  contactId: string,
  fields: ContactCoreFields,
): void {
  const prospect = findProspectByContactId(contactId);
  if (!prospect) return;

  const prospectFields: ContactCoreFields = {
    name: prospect.name,
    email: prospect.email || '—',
    phone: prospect.phone || undefined,
  };

  if (fieldsMatch(fields, prospectFields)) return;

  updateRecruitmentProspect(
    prospect.id,
    {
      name: fields.name.trim(),
      email: fields.email === '—' ? '' : fields.email.trim(),
      phone: fields.phone?.trim() ?? '',
    },
    { skipContactSync: true },
  );
}

export function onContactSentToRecruitment(detail: ContactDetail): void {
  ensureContactTag(detail.id, 'recruitment');
}
