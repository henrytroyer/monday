import { useCallback, useEffect, useState } from 'react';
import { applicationPipeline } from '../data/mockApplications';
import { resolveBoardId, useMockData } from '../config/boards';
import { fetchApplicationsPipeline } from '../services/crmApi';
import type { PipelineSection } from '../types/volunteer';
import { useMondayContext } from './useMondayContext';

interface UseApplicationsPipelineReturn {
  pipeline: PipelineSection[];
  loading: boolean;
  error: string | null;
  isMock: boolean;
  boardId: string | null;
  refetch: () => void;
}

export function useApplicationsPipeline(): UseApplicationsPipelineReturn {
  const { context, isLoading: contextLoading } = useMondayContext();
  const [pipeline, setPipeline] = useState<PipelineSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fetchKey, setFetchKey] = useState(0);

  const isMock = useMockData();
  const boardId = resolveBoardId(context);

  const refetch = useCallback(() => {
    setFetchKey((k) => k + 1);
  }, []);

  useEffect(() => {
    if (contextLoading && !isMock && !import.meta.env.VITE_APPLICATIONS_BOARD_ID) {
      return;
    }

    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        if (isMock) {
          if (!cancelled) {
            setPipeline(applicationPipeline);
            setLoading(false);
          }
          return;
        }

        const id = boardId;
        if (!id) {
          throw new Error(
            'No board context. Open this app as a Board View on your Applications board, or set VITE_APPLICATIONS_BOARD_ID in .env',
          );
        }

        const data = await fetchApplicationsPipeline(id);
        if (!cancelled) {
          setPipeline(data);
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load applications');
          setPipeline([]);
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [contextLoading, isMock, boardId, fetchKey]);

  return {
    pipeline,
    loading: loading || (contextLoading && !isMock && !boardId),
    error,
    isMock,
    boardId,
    refetch,
  };
}
