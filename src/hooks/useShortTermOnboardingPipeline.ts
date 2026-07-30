import { useCallback, useEffect, useState } from 'react';
import { useMockData } from '../config/boards';
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

  useEffect(() => {
    if (!detail || isMock) return;
    let cancelled = false;

    void fetchPastorReferenceReceivedSnapshot(volunteer.id).then((snapshot) => {
      if (!cancelled) setPastorReference(snapshot);
    });

    return () => {
      cancelled = true;
    };
  }, [detail?.id, volunteer.id, isMock, syncToken]);

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
  };
}
