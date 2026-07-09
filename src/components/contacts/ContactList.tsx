import type { ContactListItem } from '../../types/contact';
import { CONTACT_TAG_LABELS } from '../../types/contact';
import { contactTagListPillClass } from '../../utils/contactTagStyles';
import {
  getContactSortLetter,
  letterAnchorId,
} from '../../utils/contactSortLetter';
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
      <div className="rounded-3xl border border-dashed border-crm-taupe/28 bg-crm-surface p-12 text-center">
        <p className="text-lg font-semibold text-crm-heading">No contacts found</p>
        <p className="mt-2 text-crm-slate">
          Try clearing filters or adjusting your search.
        </p>
      </div>
    );
  }

  const seenLetters = new Set<string>();

  return (
    <ul className="divide-y divide-crm-taupe/20 rounded-3xl border border-crm-taupe/20 bg-crm-surface shadow-sm">
      {contacts.map((contact) => {
        const letter = getContactSortLetter(contact.name);
        const isFirstForLetter = !seenLetters.has(letter);
        if (isFirstForLetter) {
          seenLetters.add(letter);
        }

        const isSelected = selectedIds.has(contact.id);

        return (
          <li
            key={contact.id}
            id={isFirstForLetter ? letterAnchorId(letter) : undefined}
            className={isSelected ? 'bg-crm-indigo-50/80' : undefined}
          >
            <div className="flex items-stretch gap-1">
              <label className="flex shrink-0 cursor-pointer items-center px-4 py-4">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => onToggleSelect(contact)}
                  onClick={(event) => event.stopPropagation()}
                  aria-label={`Select ${contact.name}`}
                  className="h-4 w-4 rounded border-crm-taupe/40 text-crm-indigo focus:ring-crm-indigo/30"
                />
              </label>

              <button
                type="button"
                onClick={() => onSelect(contact)}
                className="flex min-w-0 flex-1 items-center gap-4 py-4 pr-5 text-left transition hover:bg-crm-taupe-50"
              >
                <VolunteerAvatar
                  name={contact.name}
                  profilePhotoUrl={contact.profilePhotoUrl}
                  size="sm"
                />
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-crm-heading">{contact.name}</div>
                  <div className="truncate text-sm text-crm-slate">
                    {contact.email}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {contact.tags.map((tag) => (
                      <span key={tag} className={contactTagListPillClass(tag)}>
                        {CONTACT_TAG_LABELS[tag]}
                      </span>
                    ))}
                  </div>
                </div>
                <span className="shrink-0 text-crm-slate">→</span>
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
