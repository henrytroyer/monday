import { useCallback, useState } from 'react';
import { useMockData } from '../config/boards';
import { fetchMondayItemSummaries } from '../services/crmApi';

export interface PastorReferenceLinkOption {
  id: string;
  name: string;
}

const MOCK_PASTOR_REFERENCE_NAMES: Record<string, string> = {
  'mock-pastor-ref-1': 'Rev. Michael Thompson — Grace Community',
  'mock-pastor-ref-2': 'Pastor reference — follow-up 2024',
};

export function usePastorReferenceLinkOptions(linkedItemIds: string[]) {
  const isMock = useMockData();
  const [options, setOptions] = useState<PastorReferenceLinkOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (linkedItemIds.length === 0) {
      setOptions([]);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (isMock) {
        setOptions(
          linkedItemIds.map((id, index) => ({
            id,
            name:
              MOCK_PASTOR_REFERENCE_NAMES[id] ??
              `Pastor reference ${index + 1}`,
          })),
        );
        return;
      }

      const summaries = await fetchMondayItemSummaries(linkedItemIds);
      const byId = new Map(summaries.map((item) => [item.id, item.name]));
      setOptions(
        linkedItemIds.map((id, index) => ({
          id,
          name: byId.get(id)?.trim() || `Pastor reference ${index + 1}`,
        })),
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to load pastor reference list',
      );
      setOptions(
        linkedItemIds.map((id, index) => ({
          id,
          name: `Pastor reference ${index + 1}`,
        })),
      );
    } finally {
      setLoading(false);
    }
  }, [isMock, linkedItemIds]);

  const reset = useCallback(() => {
    setOptions([]);
    setError(null);
    setLoading(false);
  }, []);

  return { options, loading, error, load, reset };
}
