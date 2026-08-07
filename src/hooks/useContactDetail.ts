/**
 * useContactDetail.ts — Contact detail load with fast paint + deferred extras.
 *
 * - Seeds from session cache or list row immediately (no blank wait).
 * - Core Monday enrich skips donations/safeguarding/email.
 * - Heavy extras load in the background; email history is separate.
 * - Does not force refresh on every open (cache hits return instantly).
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  canEditContacts,
  resolveApplicationsBoardId,
  resolveContactsBoardId,
  resolveDonationsBoardId,
  resolveEndOfServiceReviewBoardId,
  resolveServiceEndedBoardId,
  useMockData,
} from '../config/boards';
import {
  enrichContactDetailHeavyExtras,
  fetchContactDetail,
  seedContactDetailFromListItem,
  updateContactCoreFieldsApi,
  updateContactPastorReferenceApi,
} from '../services/contactsApi';
import {
  contactDetailCacheKey,
  getCachedContactDetail,
} from '../services/sessionDetailCache';
import type { ContactCoreFields, ContactPastorFields } from '../services/contactStorage';
import type { ContactDetail, ContactListItem } from '../types/contact';
import { useEosReviewBoardWatcherWhileContactOpen } from './useMondayBoardWatcher';
import { useMondayContext } from './useMondayContext';
import { useRefetchOnWindowFocus } from './useRefetchOnWindowFocus';

export function useContactDetail(
  contactId: string | null,
  options?: { listItem?: ContactListItem | null },
) {
  const listItem = options?.listItem;
  const { context } = useMondayContext();
  const isMock = useMockData();
  const canEdit = canEditContacts();
  const contactsBoardId = resolveContactsBoardId(context);
  const applicationsBoardId = resolveApplicationsBoardId(context);
  const donationsBoardId = resolveDonationsBoardId(context);
  const serviceEndedBoardId = resolveServiceEndedBoardId(context);
  const endOfServiceReviewBoardId = resolveEndOfServiceReviewBoardId(context);
  const [detail, setDetail] = useState<ContactDetail | null>(null);
  /** True only when there is nothing to paint yet. */
  const [loading, setLoading] = useState(false);
  /** Core Monday enrich running while a seed/cache is already shown. */
  const [refreshing, setRefreshing] = useState(false);
  const [extrasLoading, setExtrasLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadGen = useRef(0);

  const boardOpts = useCallback(
    () => ({
      contactsBoardId: isMock ? undefined : contactsBoardId,
      applicationsBoardId: isMock ? undefined : applicationsBoardId,
      donationsBoardId: isMock ? undefined : donationsBoardId,
      serviceEndedBoardId: isMock ? undefined : serviceEndedBoardId,
      endOfServiceReviewBoardId: isMock
        ? undefined
        : endOfServiceReviewBoardId,
    }),
    [
      isMock,
      contactsBoardId,
      applicationsBoardId,
      donationsBoardId,
      serviceEndedBoardId,
      endOfServiceReviewBoardId,
    ],
  );

  const loadHeavyExtras = useCallback(
    async (contactKey: string, core: ContactDetail, gen: number) => {
      if (isMock) return;
      setExtrasLoading(true);
      try {
        const enriched = await enrichContactDetailHeavyExtras(
          contactKey,
          core,
          boardOpts(),
        );
        if (gen !== loadGen.current) return;
        setDetail((prev) => {
          if (!prev || prev.id !== contactKey) return prev;
          return {
            ...enriched,
            // Preserve emails already fetched by the panel hook.
            emailCorrespondence:
              prev.emailCorrespondence.length > 0
                ? prev.emailCorrespondence
                : enriched.emailCorrespondence,
          };
        });
      } catch {
        // Core detail stays usable without donations / safeguarding.
      } finally {
        if (gen === loadGen.current) setExtrasLoading(false);
      }
    },
    [boardOpts, isMock],
  );

  const load = useCallback(
    async (opts?: { forceRefresh?: boolean }) => {
      if (!contactId) {
        setDetail(null);
        setLoading(false);
        setRefreshing(false);
        setExtrasLoading(false);
        return;
      }

      const gen = ++loadGen.current;
      const cacheKey = contactDetailCacheKey(contactId, {
        contactsBoardId: isMock ? undefined : contactsBoardId,
        applicationsBoardId: isMock ? undefined : applicationsBoardId,
        donationsBoardId: isMock ? undefined : donationsBoardId,
      });
      const cached = !isMock ? getCachedContactDetail(cacheKey) : null;
      const seed =
        cached ??
        (listItem && listItem.id === contactId
          ? seedContactDetailFromListItem(listItem)
          : null);

      if (seed) {
        setDetail(seed);
        setLoading(false);
        setError(null);
      } else {
        setLoading(true);
        setError(null);
      }

      const fetchOpts = {
        ...boardOpts(),
        skipHeavyExtras: true as const,
        refresh: Boolean(opts?.forceRefresh),
      };

      // Instant path: warm cache and not forcing a refresh.
      if (cached && !opts?.forceRefresh) {
        void loadHeavyExtras(contactId, cached, gen);
        // Silent background refresh of core + extras.
        void (async () => {
          setRefreshing(true);
          try {
            const fresh = await fetchContactDetail(contactId, {
              ...fetchOpts,
              refresh: true,
            });
            if (gen !== loadGen.current) return;
            setDetail((prev) => {
              if (!prev || prev.id !== contactId) return fresh;
              return {
                ...fresh,
                emailCorrespondence: prev.emailCorrespondence,
                donations:
                  prev.donations.length > 0 ? prev.donations : fresh.donations,
                childSafeguardingFile:
                  prev.childSafeguardingFile ?? fresh.childSafeguardingFile,
              };
            });
            await loadHeavyExtras(contactId, fresh, gen);
          } catch {
            // Keep cached detail.
          } finally {
            if (gen === loadGen.current) setRefreshing(false);
          }
        })();
        return;
      }

      setRefreshing(Boolean(seed));
      try {
        let data: ContactDetail;
        try {
          data = await fetchContactDetail(contactId, fetchOpts);
        } catch (firstErr) {
          const msg =
            firstErr instanceof Error ? firstErr.message : String(firstErr);
          const aborted = /abort/i.test(msg);
          if (!aborted) throw firstErr;
          data = await fetchContactDetail(contactId, fetchOpts);
        }
        if (gen !== loadGen.current) return;
        setDetail((prev) => {
          if (!prev || prev.id !== contactId) return data;
          return {
            ...data,
            emailCorrespondence: prev.emailCorrespondence,
          };
        });
        void loadHeavyExtras(contactId, data, gen);
      } catch (err) {
        if (gen !== loadGen.current) return;
        setError(
          err instanceof Error ? err.message : 'Failed to load contact',
        );
        if (!seed) {
          setDetail(null);
        }
      } finally {
        if (gen === loadGen.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [
      contactId,
      listItem,
      isMock,
      contactsBoardId,
      applicationsBoardId,
      donationsBoardId,
      boardOpts,
      loadHeavyExtras,
    ],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const updateCoreFields = useCallback(
    async (fields: ContactCoreFields) => {
      if (!contactId || !canEdit) {
        throw new Error('Contact profile cannot be saved in read-only mode.');
      }
      setSaving(true);
      setError(null);
      try {
        const updated = await updateContactCoreFieldsApi(contactId, fields, {
          contactsBoardId: isMock ? undefined : contactsBoardId,
          applicationsBoardId: isMock ? undefined : applicationsBoardId,
          donationsBoardId: isMock ? undefined : donationsBoardId,
          fallbackDetail: detail ?? undefined,
        });
        setDetail(updated);
        return updated;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to save contact';
        setError(message);
        throw err;
      } finally {
        setSaving(false);
      }
    },
    [
      contactId,
      canEdit,
      isMock,
      contactsBoardId,
      applicationsBoardId,
      donationsBoardId,
      detail,
    ],
  );

  const updatePastorReference = useCallback(
    async (fields: ContactPastorFields) => {
      if (!contactId || !canEdit) {
        throw new Error('Pastor reference cannot be saved in read-only mode.');
      }
      setSaving(true);
      setError(null);
      try {
        const updated = await updateContactPastorReferenceApi(contactId, fields, {
          contactsBoardId: isMock ? undefined : contactsBoardId,
          applicationsBoardId: isMock ? undefined : applicationsBoardId,
          donationsBoardId: isMock ? undefined : donationsBoardId,
          fallbackDetail: detail ?? undefined,
        });
        setDetail(updated);
        return updated;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Failed to save pastor reference';
        setError(message);
        throw err;
      } finally {
        setSaving(false);
      }
    },
    [
      contactId,
      canEdit,
      isMock,
      contactsBoardId,
      applicationsBoardId,
      donationsBoardId,
      detail,
    ],
  );

  useRefetchOnWindowFocus(() => {
    void load({ forceRefresh: true });
  }, Boolean(contactId) && !isMock);

  const refetchOnEosChange = useCallback(() => {
    void load({ forceRefresh: true });
  }, [load]);

  useEosReviewBoardWatcherWhileContactOpen(
    isMock ? null : contactId,
    refetchOnEosChange,
  );

  return {
    detail,
    loading,
    refreshing,
    extrasLoading,
    saving,
    error,
    canEdit,
    isMock,
    refetch: () => load({ forceRefresh: true }),
    updateCoreFields,
    updatePastorReference,
  };
}
