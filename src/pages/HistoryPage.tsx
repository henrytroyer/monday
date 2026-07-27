import HistoryFilters from '../components/history/HistoryFilters';
import ActivityLogList from '../components/history/ActivityLogList';
import { useGlobalActivityLog } from '../hooks/useGlobalActivityLog';
import type { CrmActivityEvent } from '../types/activityLog';
import type { PageId } from '../components/layout/AppSidebar';

interface HistoryPageProps {
  onNavigate?: (page: PageId) => void;
  onFocusApplication?: (applicationId: string) => void;
  onFocusRecruitment?: (prospectId: string) => void;
  onFocusContact?: (contactId: string) => void;
}

export default function HistoryPage({
  onNavigate,
  onFocusApplication,
  onFocusRecruitment,
  onFocusContact,
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

  const handleOpen = (event: CrmActivityEvent) => {
    const target = event.navigateTo;
    if (!target) return;

    onNavigate?.(target.page);

    if (target.page === 'applications' && target.focusId) {
      onFocusApplication?.(target.focusId);
      return;
    }
    if (target.page === 'recruitment' && target.focusId) {
      onFocusRecruitment?.(target.focusId);
      return;
    }
    if (target.page === 'contacts' && target.focusId) {
      onFocusContact?.(target.focusId);
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6">
      <div>
        <h1 className="text-4xl font-semibold text-crm-heading">History</h1>
        <p className="mt-2 text-crm-slate">
          See who created, updated, moved, or commented on records across your CRM.
        </p>
        {isMock && (
          <p className="mt-2 text-sm text-amber-800">
            Mock mode — showing local demo activity. Connect live monday boards for full audit history.
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

      <div className="min-h-0 flex-1 overflow-y-auto pb-4">
        <ActivityLogList
          events={events}
          loading={loading}
          loadingMore={loadingMore}
          error={error}
          hasMore={hasMore}
          isMock={isMock}
          onOpen={handleOpen}
          onLoadMore={loadMore}
        />
      </div>
    </div>
  );
}
