import { useEffect, useMemo, useRef, useState } from 'react';
import ContactDetailPanel from '../components/contacts/ContactDetailPanel';
import ContactAlphabetIndex from '../components/contacts/ContactAlphabetIndex';
import ContactFilters from '../components/contacts/ContactFilters';
import ContactFiltersTab from '../components/contacts/ContactFiltersTab';
import ContactList from '../components/contacts/ContactList';
import { useLayout } from '../context/LayoutContext';
import { useNavLayer } from '../context/NavigationHistoryContext';
import { useContactsList } from '../hooks/useContactsList';
import type { ContactListItem } from '../types/contact';
import { emptyContactFilters } from '../types/contact';
import {
  countMatchingContacts,
  filterContacts,
  hasActiveContactFilters,
} from '../utils/filterContacts';
import {
  getContactSortLetter,
  letterAnchorId,
} from '../utils/contactSortLetter';
import { sortContacts } from '../utils/sortContacts';
import { ingestPendingDonations } from '../services/contactsApi';

export default function ContactsPage({
  onGoToRecruitment,
  onGoToApplication,
}: {
  onGoToRecruitment?: (prospectId: string) => void;
  onGoToApplication?: (applicationId: string) => void;
}) {
  const [filters, setFilters] = useState(emptyContactFilters());
  const [selectedContact, setSelectedContact] =
    useState<ContactListItem | null>(null);
  const [filtersVisible, setFiltersVisible] = useState(false);
  const listScrollRef = useRef<HTMLDivElement>(null);

  const { requestClose: requestCloseContact } = useNavLayer(
    selectedContact !== null,
    () => setSelectedContact(null),
    `contact-${selectedContact?.id ?? 'none'}`,
  );

  const {
    contacts,
    loading,
    loadingMore,
    error,
    isMock,
    isReadOnly,
    contactsBoardId,
    refetch,
  } = useContactsList();

  const filtered = useMemo(
    () => filterContacts(contacts, filters),
    [contacts, filters],
  );

  const displayed = useMemo(
    () => sortContacts(filtered, filters.sortBy),
    [filtered, filters.sortBy],
  );

  const availableLetters = useMemo(() => {
    const letters = new Set<string>();
    for (const contact of displayed) {
      letters.add(getContactSortLetter(contact.name));
    }
    return letters;
  }, [displayed]);

  const matchingCount = useMemo(
    () => countMatchingContacts(contacts, filters),
    [contacts, filters],
  );

  const showingDetail = selectedContact !== null;

  const { setDetailMode } = useLayout();

  useEffect(() => {
    setDetailMode(showingDetail);
    return () => setDetailMode(false);
  }, [showingDetail, setDetailMode]);

  useEffect(() => {
    if (!isMock) return;

    let cancelled = false;

    async function syncDonations() {
      const synced = await ingestPendingDonations();
      if (!cancelled && synced.length > 0) {
        refetch();
      }
    }

    void syncDonations();

    return () => {
      cancelled = true;
    };
  }, [isMock, refetch]);

  const filtersActive = hasActiveContactFilters(filters);

  useEffect(() => {
    if (showingDetail) {
      setFiltersVisible(false);
    }
  }, [showingDetail]);

  const handleFiltersTabClick = () => {
    setFiltersVisible((visible) => !visible);
  };

  const scrollToLetter = (letter: string) => {
    const container = listScrollRef.current;
    if (!container) return;

    const target = container.querySelector<HTMLElement>(
      `#${letterAnchorId(letter)}`,
    );
    if (!target) return;

    const containerTop = container.getBoundingClientRect().top;
    const targetTop = target.getBoundingClientRect().top;
    container.scrollTo({
      top: container.scrollTop + (targetTop - containerTop) - 8,
      behavior: 'smooth',
    });
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="mb-6 flex shrink-0 flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-4xl font-semibold text-crm-heading">Contacts</h1>
          {!showingDetail && (
            <>
              <p className="mt-2 text-crm-slate">
                Master list of volunteers, pastors, parents, and donors.
              </p>
              {!isMock && isReadOnly && contactsBoardId && (
                <p className="mt-2 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-900">
                  Read-only — live data from Contacts board {contactsBoardId}
                </p>
              )}
              {!isMock && !isReadOnly && (
                <p className="mt-2 text-xs text-crm-slate">
                  Live data from monday.com Contacts board
                  {contactsBoardId ? ` ${contactsBoardId}` : ''}
                </p>
              )}
              {isMock && (
                <p className="mt-2 text-xs text-amber-700">
                  Mock data mode (VITE_USE_MOCK_DATA=true)
                </p>
              )}
            </>
          )}
        </div>
        {!isMock && !showingDetail && (
          <button
            type="button"
            onClick={refetch}
            disabled={loading || loadingMore}
            className="rounded-2xl border border-crm-taupe/20 bg-crm-surface px-4 py-2 text-sm font-medium text-crm-heading transition hover:bg-crm-taupe-50 disabled:opacity-50"
          >
            Refresh
          </button>
        )}
      </div>

      {showingDetail && selectedContact && (
        <ContactDetailPanel
          contact={selectedContact}
          onBack={requestCloseContact}
          onGoToRecruitment={onGoToRecruitment}
          onGoToApplication={onGoToApplication}
          onContactUpdated={refetch}
          onSelectContact={(id) => {
            const next = contacts.find((c) => c.id === id);
            if (next) setSelectedContact(next);
          }}
        />
      )}

      {!showingDetail && loading && contacts.length === 0 && (
        <div className="rounded-3xl border border-crm-taupe/20 bg-crm-surface p-8 text-center text-crm-slate">
          {isMock ? (
            <p>Loading contacts…</p>
          ) : (
            <>
              <p>Loading contacts from monday.com…</p>
              <p className="mt-2 text-sm text-crm-slate/80">
                First batch appears in a few seconds; large boards keep loading
                in the background.
              </p>
            </>
          )}
        </div>
      )}

      {!showingDetail && error && !loading && contacts.length === 0 && (
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

      {!showingDetail && (contacts.length > 0 || (!loading && !error)) && (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-3xl border border-crm-taupe/20 bg-crm-surface p-2 shadow-sm">
          <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-crm-taupe/20 bg-crm-surface">
            <ContactFiltersTab
              open={filtersVisible}
              hasActiveFilters={filtersActive}
              onClick={handleFiltersTabClick}
            />

            {filtersVisible && (
              <button
                type="button"
                aria-label="Close filters"
                className="absolute inset-0 z-10 bg-stone-900/10"
                onClick={() => setFiltersVisible(false)}
              />
            )}

            <div
              className={`absolute left-1/2 top-9 z-20 w-[calc(100%-2rem)] max-w-2xl -translate-x-1/2 transition-all duration-300 ease-out ${
                filtersVisible
                  ? 'pointer-events-auto translate-y-0 opacity-100'
                  : 'pointer-events-none -translate-y-2 opacity-0'
              }`}
            >
              <div className="overflow-hidden rounded-2xl border border-crm-taupe/20 bg-crm-surface shadow-lg">
                <ContactFilters
                  variant="panel"
                  filters={filters}
                  onChange={setFilters}
                  onClear={() => setFilters(emptyContactFilters())}
                  matchingCount={matchingCount}
                  totalCount={contacts.length}
                />
              </div>
            </div>

            <div className="flex min-h-0 flex-1 overflow-hidden pt-10">
              <div
                ref={listScrollRef}
                className="min-h-0 flex-1 overflow-y-auto"
              >
                <div className="px-4 pb-4 pt-2 pr-2">
                  <ContactList
                    contacts={displayed}
                    onSelect={setSelectedContact}
                  />
                </div>
              </div>
              <div className="flex h-full shrink-0 py-2 pr-3 pl-1">
                <ContactAlphabetIndex
                  availableLetters={availableLetters}
                  onSelect={scrollToLetter}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
