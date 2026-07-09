import { useCallback, useEffect, useState } from 'react';
import {
  canEditContacts,
  isMondayReadOnly,
  isStandaloneMondayMode,
  resolveContactsBoardId,
  useMockData,
} from '../config/boards';
import {
  clearContactsLiveCache,
  fetchContactsList,
  getContactsLiveCache,
} from '../services/contactsApi';
import type { ContactListItem } from '../types/contact';
import { useMondayContext } from './useMondayContext';

export function useContactsList() {
  const { context, isLoading: contextLoading } = useMondayContext();
  const isMock = useMockData();
  const isReadOnly = isMondayReadOnly();
  const contactsEditable = canEditContacts();
  const contactsBoardId = resolveContactsBoardId(context);

  const [contacts, setContacts] = useState<ContactListItem[]>(() => {
    if (isMock) return [];
    return getContactsLiveCache(contactsBoardId);
  });
  const [loading, setLoading] = useState(() => {
    if (isMock) return true;
    return getContactsLiveCache(contactsBoardId).length === 0;
  });
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadProgress, setLoadProgress] = useState<{ loaded: number } | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isMock || contacts.length > 0) return;
    const cached = getContactsLiveCache(contactsBoardId);
    if (cached.length > 0) {
      setContacts(cached);
      setLoading(false);
    }
  }, [contactsBoardId, isMock, contacts.length]);

  const load = useCallback(
    async (options?: { clearCache?: boolean }) => {
      const canLoadLive =
        isMock ||
        isStandaloneMondayMode() ||
        Boolean(import.meta.env.VITE_CONTACTS_BOARD_ID);

      if (contextLoading && !canLoadLive) {
        return;
      }

      const cached =
        !isMock && !options?.clearCache
          ? getContactsLiveCache(contactsBoardId)
          : [];
      const hasCachedList = cached.length > 0;

      if (hasCachedList) {
        setContacts(cached);
        setLoading(false);
      } else {
        setLoading(true);
        setLoadingMore(false);
        setLoadProgress(null);
      }

      setError(null);

      if (!isMock && options?.clearCache) {
        clearContactsLiveCache();
      }

      let firstPage = !hasCachedList;

      try {
        const data = await fetchContactsList({
          contactsBoardId: isMock ? undefined : contactsBoardId,
          clearCache: options?.clearCache,
          refresh: hasCachedList && !options?.clearCache,
          onPage: isMock
            ? undefined
            : (items, loaded) => {
                setContacts(items);
                setLoadProgress({ loaded });
                setLoadingMore(true);
                if (firstPage) {
                  setLoading(false);
                  firstPage = false;
                }
              },
        });
        setContacts(data);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to load contacts',
        );
        if (!hasCachedList) {
          setContacts([]);
        }
      } finally {
        setLoading(false);
        setLoadingMore(false);
        setLoadProgress(null);
      }
    },
    [isMock, contactsBoardId, contextLoading],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const refetch = useCallback(() => load({ clearCache: true }), [load]);

  const removeContacts = useCallback((contactIds: string[]) => {
    const remove = new Set(contactIds);
    setContacts((prev) => prev.filter((contact) => !remove.has(contact.id)));
  }, []);

  return {
    contacts,
    loading,
    loadingMore,
    loadProgress,
    error,
    isMock,
    isReadOnly,
    contactsEditable,
    contactsBoardId,
    refetch,
    removeContacts,
  };
}
