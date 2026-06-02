import { useMemo, useState } from 'react';
import ContactDetailPanel from '../components/contacts/ContactDetailPanel';
import ContactFilters from '../components/contacts/ContactFilters';
import ContactList from '../components/contacts/ContactList';
import { useContactsList } from '../hooks/useContactsList';
import type { ContactListItem } from '../types/contact';
import { emptyContactFilters } from '../types/contact';
import {
  countMatchingContacts,
  filterContacts,
} from '../utils/filterContacts';

export default function ContactsPage() {
  const [filters, setFilters] = useState(emptyContactFilters());
  const [selectedContact, setSelectedContact] =
    useState<ContactListItem | null>(null);

  const { contacts, loading, error, isMock, refetch } = useContactsList();

  const filtered = useMemo(
    () => filterContacts(contacts, filters),
    [contacts, filters],
  );

  const matchingCount = useMemo(
    () => countMatchingContacts(contacts, filters),
    [contacts, filters],
  );

  const showingDetail = selectedContact !== null;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="mb-6 flex shrink-0 flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold">Contacts</h1>
          {!showingDetail && (
            <p className="mt-2 text-slate-500">
              Master list of volunteers, pastors, parents, and donors.
            </p>
          )}
          {!showingDetail && !isMock && (
            <p className="mt-2 text-xs text-slate-400">
              Live data from monday.com Contacts board
            </p>
          )}
          {!showingDetail && isMock && (
            <p className="mt-2 text-xs text-amber-700">
              Mock data mode (VITE_USE_MOCK_DATA=true)
            </p>
          )}
        </div>
        {!isMock && !showingDetail && (
          <button
            type="button"
            onClick={refetch}
            disabled={loading}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
          >
            Refresh
          </button>
        )}
      </div>

      {loading && !showingDetail && (
        <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center text-slate-500">
          Loading contacts…
        </div>
      )}

      {error && !loading && !showingDetail && (
        <div className="rounded-3xl border border-red-200 bg-red-50 p-6">
          <p className="font-semibold text-red-800">Could not load contacts</p>
          <p className="mt-2 text-sm text-red-700">{error}</p>
          <p className="mt-3 text-sm text-red-600">
            Set{' '}
            <code className="rounded bg-red-100 px-1">
              VITE_CONTACTS_BOARD_ID
            </code>{' '}
            in .env or enable mock mode.
          </p>
        </div>
      )}

      {!loading && !error && showingDetail && selectedContact && (
        <ContactDetailPanel
          contact={selectedContact}
          onBack={() => setSelectedContact(null)}
          onSelectContact={(id) => {
            const next = contacts.find((c) => c.id === id);
            if (next) setSelectedContact(next);
          }}
        />
      )}

      {!loading && !error && !showingDetail && (
        <div className="min-h-0 flex-1 overflow-y-auto">
          <ContactFilters
            filters={filters}
            onChange={setFilters}
            onClear={() => setFilters(emptyContactFilters())}
            matchingCount={matchingCount}
            totalCount={contacts.length}
          />
          <ContactList
            contacts={filtered}
            onSelect={setSelectedContact}
          />
        </div>
      )}
    </div>
  );
}
