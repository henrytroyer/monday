import { useCallback, useEffect, useState } from 'react';
import { initialLongtermVolunteers } from '../data/mockLongtermApplications';
import {
  isStandaloneMondayMode,
  resolveLongtermApplicationsBoardId,
  useMockData,
  canEditApplications,
} from '../config/boards';
import { LONGTERM_STATUS_OPTIONS } from '../constants/longtermApplicationStatuses';
import {
  fetchLongtermApplicationsPipeline,
  updateLongtermApplicationStatus,
} from '../services/crmApi';
import { mergeLongtermCouples } from '../services/mergeLongtermCouples';
import type { LongtermVolunteer } from '../types/longtermVolunteer';
import type { LongtermStatus } from '../constants/longtermApplicationStatuses';
import { useRefetchOnWindowFocus } from './useRefetchOnWindowFocus';
import {
  buildFieldSections,
  buildPipelineSections,
  updateVolunteerStatus,
} from '../utils/longtermApplications';
import { useMondayContext } from './useMondayContext';

interface UseLongtermApplicationsPipelineReturn {
  volunteers: LongtermVolunteer[];
  pipelineSections: ReturnType<typeof buildPipelineSections>;
  fieldSections: ReturnType<typeof buildFieldSections>;
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fetchKey, setFetchKey] = useState(0);

  const isMock = useMockData();
  const standalone = isStandaloneMondayMode();
  const boardId = resolveLongtermApplicationsBoardId(context);

  const refetch = useCallback(() => {
    setFetchKey((k) => k + 1);
  }, []);

  useRefetchOnWindowFocus(refetch, !isMock);

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
            setVolunteers(mergeLongtermCouples(initialLongtermVolunteers));
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

        const sections = await fetchLongtermApplicationsPipeline(id);
        const allVolunteers = mergeLongtermCouples(
          sections.flatMap((section) => section.volunteers),
        );

        if (!cancelled) {
          setVolunteers(allVolunteers);
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

  const handleStatusChange = useCallback(
    async (volunteerId: string, status: string) => {
      const previous = volunteers;
      setVolunteers((current) =>
        updateVolunteerStatus(current, volunteerId, status as LongtermStatus),
      );

      if (isMock || !boardId) return;

      try {
        await updateLongtermApplicationStatus(boardId, volunteerId, status);
      } catch (err) {
        setVolunteers(previous);
        throw err;
      }
    },
    [volunteers, isMock, boardId],
  );

  const pipelineSections = buildPipelineSections(volunteers);
  const fieldSections = buildFieldSections(volunteers);

  return {
    volunteers,
    pipelineSections,
    fieldSections,
    loading: loading || (contextLoading && !isMock && !standalone && !boardId),
    error,
    isMock,
    boardId,
    statusOptions: [...LONGTERM_STATUS_OPTIONS],
    refetch,
    updateVolunteerStatus: handleStatusChange,
    applicationsEditable: canEditApplications(),
  };
}
