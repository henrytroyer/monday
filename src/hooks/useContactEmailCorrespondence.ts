import { useCallback, useEffect, useMemo, useState } from 'react';
import { useMockData } from '../config/boards';
import {
  aggregateContactEmailCorrespondence,
  invalidateApplicationEmailCache,
  invalidateContactEmailCaches,
} from '../services/contactEmailAggregation';
import {
  emailWatchIntervalMs,
  emailWatchIsEnabled,
  registerWatchedApplicationItemIds,
  registerWatchedContactItemId,
} from '../services/emailTimelineWatcher';
import type { ContactDetail, ContactEmailMessage } from '../types/contact';

interface UseContactEmailCorrespondenceOptions {
  contactId: string | null;
  contactName?: string;
  contactEmail?: string;
  serviceTerms?: ContactDetail['serviceTerms'];
}

interface UseContactEmailCorrespondenceReturn {
  messages: ContactEmailMessage[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useContactEmailCorrespondence({
  contactId,
  contactName = '',
  contactEmail = '',
  serviceTerms = [],
}: UseContactEmailCorrespondenceOptions): UseContactEmailCorrespondenceReturn {
  const isMock = useMockData();
  const [messages, setMessages] = useState<ContactEmailMessage[]>([]);
  const [loading, setLoading] = useState(Boolean(contactId));
  const [error, setError] = useState<string | null>(null);

  const watchedItemIds = useMemo(() => {
    const ids = new Set<string>();
    if (contactId) ids.add(contactId);
    for (const term of serviceTerms) {
      if (term.itemId && !term.itemId.startsWith('mock-')) {
        ids.add(term.itemId);
      }
    }
    return [...ids];
  }, [contactId, serviceTerms]);

  const invalidateCaches = useCallback(() => {
    if (!contactId) return;
    invalidateContactEmailCaches(contactId);
    for (const term of serviceTerms) {
      if (term.itemId) {
        invalidateApplicationEmailCache(term.itemId);
      }
    }
  }, [contactId, serviceTerms]);

  const load = useCallback(
    async (options?: { silent?: boolean }) => {
      if (!contactId) {
        setMessages([]);
        setLoading(false);
        return;
      }

      if (!options?.silent) {
        setLoading(true);
        setError(null);
      }

      try {
        const data = await aggregateContactEmailCorrespondence({
          contactId,
          contactEmail,
          contactName,
          serviceTerms,
        });
        setMessages(data);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Failed to load email correspondence',
        );
        if (!options?.silent) {
          setMessages([]);
        }
      } finally {
        if (!options?.silent) {
          setLoading(false);
        }
      }
    },
    [contactId, contactEmail, contactName, serviceTerms],
  );

  const refetch = useCallback(() => {
    invalidateCaches();
    void load({ silent: false });
  }, [invalidateCaches, load]);

  useEffect(() => {
    void load();
  }, [load, isMock]);

  useEffect(() => {
    if (!isMock && contactId) {
      registerWatchedContactItemId(contactId);
      const applicationItemIds = serviceTerms
        .map((term) => term.itemId)
        .filter((id) => id && !id.startsWith('mock-'));
      registerWatchedApplicationItemIds(applicationItemIds);
    }
  }, [isMock, contactId, serviceTerms]);

  useEffect(() => {
    if (isMock || !contactId) return;

    const onEmailChanged = (event: Event) => {
      const detail = (event as CustomEvent<{ itemIds?: string[] }>).detail;
      const ids = detail?.itemIds ?? [];
      if (ids.length === 0 || ids.some((id) => watchedItemIds.includes(id))) {
        invalidateCaches();
        void load({ silent: true });
      }
    };

    window.addEventListener('crm-email-correspondence-changed', onEmailChanged);
    return () => {
      window.removeEventListener(
        'crm-email-correspondence-changed',
        onEmailChanged,
      );
    };
  }, [isMock, contactId, watchedItemIds, invalidateCaches, load]);

  useEffect(() => {
    if (isMock || !emailWatchIsEnabled() || !contactId) return;

    const interval = window.setInterval(() => {
      invalidateCaches();
      void load({ silent: true });
    }, emailWatchIntervalMs());

    return () => window.clearInterval(interval);
  }, [isMock, contactId, invalidateCaches, load]);

  return { messages, loading, error, refetch };
}
