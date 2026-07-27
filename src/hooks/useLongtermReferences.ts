import { useCallback, useEffect, useState } from 'react';
import { useMockData } from '../config/boards';
import { buildLongtermReferenceSlots } from '../data/mockLongtermReferences';
import type { LongtermReferenceSlot } from '../types/longtermReference';
import {
  fetchLongtermReferenceSlots,
  recordReferenceEmailSent,
  updateLongtermReferenceReview,
  clearLongtermReferenceReview,
} from '../services/longtermReferencesApi';
import { getCachedLongtermReferenceSlots } from '../services/sessionDetailCache';
import {
  formatSentTimestamp,
  readReferenceEmailSentAt,
  readReferenceReviewStatus,
} from '../services/longtermReferenceStorage';

interface UseLongtermReferencesOptions {
  applicationId: string;
  applicationBoardId: string | null;
  enabled?: boolean;
}

interface UseLongtermReferencesReturn {
  slots: LongtermReferenceSlot[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
  markEmailSent: (slotIndex: number) => Promise<string>;
  setReviewStatus: (
    slotIndex: number,
    status: 'approved' | 'needs_review',
  ) => Promise<void>;
  clearReviewStatus: (slotIndex: number) => Promise<void>;
}

function enrichMockSlots(applicationId: string): LongtermReferenceSlot[] {
  return buildLongtermReferenceSlots(applicationId).map((slot) => {
    const sentAt = readReferenceEmailSentAt(applicationId, slot.slotIndex);
    const review = readReferenceReviewStatus(applicationId, slot.slotIndex);

    let status = slot.status;
    if (sentAt && status === 'placeholder') status = 'sent';
    if (review === 'approved') status = 'approved';
    if (review === 'needs_review') status = 'needs_review';

    return {
      ...slot,
      status,
      emailSentAt: sentAt ?? slot.receivedAt,
      reviewStatus: review,
    };
  });
}

export function useLongtermReferences({
  applicationId,
  applicationBoardId,
  enabled = true,
}: UseLongtermReferencesOptions): UseLongtermReferencesReturn {
  const isMock = useMockData();
  const [slots, setSlots] = useState<LongtermReferenceSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fetchKey, setFetchKey] = useState(0);

  const refetch = useCallback(() => {
    setFetchKey((k) => k + 1);
  }, []);

  useEffect(() => {
    if (!enabled || !applicationId) return;

    let cancelled = false;

    async function load() {
      const cached = !isMock
        ? getCachedLongtermReferenceSlots(applicationId)
        : null;
      if (cached) {
        setSlots(cached);
        setLoading(false);
        setError(null);
      } else {
        setLoading(true);
        setError(null);
      }

      try {
        if (isMock) {
          if (!cancelled) {
            setSlots(enrichMockSlots(applicationId));
            setLoading(false);
          }
          return;
        }

        if (!applicationBoardId) {
          throw new Error('Long-term applications board is not configured');
        }

        const data = await fetchLongtermReferenceSlots(
          applicationId,
          applicationBoardId,
          { refresh: true },
        );
        if (!cancelled) {
          setSlots(data);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : 'Failed to load references',
          );
          if (!cached) {
            setSlots([]);
          }
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [applicationId, applicationBoardId, enabled, isMock, fetchKey]);

  useEffect(() => {
    const onChanged = (event: Event) => {
      const detail = (event as CustomEvent<{ applicationIds?: string[] }>)
        .detail;
      if (
        !detail?.applicationIds?.length ||
        detail.applicationIds.includes(applicationId)
      ) {
        refetch();
      }
    };
    window.addEventListener('crm-references-changed', onChanged);
    return () =>
      window.removeEventListener('crm-references-changed', onChanged);
  }, [applicationId, refetch]);

  const markEmailSent = useCallback(
    async (slotIndex: number) => {
      const sentAt = await recordReferenceEmailSent(applicationId, slotIndex);
      setSlots((current) =>
        current.map((slot) =>
          slot.slotIndex === slotIndex
            ? { ...slot, status: 'sent', emailSentAt: sentAt }
            : slot,
        ),
      );
      return sentAt;
    },
    [applicationId],
  );

  const setReviewStatus = useCallback(
    async (slotIndex: number, status: 'approved' | 'needs_review') => {
      await updateLongtermReferenceReview(applicationId, slotIndex, status);
      setSlots((current) =>
        current.map((slot) =>
          slot.slotIndex === slotIndex
            ? { ...slot, status, reviewStatus: status }
            : slot,
        ),
      );
    },
    [applicationId],
  );

  const clearReviewStatus = useCallback(
    async (slotIndex: number) => {
      await clearLongtermReferenceReview(applicationId, slotIndex);
      setSlots((current) =>
        current.map((slot) =>
          slot.slotIndex === slotIndex && slot.formFields?.length
            ? {
                ...slot,
                status: 'pending_review',
                reviewStatus: undefined,
              }
            : slot,
        ),
      );
    },
    [applicationId],
  );

  return {
    slots,
    loading,
    error,
    refetch,
    markEmailSent,
    setReviewStatus,
    clearReviewStatus,
  };
}

export { formatSentTimestamp };
