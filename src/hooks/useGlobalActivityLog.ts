import { useCallback, useEffect, useMemo, useState } from 'react';
import { useMockData } from '../config/boards';
import { buildMockActivityLog } from '../data/buildMockActivityLog';
import { fetchBoardActivityLogs } from '../services/fetchBoardActivityLogs';
import { getLocalActivityLog } from '../services/localActivityLog';
import {
  filterActivityEvents,
  mergeActivityFeed,
  uniqueActors,
} from '../services/mergeActivityFeed';
import type { CrmActivityEvent, HistoryFilterState } from '../types/activityLog';
import { defaultHistoryFilters } from '../types/activityLog';

interface UseGlobalActivityLogReturn {
  events: CrmActivityEvent[];
  allEvents: CrmActivityEvent[];
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  hasMore: boolean;
  isMock: boolean;
  filters: HistoryFilterState;
  setFilters: React.Dispatch<React.SetStateAction<HistoryFilterState>>;
  actors: Array<{ id: string; name: string }>;
  boardOptions: Array<{ id: string; name: string }>;
  refetch: () => void;
  loadMore: () => void;
}

export function useGlobalActivityLog(): UseGlobalActivityLogReturn {
  const isMock = useMockData();
  const [filters, setFilters] = useState<HistoryFilterState>(defaultHistoryFilters);
  const [allEvents, setAllEvents] = useState<CrmActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(1);
  const [fetchKey, setFetchKey] = useState(0);
  const [boardNames, setBoardNames] = useState<Map<string, string>>(new Map());

  const refetch = useCallback(() => {
    setPage(1);
    setFetchKey((k) => k + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        if (isMock) {
          const mockEvents = mergeActivityFeed(
            buildMockActivityLog(),
            getLocalActivityLog(),
          );
          if (!cancelled) {
            setAllEvents(mockEvents);
            setHasMore(false);
            setBoardNames(new Map());
          }
          return;
        }

        const result = await fetchBoardActivityLogs({
          from: filters.fromDate,
          to: filters.toDate,
          page: 1,
          limit: 50,
        });

        const localEvents = getLocalActivityLog().filter((event) => {
          const occurred = new Date(event.occurredAt).getTime();
          const from = new Date(`${filters.fromDate}T00:00:00.000Z`).getTime();
          const to = new Date(`${filters.toDate}T23:59:59.999Z`).getTime();
          return occurred >= from && occurred <= to;
        });

        if (!cancelled) {
          setAllEvents(mergeActivityFeed(result.events, localEvents));
          setHasMore(result.hasMore);
          setBoardNames(result.boardNames);
          setPage(1);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : 'Failed to load activity history',
          );
          setAllEvents([]);
          setHasMore(false);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [isMock, filters.fromDate, filters.toDate, fetchKey]);

  const loadMore = useCallback(async () => {
    if (isMock || loadingMore || !hasMore) return;

    setLoadingMore(true);
    setError(null);

    try {
      const nextPage = page + 1;
      const result = await fetchBoardActivityLogs({
        from: filters.fromDate,
        to: filters.toDate,
        page: nextPage,
        limit: 50,
      });

      setAllEvents((prev) => mergeActivityFeed(prev, result.events));
      setHasMore(result.hasMore);
      setBoardNames((prev) => {
        const next = new Map(prev);
        for (const [id, name] of result.boardNames) {
          next.set(id, name);
        }
        return next;
      });
      setPage(nextPage);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load more activity history',
      );
    } finally {
      setLoadingMore(false);
    }
  }, [isMock, loadingMore, hasMore, page, filters.fromDate, filters.toDate]);

  const events = useMemo(
    () =>
      filterActivityEvents(allEvents, {
        searchQuery: filters.searchQuery,
        actorUserId: filters.actorUserId,
        boardId: filters.boardId,
        category: filters.category,
      }),
    [allEvents, filters],
  );

  const actors = useMemo(() => uniqueActors(allEvents), [allEvents]);

  const boardOptions = useMemo(() => {
    const options = [...boardNames.entries()].map(([id, name]) => ({ id, name }));
    const seen = new Set(options.map((o) => o.id));
    for (const event of allEvents) {
      if (event.boardId && event.boardName && !seen.has(event.boardId)) {
        seen.add(event.boardId);
        options.push({ id: event.boardId, name: event.boardName });
      }
    }
    return options.sort((a, b) => a.name.localeCompare(b.name));
  }, [allEvents, boardNames]);

  return {
    events,
    allEvents,
    loading,
    loadingMore,
    error,
    hasMore,
    isMock,
    filters,
    setFilters,
    actors,
    boardOptions,
    refetch,
    loadMore,
  };
}
