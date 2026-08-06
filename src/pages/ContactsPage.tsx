import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import ContactDetailPanel from '../components/contacts/ContactDetailPanel';
import ContactAlphabetIndex from '../components/contacts/ContactAlphabetIndex';
import ContactFilters from '../components/contacts/ContactFilters';
import ContactListToolbar from '../components/contacts/ContactListToolbar';
import ContactList from '../components/contacts/ContactList';
import ContactBatchEmailModal from '../components/contacts/ContactBatchEmailModal';
import { useLayout } from '../context/LayoutContext';
import { useNavLayer } from '../context/NavigationHistoryContext';
import { useContactsList } from '../hooks/useContactsList';
import { usePersistedPageWorkspace } from '../hooks/usePersistedPageWorkspace';
import type { ContactListItem } from '../types/contact';
import { emptyContactFilters } from '../types/contact';
import {
  contactEmailRecipients,
  formatContactFilterTagSummary,
} from '../utils/contactBatchEmail';
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
import { ingestPendingDonations, deleteContacts } from '../services/contactsApi';
import { runContactIngest } from '../services/contactUpsert/runContactIngest';
import { countPendingContactMatchReviews } from '../services/contactUpsert/contactMatchReviewStorage';
import { readWorkspaceState } from '../services/crmNavigationStorage';

export default function ContactsPage({
  focusContactId,
  onClearFocus,
  onGoToRecruitment,
  onGoToApplication,
}: {
  focusContactId?: string | null;
  onClearFocus?: () => void;
  onGoToRecruitment?: (prospectId: string) => void;
  onGoToApplication?: (applicationId: string) => void;
}) {
  const [filters, setFilters] = useState(emptyContactFilters());
  const [selectedContact, setSelectedContact] =
    useState<ContactListItem | null>(null);
  const [detailVisible, setDetailVisible] = useState(
    () => readWorkspaceState('contacts')?.detailOpen ?? false,
  );
  const [filtersVisible, setFiltersVisible] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [batchEmailOpen, setBatchEmailOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [syncingContacts, setSyncingContacts] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const listScrollRef = useRef<HTMLDivElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const [filterPanelTop, setFilterPanelTop] = useState(0);

  const { requestClose: requestCloseContact } = useNavLayer(
    detailVisible && selectedContact !== null,
    () => setDetailVisible(false),
    `contact-${selectedContact?.id ?? 'none'}`,
  );

  const openContact = useCallback((contact: ContactListItem) => {
    setSelectedContact(contact);
    setDetailVisible(true);
  }, []);

  const {
    contacts,
    loading,
    loadingMore,
    error,
    isMock,
    isReadOnly,
    contactsEditable,
    contactsBoardId,
    compileStats,
    refetch,
    removeContacts,
  } = useContactsList();

  const restoreContact = useCallback(
    (contact: ContactListItem, detailOpen: boolean) => {
      setSelectedContact(contact);
      if (detailOpen) setDetailVisible(true);
    },
    [],
  );

  const findContact = useCallback(
    (id: string) => contacts.find((contact) => contact.id === id),
    [contacts],
  );

  usePersistedPageWorkspace({
    page: 'contacts',
    loading,
    selectedId: selectedContact?.id,
    detailOpen: detailVisible,
    findItem: findContact,
    onRestore: restoreContact,
  });

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

  const showingDetail = detailVisible && selectedContact !== null;
  const listReady = contacts.length > 0 || (!loading && !error);

  const { setDetailMode } = useLayout();

  useEffect(() => {
    setDetailMode(showingDetail);
    return () => setDetailMode(false);
  }, [showingDetail, setDetailMode]);

  useEffect(() => {
    if (!focusContactId || loading) return;
    const match =
      contacts.find((contact) => contact.id === focusContactId) ||
      contacts.find(
        (contact) => contact.id === `compiled:item:${focusContactId}`,
      ) ||
      contacts.find((contact) => contact.id.endsWith(`:${focusContactId}`));
    if (match) {
      openContact(match);
      onClearFocus?.();
    }
  }, [focusContactId, loading, contacts, onClearFocus, openContact]);

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

  useEffect(() => {
    if (showingDetail) {
      setFiltersVisible(false);
    }
  }, [showingDetail]);

  useLayoutEffect(() => {
    if (!filtersVisible) return;

    const updatePanelTop = () => {
      const toolbar = toolbarRef.current;
      if (toolbar) {
        setFilterPanelTop(toolbar.getBoundingClientRect().bottom + 4);
      }
    };

    updatePanelTop();
    window.addEventListener('resize', updatePanelTop);
    window.addEventListener('scroll', updatePanelTop, true);
    return () => {
      window.removeEventListener('resize', updatePanelTop);
      window.removeEventListener('scroll', updatePanelTop, true);
    };
  }, [filtersVisible]);

  useEffect(() => {
    if (!filtersVisible) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setFiltersVisible(false);
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [filtersVisible]);

  const filtersActive = hasActiveContactFilters(filters);
  const selectedCount = selectedIds.size;
  const tagFilterActive = filters.tags.length > 0;

  const selectedContacts = useMemo(
    () => displayed.filter((contact) => selectedIds.has(contact.id)),
    [displayed, selectedIds],
  );

  /** Selection wins; otherwise email everyone in the current tag filter. */
  const batchEmailContacts =
    selectedCount > 0 ? selectedContacts : tagFilterActive ? displayed : [];

  const batchEmailRecipientCount = useMemo(
    () => contactEmailRecipients(batchEmailContacts).length,
    [batchEmailContacts],
  );

  const showBatchActions = selectedCount > 0 || tagFilterActive;

  const toggleContactSelection = (contact: ContactListItem) => {
    setDeleteError(null);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(contact.id)) {
        next.delete(contact.id);
      } else {
        next.add(contact.id);
      }
      return next;
    });
  };

  const clearSelection = () => {
    setDeleteError(null);
    setSelectedIds(new Set());
  };

  const selectAllFiltered = () => {
    setDeleteError(null);
    setSelectedIds(new Set(displayed.map((contact) => contact.id)));
  };

  const handleDeleteSelected = async () => {
    const ids = [...selectedIds];
    if (ids.length === 0) return;

    const label = ids.length === 1 ? '1 contact' : `${ids.length} contacts`;
    const target = isMock ? 'the mock contact list' : 'the portal';
    if (
      !window.confirm(
        `Delete ${label}? This removes the item(s) from ${target} and cannot be undone.`,
      )
    ) {
      return;
    }

    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteContacts(ids, { contactsBoardId });
      removeContacts(ids);
      setSelectedIds(new Set());
    } catch (err) {
      setDeleteError(
        err instanceof Error ? err.message : 'Failed to delete contacts',
      );
    } finally {
      setDeleting(false);
    }
  };

  const handleSyncContacts = async (full = false) => {
    if (full) {
      const ok = window.confirm(
        'Run a full Contacts backfill from all source boards? This may take several minutes and will create/update many Contacts items.',
      );
      if (!ok) return;
    }
    setSyncingContacts(true);
    setSyncMessage(null);
    try {
      const summary = await runContactIngest({ full });
      const parts = [
        `ST ${summary.scanned.shortTerm}`,
        `LT ${summary.scanned.longTerm}`,
        `CSE ${summary.scanned.serviceEnded}`,
        `Donations ${summary.scanned.donations}`,
      ];
      setSyncMessage(
        `${full ? 'Full sync' : 'Synced'} ${parts.join(' · ')} — created ${summary.created}, updated ${summary.updated}, review ${summary.queuedReview}${
          summary.errors.length ? ` · ${summary.errors.length} error(s)` : ''
        }.`,
      );
      if (summary.pendingReviews > 0 || countPendingContactMatchReviews() > 0) {
        window.dispatchEvent(new Event('crm-contact-match-review'));
      }
      refetch();
    } catch (err) {
      setSyncMessage(
        err instanceof Error ? err.message : 'Contact sync failed',
      );
    } finally {
      setSyncingContacts(false);
    }
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
      {!showingDetail && (
        <div className="mb-6 flex shrink-0 flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-4xl font-semibold text-crm-heading">Contacts</h1>
            <p className="mt-2 text-crm-slate">
              Master list of volunteers, pastors, parents, and donors.
            </p>
            {!isMock && (
              <p className="mt-2 text-xs text-crm-slate">
                Compiled from Contacts
                {contactsBoardId ? ` (${contactsBoardId})` : ''}, short-term and
                long-term applications, Current Service Ended, and Donations.
                {compileStats
                  ? ` ${compileStats.fromContactsBoard} on Contacts board · ${compileStats.addedFromOtherBoards} added from other boards${
                      compileStats.mergedDuplicates > 0
                        ? ` · ${compileStats.mergedDuplicates} duplicates combined`
                        : ''
                    }${
                      compileStats.withStreetAddress > 0
                        ? ` · ${compileStats.withStreetAddress} with street address`
                        : ''
                    }.`
                  : null}
                {isReadOnly ? ' Read-only.' : null}
              </p>
            )}
            {isMock && (
              <p className="mt-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-900">
                Showing mock data — not your live Contacts list. Set{' '}
                <code className="rounded bg-amber-100 px-1">
                  VITE_USE_MOCK_DATA=false
                </code>{' '}
                in .env to load live contacts.
              </p>
            )}
          </div>
          {!isMock && (
            <div className="flex flex-col items-end gap-2">
              <div className="flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  onClick={() => void handleSyncContacts(false)}
                  disabled={syncingContacts || loading || !contactsEditable}
                  className="rounded-2xl border border-crm-taupe/20 bg-crm-surface px-4 py-2 text-sm font-medium text-crm-heading transition hover:bg-crm-taupe-50 disabled:opacity-50"
                  title="Upsert recently updated volunteers, parents, pastors, spouses, and donors onto the Contacts board"
                >
                  {syncingContacts ? 'Syncing…' : 'Sync contacts'}
                </button>
                <button
                  type="button"
                  onClick={() => void handleSyncContacts(true)}
                  disabled={syncingContacts || loading || !contactsEditable}
                  className="rounded-2xl border border-crm-taupe/20 bg-crm-surface px-4 py-2 text-sm font-medium text-crm-heading transition hover:bg-crm-taupe-50 disabled:opacity-50"
                  title="Full backfill from all source boards (cutover)"
                >
                  Full sync
                </button>
                <button
                  type="button"
                  onClick={refetch}
                  disabled={loading || loadingMore || syncingContacts}
                  className="rounded-2xl border border-crm-taupe/20 bg-crm-surface px-4 py-2 text-sm font-medium text-crm-heading transition hover:bg-crm-taupe-50 disabled:opacity-50"
                >
                  Refresh
                </button>
              </div>
              {syncMessage && (
                <p className="max-w-md text-right text-xs text-crm-slate">
                  {syncMessage}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {selectedContact && (
        <div
          className={`min-h-0 flex-1 flex-col ${
            detailVisible ? 'flex' : 'hidden'
          }`}
        >
          <ContactDetailPanel
            contact={selectedContact}
            onBack={requestCloseContact}
            onGoToRecruitment={onGoToRecruitment}
            onGoToApplication={onGoToApplication}
            onContactUpdated={(updated) => {
              void refetch();
              setSelectedContact({
                id: updated.id,
                name: updated.name,
                email: updated.email,
                phone: updated.phone,
                profilePhotoUrl: updated.profilePhotoUrl,
                tags: updated.tags,
                createdAt: updated.createdAt,
                demographics: updated.demographics
                  ? {
                      address: updated.demographics.address,
                      city: updated.demographics.city,
                      state: updated.demographics.state,
                      zip: updated.demographics.zip,
                      country: updated.demographics.country,
                    }
                  : undefined,
              });
            }}
            onSelectContact={(id) => {
              const next = contacts.find((c) => c.id === id);
              if (next) openContact(next);
            }}
          />
        </div>
      )}

      {!showingDetail && loading && contacts.length === 0 && (
        <div className="rounded-3xl border border-crm-taupe/20 bg-crm-surface p-8 text-center text-crm-slate">
          {isMock ? (
            <p>Loading contacts…</p>
          ) : (
            <>
              <p>Loading contacts…</p>
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

      {listReady && (
        <div
          className={`flex min-h-0 flex-1 flex-col overflow-hidden rounded-3xl border border-crm-taupe/20 bg-crm-surface p-2 shadow-sm${
            showingDetail ? ' hidden' : ''
          }`}
        >
          <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-crm-taupe/20 bg-crm-surface">
            <div ref={toolbarRef}>
              <ContactListToolbar
                searchQuery={filters.searchQuery}
                onSearchChange={(searchQuery) =>
                  setFilters((current) => ({ ...current, searchQuery }))
                }
                filtersOpen={filtersVisible}
                filtersActive={filtersActive}
                onToggleFilters={() => setFiltersVisible((open) => !open)}
                onClearFilters={() => setFilters(emptyContactFilters())}
              />
            </div>

            {showBatchActions && (
              <div className="shrink-0 border-b border-crm-taupe/15 px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-crm-indigo/15 bg-crm-indigo-50 px-4 py-3 shadow-sm">
                  <p className="text-sm font-medium text-crm-heading">
                    {selectedCount > 0 ? (
                      <>{selectedCount} selected</>
                    ) : (
                      <>
                        {displayed.length} match
                        {displayed.length === 1 ? '' : 'es'} ·{' '}
                        {formatContactFilterTagSummary(filters.tags)}
                      </>
                    )}
                    {batchEmailRecipientCount > 0 ? (
                      <span className="font-normal text-crm-slate">
                        {' '}
                        · {batchEmailRecipientCount} with email
                      </span>
                    ) : null}
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    {selectedCount === 0 && displayed.length > 0 && (
                      <button
                        type="button"
                        onClick={selectAllFiltered}
                        className="rounded-xl border border-crm-taupe/20 bg-crm-white px-3 py-1.5 text-sm font-medium text-crm-heading transition hover:bg-crm-taupe-50"
                      >
                        Select all
                      </button>
                    )}
                    {selectedCount > 0 && (
                      <button
                        type="button"
                        onClick={clearSelection}
                        disabled={deleting}
                        className="rounded-xl border border-crm-taupe/20 bg-crm-white px-3 py-1.5 text-sm font-medium text-crm-heading transition hover:bg-crm-taupe-50 disabled:opacity-50"
                      >
                        Clear
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setBatchEmailOpen(true)}
                      disabled={batchEmailRecipientCount === 0}
                      className="rounded-xl border border-crm-indigo/20 bg-crm-indigo px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-crm-indigo-dark disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Email {batchEmailRecipientCount || ''}
                    </button>
                    {selectedCount > 0 && contactsEditable && (
                      <button
                        type="button"
                        onClick={() => void handleDeleteSelected()}
                        disabled={deleting}
                        className="rounded-xl border border-red-200 bg-red-600 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
                      >
                        {deleting ? 'Deleting…' : 'Delete'}
                      </button>
                    )}
                  </div>
                </div>
                {deleteError && (
                  <div className="mt-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {deleteError}
                  </div>
                )}
              </div>
            )}

            <div className="flex min-h-0 flex-1 overflow-hidden">
              <div
                ref={listScrollRef}
                className="min-h-0 flex-1 overflow-y-auto"
              >
                <div className="px-4 pb-4 pt-2 pr-2">
                  {!showBatchActions && deleteError && (
                    <div className="mb-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                      {deleteError}
                    </div>
                  )}

                  <ContactList
                    contacts={displayed}
                    selectedIds={selectedIds}
                    onToggleSelect={toggleContactSelection}
                    onSelect={openContact}
                  />
                </div>
              </div>
              <div className="flex min-h-0 shrink-0 self-stretch py-2 pr-3 pl-1">
                <ContactAlphabetIndex
                  availableLetters={availableLetters}
                  onSelect={scrollToLetter}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {batchEmailOpen && (
        <ContactBatchEmailModal
          contacts={batchEmailContacts}
          filterTags={filters.tags}
          onClose={() => setBatchEmailOpen(false)}
        />
      )}

      {filtersVisible &&
        !showingDetail &&
        listReady &&
        createPortal(
          <>
            <button
              type="button"
              aria-label="Close filters"
              className="fixed inset-0 z-[200] bg-stone-900/10"
              onClick={() => setFiltersVisible(false)}
            />
            <div
              className="fixed left-1/2 z-[210] max-h-[min(70vh,520px)] w-[calc(100%-2rem)] max-w-2xl -translate-x-1/2 overflow-y-auto"
              style={{ top: filterPanelTop }}
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
          </>,
          document.body,
        )}
    </div>
  );
}
