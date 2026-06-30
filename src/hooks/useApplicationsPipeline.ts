import { useCallback, useEffect, useState } from 'react';
import { applicationPipeline } from '../data/mockApplications';
import { resolveBoardId, useMockData, isStandaloneMondayMode } from '../config/boards';
import { APPLICATION_STATUS_OPTIONS } from '../constants/applicationStatuses';
import {
  fetchApplicationStatusOptions,
  fetchApplicationsPipeline,
  updateApplicationStatus,
} from '../services/crmApi';
import type { PipelineSection } from '../types/volunteer';
import { updateVolunteerStatusInPipeline } from '../utils/filterApplications';
import { useMondayContext } from './useMondayContext';

interface UseApplicationsPipelineReturn {
  pipeline: PipelineSection[];
  loading: boolean;
  error: string | null;
  isMock: boolean;
  boardId: string | null;
  statusOptions: string[];
  refetch: () => void;
  updateVolunteerStatus: (volunteerId: string, status: string) => Promise<void>;
}

export function useApplicationsPipeline(): UseApplicationsPipelineReturn {
  const { context, isLoading: contextLoading } = useMondayContext();
  const [pipeline, setPipeline] = useState<PipelineSection[]>([]);
  const [statusOptions, setStatusOptions] = useState<string[]>([
    ...APPLICATION_STATUS_OPTIONS,
  ]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fetchKey, setFetchKey] = useState(0);

  const isMock = useMockData();
  const standalone = isStandaloneMondayMode();
  const boardId = resolveBoardId(context);

  const refetch = useCallback(() => {
    setFetchKey((k) => k + 1);
  }, []);

  useEffect(() => {
    if (contextLoading && !isMock && !standalone && !import.meta.env.VITE_APPLICATIONS_BOARD_ID) {
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
            setStatusOptions([...APPLICATION_STATUS_OPTIONS]);
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

        const [data, options] = await Promise.all([
          fetchApplicationsPipeline(id),
          fetchApplicationStatusOptions(id).catch(() => [
            ...APPLICATION_STATUS_OPTIONS,
          ]),
        ]);

        if (!cancelled) {
          setPipeline(data);
          setStatusOptions(
            options.length > 0 ? options : [...APPLICATION_STATUS_OPTIONS],
          );
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
  }, [contextLoading, isMock, standalone, boardId, fetchKey]);

  const updateVolunteerStatus = useCallback(
    async (volunteerId: string, status: string) => {
      const previousPipeline = pipeline;

      setPipeline((current) =>
        updateVolunteerStatusInPipeline(current, volunteerId, status),
      );

      if (isMock || !boardId) return;

      try {
        await updateApplicationStatus(boardId, volunteerId, status);
      } catch (err) {
        setPipeline(previousPipeline);
        throw err;
      }
    },
    [pipeline, isMock, boardId],
  );

  return {
    pipeline,
    loading: loading || (contextLoading && !isMock && !standalone && !boardId),
    error,
    isMock,
    boardId,
    statusOptions,
    refetch,
    updateVolunteerStatus,
  };
}
