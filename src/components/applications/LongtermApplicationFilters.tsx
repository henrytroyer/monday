/**
 * LongtermApplicationFilters.tsx — Pipeline / On field rail for long-term applications.
 */

import type { LongtermViewMode } from '../../types/longtermVolunteer';

interface LongtermApplicationFiltersProps {
  viewMode: LongtermViewMode;
  onViewModeChange: (mode: LongtermViewMode) => void;
  searchActive: boolean;
  onClearSearch: () => void;
  matchingCount: number;
  viewCount: number;
}

const viewButtonClass = (selected: boolean) =>
  `rounded-xl px-3 py-2 text-left text-sm font-medium transition ${
    selected
      ? 'bg-crm-indigo-50 text-crm-heading ring-1 ring-crm-indigo/10'
      : 'bg-crm-white text-crm-text hover:bg-crm-taupe-100'
  }`;

export default function LongtermApplicationFilters({
  viewMode,
  onViewModeChange,
  searchActive,
  onClearSearch,
  matchingCount,
  viewCount,
}: LongtermApplicationFiltersProps) {
  return (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto px-4 py-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-crm-heading">
          View
        </h2>
        {searchActive && (
          <button
            type="button"
            onClick={onClearSearch}
            className="rounded-lg border border-crm-taupe/20 px-2.5 py-1 text-xs font-medium text-crm-heading transition hover:bg-crm-taupe-50"
          >
            Clear all
          </button>
        )}
      </div>

      <p className="mt-2 text-xs text-crm-slate">
        Showing {matchingCount} of {viewCount} volunteers
      </p>

      <div className="mt-4 flex flex-col gap-1.5">
        <button
          type="button"
          onClick={() => onViewModeChange('pipeline')}
          aria-current={viewMode === 'pipeline' ? 'page' : undefined}
          className={viewButtonClass(viewMode === 'pipeline')}
        >
          Pipeline
        </button>
        <button
          type="button"
          onClick={() => onViewModeChange('on-field')}
          aria-current={viewMode === 'on-field' ? 'page' : undefined}
          className={viewButtonClass(viewMode === 'on-field')}
        >
          On field
        </button>
      </div>
    </div>
  );
}
