import { useCallback, useEffect, useState } from 'react';
import {
  isMondayReadOnly,
  isStandaloneMondayMode,
  resolveContactsBoardId,
  useMockData,
} from '../config/boards';
import {
  clearContactsLiveCache,
  fetchContactsList,
} from '../services/contactsApi';
import type { ContactListItem } from '../types/contact';
import { useMondayContext } from './useMondayContext';

export function useContactsList() {
  const { context, isLoading: contextLoading } = useMondayContext();
  const [contacts, setContacts] = useState<ContactListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadProgress, setLoadProgress] = useState<{ loaded: number } | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const isMock = useMockData();
  const isReadOnly = isMondayReadOnly();
  const standalone = isStandaloneMondayMode();
  const contactsBoardId = resolveContactsBoardId(context);

  const load = useCallback(
    async (options?: { clearCache?: boolean }) => {
      if (
        contextLoading &&
        !isMock &&
        !standalone &&
        !import.meta.env.VITE_CONTACTS_BOARD_ID
      ) {
        return;
      }

      setLoading(true);
      setLoadingMore(false);
      setLoadProgress(null);
      setError(null);

      if (!isMock && options?.clearCache) {
        clearContactsLiveCache();
      }

      let firstPage = true;

      try {
        const data = await fetchContactsList({
          contactsBoardId: isMock ? undefined : contactsBoardId,
          clearCache: options?.clearCache,
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
        if (firstPage) {
          setContacts([]);
        }
      } finally {
        setLoading(false);
        setLoadingMore(false);
        setLoadProgress(null);
      }
    },
    [isMock, contactsBoardId, contextLoading, standalone],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const refetch = useCallback(() => load({ clearCache: true }), [load]);

  return {
    contacts,
    loading,
    loadingMore,
    loadProgress,
    error,
    isMock,
    isReadOnly,
    contactsBoardId,
    refetch,
  };
}
