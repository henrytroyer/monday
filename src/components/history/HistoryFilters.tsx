import type { CrmActivityCategory } from '../../types/activityLog';

const CATEGORY_LABELS: Record<CrmActivityCategory, string> = {
  created: 'Created',
  updated: 'Updated',
  deleted: 'Deleted',
  moved: 'Moved',
  comment: 'Comment',
  email: 'Email',
  other: 'Other',
};

interface HistoryFiltersProps {
  searchQuery: string;
  actorUserId: string | null;
  boardId: string | null;
  category: CrmActivityCategory | null;
  fromDate: string;
  toDate: string;
  actors: Array<{ id: string; name: string }>;
  boards: Array<{ id: string; name: string }>;
  onSearchChange: (value: string) => void;
  onActorChange: (value: string | null) => void;
  onBoardChange: (value: string | null) => void;
  onCategoryChange: (value: CrmActivityCategory | null) => void;
  onFromDateChange: (value: string) => void;
  onToDateChange: (value: string) => void;
  onRefresh: () => void;
  refreshing?: boolean;
}

export default function HistoryFilters({
  searchQuery,
  actorUserId,
  boardId,
  category,
  fromDate,
  toDate,
  actors,
  boards,
  onSearchChange,
  onActorChange,
  onBoardChange,
  onCategoryChange,
  onFromDateChange,
  onToDateChange,
  onRefresh,
  refreshing = false,
}: HistoryFiltersProps) {
  return (
    <div className="rounded-3xl border border-crm-taupe/20 bg-crm-surface p-5">
      <div className="flex flex-wrap items-end gap-4">
        <label className="min-w-[12rem] flex-1">
          <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-crm-slate">
            Search
          </span>
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search summary, person, or item…"
            className="w-full rounded-2xl border border-crm-taupe/20 bg-crm-white px-4 py-2.5 text-sm text-crm-heading outline-none ring-crm-indigo/20 focus:ring-2"
          />
        </label>

        <label>
          <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-crm-slate">
            From
          </span>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => onFromDateChange(e.target.value)}
            className="rounded-2xl border border-crm-taupe/20 bg-crm-white px-4 py-2.5 text-sm text-crm-heading outline-none ring-crm-indigo/20 focus:ring-2"
          />
        </label>

        <label>
          <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-crm-slate">
            To
          </span>
          <input
            type="date"
            value={toDate}
            onChange={(e) => onToDateChange(e.target.value)}
            className="rounded-2xl border border-crm-taupe/20 bg-crm-white px-4 py-2.5 text-sm text-crm-heading outline-none ring-crm-indigo/20 focus:ring-2"
          />
        </label>

        <label>
          <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-crm-slate">
            User
          </span>
          <select
            value={actorUserId ?? ''}
            onChange={(e) => onActorChange(e.target.value || null)}
            className="min-w-[10rem] rounded-2xl border border-crm-taupe/20 bg-crm-white px-4 py-2.5 text-sm text-crm-heading outline-none ring-crm-indigo/20 focus:ring-2"
          >
            <option value="">All users</option>
            {actors.map((actor) => (
              <option key={actor.id} value={actor.id}>
                {actor.name}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-crm-slate">
            Board
          </span>
          <select
            value={boardId ?? ''}
            onChange={(e) => onBoardChange(e.target.value || null)}
            className="min-w-[10rem] rounded-2xl border border-crm-taupe/20 bg-crm-white px-4 py-2.5 text-sm text-crm-heading outline-none ring-crm-indigo/20 focus:ring-2"
          >
            <option value="">All boards</option>
            {boards.map((board) => (
              <option key={board.id} value={board.id}>
                {board.name}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-crm-slate">
            Type
          </span>
          <select
            value={category ?? ''}
            onChange={(e) =>
              onCategoryChange((e.target.value as CrmActivityCategory) || null)
            }
            className="min-w-[10rem] rounded-2xl border border-crm-taupe/20 bg-crm-white px-4 py-2.5 text-sm text-crm-heading outline-none ring-crm-indigo/20 focus:ring-2"
          >
            <option value="">All types</option>
            {(Object.keys(CATEGORY_LABELS) as CrmActivityCategory[]).map((key) => (
              <option key={key} value={key}>
                {CATEGORY_LABELS[key]}
              </option>
            ))}
          </select>
        </label>

        <button
          type="button"
          onClick={onRefresh}
          disabled={refreshing}
          className="rounded-2xl border border-crm-taupe/20 bg-crm-white px-4 py-2.5 text-sm font-medium text-crm-heading transition hover:bg-crm-indigo-50 disabled:opacity-60"
        >
          {refreshing ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>
    </div>
  );
}
