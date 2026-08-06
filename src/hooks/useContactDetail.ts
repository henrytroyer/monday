import { useCallback, useEffect, useState } from 'react';
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
  fetchContactDetail,
  updateContactCoreFieldsApi,
  updateContactPastorReferenceApi,
} from '../services/contactsApi';
import {
  contactDetailCacheKey,
  getCachedContactDetail,
} from '../services/sessionDetailCache';
import type { ContactCoreFields, ContactPastorFields } from '../services/contactStorage';
import type { ContactDetail } from '../types/contact';
import { useMondayContext } from './useMondayContext';
import { useRefetchOnWindowFocus } from './useRefetchOnWindowFocus';

export function useContactDetail(contactId: string | null) {
  const { context } = useMondayContext();
  const isMock = useMockData();
  const canEdit = canEditContacts();
  const contactsBoardId = resolveContactsBoardId(context);
  const applicationsBoardId = resolveApplicationsBoardId(context);
  const donationsBoardId = resolveDonationsBoardId(context);
  const serviceEndedBoardId = resolveServiceEndedBoardId(context);
  const endOfServiceReviewBoardId = resolveEndOfServiceReviewBoardId(context);
  const [detail, setDetail] = useState<ContactDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!contactId) {
      setDetail(null);
      return;
    }

    const cacheKey = contactDetailCacheKey(contactId, {
      contactsBoardId: isMock ? undefined : contactsBoardId,
      applicationsBoardId: isMock ? undefined : applicationsBoardId,
      donationsBoardId: isMock ? undefined : donationsBoardId,
    });
    const cached = !isMock ? getCachedContactDetail(cacheKey) : null;
    if (cached) {
      setDetail(cached);
      setLoading(false);
      setError(null);
    } else {
      setLoading(true);
      setError(null);
    }

    const fetchOpts = {
      contactsBoardId: isMock ? undefined : contactsBoardId,
      applicationsBoardId: isMock ? undefined : applicationsBoardId,
      donationsBoardId: isMock ? undefined : donationsBoardId,
      serviceEndedBoardId: isMock ? undefined : serviceEndedBoardId,
      endOfServiceReviewBoardId: isMock
        ? undefined
        : endOfServiceReviewBoardId,
      refresh: true as const,
    };

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
      setDetail(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load contact',
      );
      if (!cached) {
        setDetail(null);
      }
    } finally {
      setLoading(false);
    }
  }, [
    contactId,
    isMock,
    contactsBoardId,
    applicationsBoardId,
    donationsBoardId,
    serviceEndedBoardId,
    endOfServiceReviewBoardId,
  ]);

  useEffect(() => {
    load();
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
    void load();
  }, Boolean(contactId) && !isMock);

  return {
    detail,
    loading,
    saving,
    error,
    canEdit,
    isMock,
    refetch: load,
    updateCoreFields,
    updatePastorReference,
  };
}
