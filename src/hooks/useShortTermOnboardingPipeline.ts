import { useCallback, useEffect, useState } from 'react';
import {
  isMondayWatchEnabled,
  mondayWatchIntervalMs,
  useMockData,
} from '../config/boards';
import { useApplicationEmailCorrespondence } from './useApplicationEmailCorrespondence';
import { fetchQuickBooksInvoice } from '../services/quickbooksApi';
import { fetchPastorReferenceReceivedSnapshot } from '../services/pastorReferenceBoard';
import { savePipeline } from '../services/onboardingPipelineStorage';
import { syncShortTermOnboarding } from '../services/shortTermOnboardingSync';
import type { QuickBooksInvoice } from '../types/quickbooks';
import type { OnboardingPipeline, Volunteer, VolunteerDetail } from '../types/volunteer';
import { mergePipelineWithStorage } from '../utils/onboardingPipeline';
import type { PastorReferenceReceivedSnapshot } from '../services/pastorReferenceBoard';

interface UseShortTermOnboardingPipelineOptions {
  volunteer: Volunteer;
  detail: VolunteerDetail | null;
  actorName: string;
}

function legacyInvoiceId(detail: VolunteerDetail): string | undefined {
  return detail.onboardingSteps.find((s) => s.title === 'Invoice Paid')
    ?.quickbooksInvoiceId;
}

export function useShortTermOnboardingPipeline({
  volunteer,
  detail,
  actorName,
}: UseShortTermOnboardingPipelineOptions) {
  const isMock = useMockData();
  const [pipeline, setPipeline] = useState<OnboardingPipeline | null>(null);
  const [pastorReference, setPastorReference] = useState<
    PastorReferenceReceivedSnapshot | undefined
  >();
  const [quickBooksInvoice, setQuickBooksInvoice] = useState<
    QuickBooksInvoice | undefined
  >();
  const [syncToken, setSyncToken] = useState(0);

  const timelineLabel = detail
    ? `${detail.termStart ?? ''} ${detail.termEnd ?? ''}`.trim() || volunteer.timelineId
    : volunteer.timelineId;

  const { messages, refetch: refetchEmails } = useApplicationEmailCorrespondence({
    itemId: volunteer.id,
    contactId: volunteer.id,
    timelineId: volunteer.timelineId,
    timelineLabel,
    contactEmail: detail?.email,
    contactEmails: detail?.emails.map((entry) => entry.address),
  });

  // Watch Contacts → Pastor Reference connect column (poll while detail is open).
  // "Received" flips only when that connect column links a filled form item.
  useEffect(() => {
    if (!detail) {
      setPastorReference(undefined);
      return;
    }

    let cancelled = false;

    const applySnapshot = (
      snapshot: PastorReferenceReceivedSnapshot | undefined,
    ) => {
      setPastorReference((prev) => {
        if (
          prev?.received === snapshot?.received &&
          prev?.receivedDate === snapshot?.receivedDate &&
          prev?.linkedItemId === snapshot?.linkedItemId &&
          prev?.linkFingerprint === snapshot?.linkFingerprint
        ) {
          return prev;
        }
        return snapshot;
      });
    };

    const refreshPastorLink = async () => {
      try {
        const snapshot = await fetchPastorReferenceReceivedSnapshot(volunteer.id);
        if (!cancelled) applySnapshot(snapshot);
      } catch {
        if (!cancelled) {
          applySnapshot({ received: false, linkFingerprint: '' });
        }
      }
    };

    void refreshPastorLink();

    if (isMock) {
      return () => {
        cancelled = true;
      };
    }

    const watchEnabled = isMondayWatchEnabled();
    const intervalMs = watchEnabled
      ? mondayWatchIntervalMs()
      : Math.max(mondayWatchIntervalMs(), 30_000);
    const timer = window.setInterval(() => {
      void refreshPastorLink();
    }, intervalMs);

    const onFocus = () => {
      void refreshPastorLink();
    };
    window.addEventListener('focus', onFocus);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
      window.removeEventListener('focus', onFocus);
    };
  }, [detail?.id, volunteer.id, isMock]);

  // Also refresh connect-column state when email/pipeline resync is requested.
  useEffect(() => {
    if (!detail || syncToken === 0) return;
    let cancelled = false;
    void fetchPastorReferenceReceivedSnapshot(volunteer.id).then((snapshot) => {
      if (!cancelled) setPastorReference(snapshot);
    });
    return () => {
      cancelled = true;
    };
  }, [syncToken, detail?.id, volunteer.id]);

  useEffect(() => {
    if (!detail) return;
    const invoiceId = legacyInvoiceId(detail);
    if (!invoiceId?.trim()) {
      setQuickBooksInvoice(undefined);
      return;
    }

    let cancelled = false;
    void fetchQuickBooksInvoice(invoiceId, detail.name)
      .then((invoice) => {
        if (!cancelled) setQuickBooksInvoice(invoice);
      })
      .catch(() => {
        if (!cancelled) setQuickBooksInvoice(undefined);
      });

    return () => {
      cancelled = true;
    };
  }, [detail?.id, detail?.name, detail?.onboardingSteps, syncToken]);

  useEffect(() => {
    if (!detail) {
      setPipeline(null);
      return;
    }

    let cancelled = false;
    void import('../services/portalOnboardingSync')
      .then(({ loadPipelineFromPortal }) =>
        loadPipelineFromPortal(volunteer.id),
      )
      .catch(() => null)
      .then(() => {
        if (cancelled) return;
        const base = mergePipelineWithStorage(volunteer, detail, false);
        const synced = syncShortTermOnboarding(base, {
          volunteer,
          detail,
          messages,
          pastorReference,
          quickBooksInvoice,
        });
        setPipeline(synced);
        savePipeline(synced, {
          actorName,
          volunteerName: volunteer.name,
          longterm: false,
        });
      });

    return () => {
      cancelled = true;
    };
  }, [
    volunteer,
    detail,
    messages,
    pastorReference,
    quickBooksInvoice,
    actorName,
  ]);

  const handlePipelineChange = useCallback(
    (next: OnboardingPipeline) => {
      setPipeline(next);
      savePipeline(next, {
        actorName,
        volunteerName: volunteer.name,
        longterm: false,
      });
    },
    [actorName, volunteer.name],
  );

  const resync = useCallback(() => {
    refetchEmails();
    setSyncToken((token) => token + 1);
  }, [refetchEmails]);

  useEffect(() => {
    const onEmailChanged = (event: Event) => {
      const custom = event as CustomEvent<{ itemIds?: string[] }>;
      const itemIds = custom.detail?.itemIds ?? [];
      if (itemIds.length === 0 || itemIds.includes(volunteer.id)) {
        resync();
      }
    };

    const onPipelineChanged = (event: Event) => {
      const custom = event as CustomEvent<{ itemIds?: string[] }>;
      const itemIds = custom.detail?.itemIds ?? [];
      if (itemIds.length === 0 || itemIds.includes(volunteer.id)) {
        resync();
      }
    };

    window.addEventListener('crm-email-correspondence-changed', onEmailChanged);
    window.addEventListener('crm-onboarding-pipeline-changed', onPipelineChanged);
    return () => {
      window.removeEventListener('crm-email-correspondence-changed', onEmailChanged);
      window.removeEventListener(
        'crm-onboarding-pipeline-changed',
        onPipelineChanged,
      );
    };
  }, [volunteer.id, resync]);

  return {
    pipeline,
    handlePipelineChange,
    resync,
    emailMessages: messages,
    pastorReferenceReceived: Boolean(pastorReference?.received),
  };
}
