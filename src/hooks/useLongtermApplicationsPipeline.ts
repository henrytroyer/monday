import { useCallback, useEffect, useState } from 'react';
import { initialLongtermVolunteers } from '../data/mockLongtermApplications';
import {
  canEditApplications,
  isStandaloneMondayMode,
  resolveLongtermApplicationsBoardId,
  useMockData,
} from '../config/boards';
import { LONGTERM_STATUS_OPTIONS } from '../constants/longtermApplicationStatuses';
import type { LongtermStatus } from '../constants/longtermApplicationStatuses';
import {
  fetchLongtermApplications,
  fetchLongtermStatusOptions,
  updateLongtermApplicationStatus,
} from '../services/crmApi';
import type { LongtermVolunteer } from '../types/longtermVolunteer';
import { updateVolunteerStatus } from '../utils/longtermApplications';
import { useMondayContext } from './useMondayContext';

interface UseLongtermApplicationsPipelineReturn {
  volunteers: LongtermVolunteer[];
  loading: boolean;
  error: string | null;
  isMock: boolean;
  boardId: string | null;
  statusOptions: string[];
  refetch: () => void;
  updateVolunteerStatus: (volunteerId: string, status: string) => Promise<void>;
  applicationsEditable: boolean;
}

export function useLongtermApplicationsPipeline(): UseLongtermApplicationsPipelineReturn {
  const { context, isLoading: contextLoading } = useMondayContext();
  const [volunteers, setVolunteers] = useState<LongtermVolunteer[]>([]);
  const [statusOptions, setStatusOptions] = useState<string[]>([
    ...LONGTERM_STATUS_OPTIONS,
  ]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fetchKey, setFetchKey] = useState(0);

  const isMock = useMockData();
  const standalone = isStandaloneMondayMode();
  const boardId = resolveLongtermApplicationsBoardId(context);
  const applicationsEditable = canEditApplications();

  const refetch = useCallback(() => {
    setFetchKey((k) => k + 1);
  }, []);

  useEffect(() => {
    if (
      contextLoading &&
      !isMock &&
      !standalone &&
      !import.meta.env.VITE_LONGTERM_APPLICATIONS_BOARD_ID
    ) {
      return;
    }

    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        if (isMock) {
          if (!cancelled) {
            setVolunteers(initialLongtermVolunteers);
            setStatusOptions([...LONGTERM_STATUS_OPTIONS]);
            setLoading(false);
          }
          return;
        }

        const id = boardId;
        if (!id) {
          throw new Error(
            'No long-term board configured. Set VITE_LONGTERM_APPLICATIONS_BOARD_ID in .env',
          );
        }

        const [data, options] = await Promise.all([
          fetchLongtermApplications(id),
          fetchLongtermStatusOptions(id).catch(() => [...LONGTERM_STATUS_OPTIONS]),
        ]);

        if (!cancelled) {
          setVolunteers(data);
          setStatusOptions(
            options.length > 0 ? options : [...LONGTERM_STATUS_OPTIONS],
          );
          setLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : 'Failed to load long-term applications',
          );
          setVolunteers([]);
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [contextLoading, isMock, standalone, boardId, fetchKey]);

  const updateVolunteerStatusHandler = useCallback(
    async (volunteerId: string, status: string) => {
      const previousVolunteers = volunteers;

      setVolunteers((current) =>
        updateVolunteerStatus(current, volunteerId, status as LongtermStatus),
      );

      if (isMock || !boardId) return;

      try {
        await updateLongtermApplicationStatus(boardId, volunteerId, status);
      } catch (err) {
        setVolunteers(previousVolunteers);
        throw err;
      }
    },
    [volunteers, isMock, boardId],
  );

  return {
    volunteers,
    loading: loading || (contextLoading && !isMock && !standalone && !boardId),
    error,
    isMock,
    boardId,
    statusOptions,
    refetch,
    updateVolunteerStatus: updateVolunteerStatusHandler,
    applicationsEditable,
  };
}
