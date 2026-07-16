import { useEffect, useState } from 'react';
import { useMockData } from '../config/boards';
import { fetchServiceEndedDetail } from '../services/crmApi';
import type { VolunteerDetail } from '../types/volunteer';

interface UseServiceEndedDetailReturn {
  detail: VolunteerDetail | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useServiceEndedDetail(
  itemId: string | null,
): UseServiceEndedDetailReturn {
  const [detail, setDetail] = useState<VolunteerDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const isMock = useMockData();

  const refetch = () => setReloadKey((k) => k + 1);

  useEffect(() => {
    if (!itemId) {
      setDetail(null);
      setError(null);
      setLoading(false);
      return;
    }

    if (isMock) {
      setDetail(null);
      setLoading(false);
      setError(null);
      return;
    }

    const resolvedItemId = itemId;
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchServiceEndedDetail(resolvedItemId);
        if (!cancelled) setDetail(data);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : 'Failed to load service ended record',
          );
          setDetail(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [itemId, isMock, reloadKey]);

  return { detail, loading, error, refetch };
}
