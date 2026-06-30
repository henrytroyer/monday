import { useCallback, useEffect, useState } from 'react';
import {
  isMondayReadOnly,
  resolveApplicationsBoardId,
  resolveContactsBoardId,
  useMockData,
} from '../config/boards';
import {
  fetchContactDetail,
  updateContactCoreFieldsApi,
} from '../services/contactsApi';
import type { ContactCoreFields } from '../services/contactStorage';
import type { ContactDetail } from '../types/contact';
import { useMondayContext } from './useMondayContext';

export function useContactDetail(contactId: string | null) {
  const { context } = useMondayContext();
  const isMock = useMockData();
  const isReadOnly = isMondayReadOnly();
  const contactsBoardId = resolveContactsBoardId(context);
  const applicationsBoardId = resolveApplicationsBoardId(context);
  const [detail, setDetail] = useState<ContactDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!contactId) {
      setDetail(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await fetchContactDetail(contactId, {
        contactsBoardId: isMock ? undefined : contactsBoardId,
        applicationsBoardId: isMock ? undefined : applicationsBoardId,
      });
      setDetail(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load contact',
      );
      setDetail(null);
    } finally {
      setLoading(false);
    }
  }, [
    contactId,
    isMock,
    contactsBoardId,
    applicationsBoardId,
  ]);

  useEffect(() => {
    load();
  }, [load]);

  const updateCoreFields = useCallback(
    async (fields: ContactCoreFields) => {
      if (!contactId || isReadOnly) return null;
      setSaving(true);
      setError(null);
      try {
        const updated = await updateContactCoreFieldsApi(contactId, fields, {
          contactsBoardId: isMock ? undefined : contactsBoardId,
          applicationsBoardId: isMock ? undefined : applicationsBoardId,
        });
        setDetail(updated);
        return updated;
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to save contact',
        );
        return null;
      } finally {
        setSaving(false);
      }
    },
    [contactId, isReadOnly, isMock, contactsBoardId, applicationsBoardId],
  );

  return {
    detail,
    loading,
    saving,
    error,
    isReadOnly,
    isMock,
    refetch: load,
    updateCoreFields,
  };
}
