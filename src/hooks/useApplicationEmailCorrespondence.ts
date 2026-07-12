import { useCallback, useEffect, useState } from 'react';
import { useMockData } from '../config/boards';
import { buildMockContactEmailThread } from '../data/mockContactEmailThread';
import { invalidateApplicationEmailCache } from '../services/contactEmailAggregation';
import {
  emailWatchIntervalMs,
  emailWatchIsEnabled,
  registerWatchedApplicationItemIds,
} from '../services/emailTimelineWatcher';
import {
  fetchItemEmailTimeline,
  getItemEmailTimelineError,
} from '../services/fetchItemEmailTimeline';
import type { ContactEmailMessage } from '../types/contact';

interface UseApplicationEmailCorrespondenceOptions {
  itemId: string;
  contactId?: string;
  timelineId?: string;
  timelineLabel: string;
  contactEmail?: string;
  contactEmails?: string[];
}

interface UseApplicationEmailCorrespondenceReturn {
  messages: ContactEmailMessage[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useApplicationEmailCorrespondence({
  itemId,
  contactId = itemId,
  timelineId,
  timelineLabel,
  contactEmail,
  contactEmails,
}: UseApplicationEmailCorrespondenceOptions): UseApplicationEmailCorrespondenceReturn {
  const isMock = useMockData();
  const [messages, setMessages] = useState<ContactEmailMessage[]>([]);
  const [loading, setLoading] = useState(!isMock);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (options?: { silent?: boolean; skipCache?: boolean }) => {
      if (isMock || itemId.startsWith('mock-')) {
        const thread = buildMockContactEmailThread(contactId, {
          name: 'Volunteer',
          email: contactEmail ?? 'volunteer@example.com',
        }).map((message) => ({
          ...message,
          source: 'application' as const,
          sourceLabel: timelineLabel,
          itemId,
          timelineId,
        }));
        setMessages(thread);
        setLoading(false);
        setError(null);
        return;
      }

      if (!options?.silent) {
        setLoading(true);
        setError(null);
      }

      const emails =
        contactEmails ??
        (contactEmail && contactEmail !== '—' ? [contactEmail] : []);

      const data = await fetchItemEmailTimeline(
        itemId,
        {
          contactId,
          source: 'application',
          sourceLabel: timelineLabel,
          timelineId,
          contactEmails: emails,
        },
        { skipCache: options?.skipCache ?? false },
      );

      const timelineError = getItemEmailTimelineError(itemId);
      setMessages(data);
      setError(timelineError && data.length === 0 ? timelineError : null);
      if (!options?.silent) {
        setLoading(false);
      }
    },
    [
      isMock,
      itemId,
      contactId,
      timelineId,
      timelineLabel,
      contactEmail,
      contactEmails,
    ],
  );

  const refetch = useCallback(() => {
    invalidateApplicationEmailCache(itemId);
    void load({ skipCache: true });
  }, [itemId, load]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!isMock && itemId && !itemId.startsWith('mock-')) {
      registerWatchedApplicationItemIds([itemId]);
    }
  }, [isMock, itemId]);

  useEffect(() => {
    if (isMock || !itemId || itemId.startsWith('mock-')) return;

    const onEmailChanged = (event: Event) => {
      const detail = (event as CustomEvent<{ itemIds?: string[] }>).detail;
      const ids = detail?.itemIds ?? [];
      if (ids.length === 0 || ids.includes(itemId)) {
        invalidateApplicationEmailCache(itemId);
        void load({ silent: true, skipCache: true });
      }
    };

    window.addEventListener('crm-email-correspondence-changed', onEmailChanged);
    return () => {
      window.removeEventListener(
        'crm-email-correspondence-changed',
        onEmailChanged,
      );
    };
  }, [isMock, itemId, load]);

  useEffect(() => {
    if (
      isMock ||
      !emailWatchIsEnabled() ||
      !itemId ||
      itemId.startsWith('mock-')
    ) {
      return;
    }

    const interval = window.setInterval(() => {
      invalidateApplicationEmailCache(itemId);
      void load({ silent: true, skipCache: true });
    }, emailWatchIntervalMs());

    return () => window.clearInterval(interval);
  }, [isMock, itemId, load]);

  return { messages, loading, error, refetch };
}
