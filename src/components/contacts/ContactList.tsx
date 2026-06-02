import type { ContactListItem } from '../../types/contact';
import { CONTACT_TAG_LABELS } from '../../types/contact';
import VolunteerAvatar from '../applications/VolunteerAvatar';

interface ContactListProps {
  contacts: ContactListItem[];
  onSelect: (contact: ContactListItem) => void;
}

export default function ContactList({ contacts, onSelect }: ContactListProps) {
  if (contacts.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center">
        <p className="text-lg font-semibold text-slate-900">No contacts found</p>
        <p className="mt-2 text-slate-500">
          Try clearing filters or adjusting your search.
        </p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-slate-100 rounded-3xl border border-slate-200 bg-white shadow-sm">
      {contacts.map((contact) => (
        <li key={contact.id}>
          <button
            type="button"
            onClick={() => onSelect(contact)}
            className="flex w-full items-center gap-4 px-5 py-4 text-left transition hover:bg-slate-50"
          >
            <VolunteerAvatar
              name={contact.name}
              profilePhotoUrl={contact.profilePhotoUrl}
              size="sm"
            />
            <div className="min-w-0 flex-1">
              <div className="font-semibold text-slate-900">{contact.name}</div>
              <div className="truncate text-sm text-slate-500">
                {contact.email}
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {contact.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700"
                  >
                    {CONTACT_TAG_LABELS[tag]}
                  </span>
                ))}
              </div>
            </div>
            <span className="shrink-0 text-slate-400">→</span>
          </button>
        </li>
      ))}
    </ul>
  );
}
