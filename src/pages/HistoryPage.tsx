import { useState } from 'react';
import HistoryFilters from '../components/history/HistoryFilters';
import ActivityLogList from '../components/history/ActivityLogList';
import { useGlobalActivityLog } from '../hooks/useGlobalActivityLog';
import {
  describeUndo,
  undoActivityEvent,
} from '../services/undoActivityEvent';
import type {
  CrmActivityEvent,
  CrmActivityNavigateTo,
} from '../types/activityLog';
import type { PageId } from '../components/layout/AppSidebar';

interface HistoryPageProps {
  onNavigate?: (page: PageId) => void;
  onFocusApplication?: (applicationId: string) => void;
  onFocusRecruitment?: (prospectId: string) => void;
  onFocusContact?: (contactId: string) => void;
  onFocusLongtermApplication?: (applicationId: string) => void;
}

function resolveOpenTarget(
  event: CrmActivityEvent,
): CrmActivityNavigateTo | undefined {
  if (event.navigateTo?.focusId) return event.navigateTo;
  if (!event.entityId) return undefined;

  if (event.entityType === 'contact') {
    return { page: 'contacts', focusId: event.entityId };
  }
  if (event.entityType === 'application') {
    // Prefer short-term unless navigateTo already pointed at long-term.
    if (event.navigateTo?.page === 'longterm-applications') {
      return event.navigateTo;
    }
    return { page: 'applications', focusId: event.entityId };
  }
  if (event.entityType === 'recruitment') {
    return { page: 'recruitment', focusId: event.entityId };
  }
  return event.navigateTo;
}

export default function HistoryPage({
  onNavigate,
  onFocusApplication,
  onFocusRecruitment,
  onFocusContact,
  onFocusLongtermApplication,
}: HistoryPageProps) {
  const {
    events,
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
  } = useGlobalActivityLog();

  const [undoingEventId, setUndoingEventId] = useState<string | null>(null);
  const [undoError, setUndoError] = useState<string | null>(null);

  const handleOpen = (event: CrmActivityEvent) => {
    const target = resolveOpenTarget(event);
    if (!target?.focusId) return;

    // Focus handlers also switch page; call them first so the target page
    // receives the focus id in the same navigation turn.
    if (target.page === 'applications') {
      onFocusApplication?.(target.focusId);
      return;
    }
    if (target.page === 'longterm-applications') {
      onFocusLongtermApplication?.(target.focusId);
      return;
    }
    if (target.page === 'recruitment') {
      onFocusRecruitment?.(target.focusId);
      return;
    }
    if (target.page === 'contacts') {
      onFocusContact?.(target.focusId);
      return;
    }

    onNavigate?.(target.page);
  };

  const handleUndo = async (event: CrmActivityEvent) => {
    if (!event.undoable) return;

    const confirmed = window.confirm(describeUndo(event));
    if (!confirmed) return;

    setUndoError(null);
    setUndoingEventId(event.id);
    try {
      await undoActivityEvent(event);
      refetch();
    } catch (err) {
      setUndoError(
        err instanceof Error ? err.message : 'Could not undo this change',
      );
    } finally {
      setUndoingEventId(null);
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6">
      <div>
        <h1 className="text-4xl font-semibold text-crm-heading">History</h1>
        <p className="mt-2 text-crm-slate">
          Who changed what — with before and after values. Use Undo to reverse a
          change when it is still possible.
        </p>
        {isMock && (
          <p className="mt-2 text-sm text-amber-800">
            Demo mode — showing sample activity. Connect live boards to see the
            full history and undo changes.
          </p>
        )}
      </div>

      <HistoryFilters
        searchQuery={filters.searchQuery}
        actorUserId={filters.actorUserId}
        boardId={filters.boardId}
        category={filters.category}
        fromDate={filters.fromDate}
        toDate={filters.toDate}
        actors={actors}
        boards={boardOptions}
        onSearchChange={(value) =>
          setFilters((prev) => ({ ...prev, searchQuery: value }))
        }
        onActorChange={(value) =>
          setFilters((prev) => ({ ...prev, actorUserId: value }))
        }
        onBoardChange={(value) =>
          setFilters((prev) => ({ ...prev, boardId: value }))
        }
        onCategoryChange={(value) =>
          setFilters((prev) => ({ ...prev, category: value }))
        }
        onFromDateChange={(value) =>
          setFilters((prev) => ({ ...prev, fromDate: value }))
        }
        onToDateChange={(value) =>
          setFilters((prev) => ({ ...prev, toDate: value }))
        }
        onRefresh={refetch}
        refreshing={loading}
      />

      {undoError && (
        <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          {undoError}
        </p>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto pb-4">
        <ActivityLogList
          events={events}
          loading={loading}
          loadingMore={loadingMore}
          error={error}
          hasMore={hasMore}
          isMock={isMock}
          undoingEventId={undoingEventId}
          onOpen={handleOpen}
          onUndo={isMock ? undefined : handleUndo}
          onLoadMore={loadMore}
        />
      </div>
    </div>
  );
}
