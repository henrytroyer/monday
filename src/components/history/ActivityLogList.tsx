import type { CrmActivityEvent } from '../../types/activityLog';
import ActivityLogRow from './ActivityLogRow';

interface ActivityLogListProps {
  events: CrmActivityEvent[];
  loading?: boolean;
  loadingMore?: boolean;
  error?: string | null;
  hasMore?: boolean;
  isMock?: boolean;
  onOpen?: (event: CrmActivityEvent) => void;
  onLoadMore?: () => void;
}

export default function ActivityLogList({
  events,
  loading = false,
  loadingMore = false,
  error = null,
  hasMore = false,
  isMock = false,
  onOpen,
  onLoadMore,
}: ActivityLogListProps) {
  if (loading) {
    return (
      <p className="rounded-2xl border border-dashed border-crm-taupe/28 bg-crm-surface p-6 text-sm text-crm-slate">
        Loading activity history…
      </p>
    );
  }

  if (error) {
    return (
      <p className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-800">
        {error}
      </p>
    );
  }

  if (events.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-crm-taupe/28 bg-crm-surface p-6 text-sm text-crm-slate">
        No activity found for this date range and filters.
        {isMock
          ? ' Try adding notes or updating recruitment prospects in mock mode.'
          : ' Changes made in monday.com will appear here.'}
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {events.map((event) => (
        <ActivityLogRow key={event.id} event={event} onOpen={onOpen} />
      ))}

      {hasMore && onLoadMore && (
        <div className="pt-2 text-center">
          <button
            type="button"
            onClick={onLoadMore}
            disabled={loadingMore}
            className="rounded-2xl border border-crm-taupe/20 bg-crm-white px-5 py-2.5 text-sm font-medium text-crm-heading transition hover:bg-crm-indigo-50 disabled:opacity-60"
          >
            {loadingMore ? 'Loading…' : 'Load more'}
          </button>
        </div>
      )}
    </div>
  );
}
