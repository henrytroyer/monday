/**
 * ContactList.tsx — Alphabetized contacts list with optional couple merge rows.
 */

import type { ContactListItem } from '../../types/contact';
import { CONTACT_TAG_LABELS } from '../../types/contact';
import {
  getContactSortLetter,
  letterAnchorId,
} from '../../utils/contactSortLetter';
import {
  isContactCoupleUnit,
  mergeContactsIntoCoupleUnits,
} from '../../utils/contactCoupleMerge';
import VolunteerAvatar from '../applications/VolunteerAvatar';

interface ContactListProps {
  contacts: ContactListItem[];
  selectedIds: Set<string>;
  onToggleSelect: (contact: ContactListItem) => void;
  onSelect: (contact: ContactListItem) => void;
}

export default function ContactList({
  contacts,
  selectedIds,
  onToggleSelect,
  onSelect,
}: ContactListProps) {
  if (contacts.length === 0) {
    return (
      <div className="px-4 py-12 text-center">
        <p className="text-lg font-semibold text-crm-heading">No contacts found</p>
        <p className="mt-2 text-crm-slate">
          Try clearing filters or adjusting your search.
        </p>
      </div>
    );
  }

  const entries = mergeContactsIntoCoupleUnits(contacts);
  const seenLetters = new Set<string>();

  return (
    <ul className="divide-y divide-crm-taupe/15">
      {entries.map((entry) => {
        const contact = isContactCoupleUnit(entry) ? entry.primary : entry;
        const spouse = isContactCoupleUnit(entry) ? entry.spouse : undefined;
        const displayName = isContactCoupleUnit(entry)
          ? entry.label
          : contact.name;
        const letter = getContactSortLetter(displayName);
        const isFirstForLetter = !seenLetters.has(letter);
        if (isFirstForLetter) {
          seenLetters.add(letter);
        }

        const isSelected = selectedIds.has(contact.id);
        const tags = [
          ...new Set([
            ...contact.tags,
            ...(spouse?.tags ?? []),
          ]),
        ];
        const emailLine = spouse
          ? `${contact.email} · ${spouse.email}`
          : contact.email;
        const tagLine = tags.map((tag) => CONTACT_TAG_LABELS[tag]).join(' · ');
        const metaLine = [emailLine, tagLine].filter(Boolean).join(' · ');

        return (
          <li
            key={isContactCoupleUnit(entry) ? entry.key : contact.id}
            id={isFirstForLetter ? letterAnchorId(letter) : undefined}
            className={
              isSelected
                ? 'bg-crm-indigo-50/80'
                : 'hover:bg-crm-taupe-50/80'
            }
          >
            <div className="flex items-stretch">
              <label className="flex shrink-0 cursor-pointer items-center px-4 py-2.5">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => onToggleSelect(contact)}
                  onClick={(event) => event.stopPropagation()}
                  aria-label={`Select ${displayName}`}
                  className="h-4 w-4 rounded border-crm-taupe/40 text-crm-indigo focus:ring-crm-indigo/30"
                />
              </label>

              <div className="flex min-w-0 flex-1 items-center gap-3 py-2.5 pr-4">
                <button
                  type="button"
                  onClick={() => onSelect(contact)}
                  className="flex min-w-0 flex-1 items-center gap-3 text-left transition hover:opacity-90"
                >
                  <VolunteerAvatar
                    name={displayName}
                    profilePhotoUrl={contact.profilePhotoUrl}
                    size="sm"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-crm-heading">
                      {displayName}
                    </div>
                    <div className="truncate text-sm text-crm-slate">
                      {metaLine}
                    </div>
                  </div>
                </button>
                {spouse && (
                  <button
                    type="button"
                    className="shrink-0 text-xs font-medium text-crm-indigo hover:underline"
                    onClick={() => onSelect(spouse)}
                  >
                    Open {spouse.name}
                  </button>
                )}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
