import { useEffect, useMemo, useRef, useState } from 'react';
import type { ContactListItem } from '../../types/contact';

interface ContactAttachSearchProps {
  contacts: ContactListItem[];
  loading?: boolean;
  value: string;
  suggestedContactId?: string;
  suggestedContactName?: string;
  onChange: (contactId: string, contact: ContactListItem | null) => void;
  onRequestLoad?: () => void;
  inputId?: string;
}

export default function ContactAttachSearch({
  contacts,
  loading = false,
  value,
  suggestedContactId,
  suggestedContactName,
  onChange,
  onRequestLoad,
  inputId,
}: ContactAttachSearchProps) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const selected = contacts.find((contact) => contact.id === value) ?? null;

  useEffect(() => {
    onRequestLoad?.();
  }, [onRequestLoad]);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [open]);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    let list = contacts;

    if (normalized) {
      list = contacts.filter((contact) => {
        const haystack = `${contact.name} ${contact.email} ${contact.phone ?? ''}`.toLowerCase();
        return haystack.includes(normalized);
      });
    }

    return list.slice(0, 25);
  }, [contacts, query]);

  const showSuggested =
    suggestedContactId &&
    !filtered.some((contact) => contact.id === suggestedContactId) &&
    (!query.trim() ||
      `${suggestedContactName ?? ''}`.toLowerCase().includes(query.trim().toLowerCase()));

  function selectContact(contact: ContactListItem) {
    onChange(contact.id, contact);
    setQuery('');
    setOpen(false);
  }

  function clearSelection() {
    onChange('', null);
    setQuery('');
    setOpen(true);
  }

  return (
    <div ref={rootRef} className="relative min-w-0">
      {selected && !open ? (
        <div className="flex min-w-0 items-center gap-2 rounded-xl border border-crm-taupe/20 bg-crm-surface px-3 py-2">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-crm-heading">
              {selected.name}
            </p>
            {selected.email !== '—' && (
              <p className="truncate text-xs text-crm-slate">{selected.email}</p>
            )}
          </div>
          <button
            type="button"
            onClick={clearSelection}
            className="shrink-0 text-xs font-medium text-crm-indigo hover:text-crm-indigo-dark"
          >
            Change
          </button>
        </div>
      ) : (
        <>
          <label htmlFor={inputId} className="sr-only">
            Search contacts
          </label>
          <input
            id={inputId}
            type="search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            placeholder={
              loading ? 'Loading contacts…' : 'Search contacts by name or email…'
            }
            disabled={loading}
            className="w-full rounded-xl border border-crm-taupe/20 bg-crm-surface px-3 py-2 text-sm outline-none focus:border-crm-slate focus:ring-2 focus:ring-crm-taupe/20 disabled:opacity-60"
            autoComplete="off"
          />
          {open && (
            <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border border-crm-taupe/20 bg-crm-surface py-1 shadow-lg">
              {showSuggested && suggestedContactId && (
                <li>
                  <button
                    type="button"
                    onClick={() =>
                      selectContact({
                        id: suggestedContactId,
                        name: suggestedContactName ?? 'Suggested contact',
                        email: '—',
                        tags: [],
                      })
                    }
                    className="w-full px-3 py-2 text-left text-sm hover:bg-crm-indigo-50"
                  >
                    <span className="font-medium text-crm-heading">
                      Suggested: {suggestedContactName ?? 'Contact'}
                    </span>
                  </button>
                </li>
              )}
              {filtered.length === 0 ? (
                <li className="px-3 py-2 text-sm text-crm-slate">
                  {loading ? 'Loading contacts…' : 'No contacts match your search.'}
                </li>
              ) : (
                filtered.map((contact) => (
                  <li key={contact.id}>
                    <button
                      type="button"
                      onClick={() => selectContact(contact)}
                      className={`w-full px-3 py-2 text-left text-sm hover:bg-crm-taupe-50 ${
                        contact.id === value ? 'bg-crm-indigo-50' : ''
                      }`}
                    >
                      <span className="font-medium text-crm-heading">
                        {contact.name}
                      </span>
                      {contact.email !== '—' && (
                        <span className="mt-0.5 block truncate text-xs text-crm-slate">
                          {contact.email}
                        </span>
                      )}
                    </button>
                  </li>
                ))
              )}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
