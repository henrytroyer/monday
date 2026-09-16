/**
 * ApplicationListToolbar.tsx — Search + mobile Filters + layout/sort row.
 */

import ContactSearchBar from '../contacts/ContactSearchBar';
import type { PipelineLayout } from '../../preferences/pipelineLayoutStorage';
import {
  APPLICATION_SORT_OPTIONS,
  type ApplicationSortOption,
} from '../../utils/organizePipelineVolunteers';
import PipelineLayoutToggle from './PipelineLayoutToggle';

interface ApplicationListToolbarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  /** Phone-only Filters toggle. Omitted on desktop where the rail is always visible. */
  filtersOpen?: boolean;
  filtersActive?: boolean;
  onToggleFilters?: () => void;
  sortBy?: ApplicationSortOption;
  onSortByChange?: (sortBy: ApplicationSortOption) => void;
  layout: PipelineLayout;
  onLayoutChange: (layout: PipelineLayout) => void;
  allowedLayouts?: readonly PipelineLayout[];
  showSort?: boolean;
}

export default function ApplicationListToolbar({
  searchQuery,
  onSearchChange,
  filtersOpen = false,
  filtersActive = false,
  onToggleFilters,
  sortBy,
  onSortByChange,
  layout,
  onLayoutChange,
  allowedLayouts,
  showSort = true,
}: ApplicationListToolbarProps) {
  return (
    <div className="relative z-10 flex shrink-0 items-center gap-2 border-b border-crm-taupe/15 bg-crm-surface px-4 py-2">
      <ContactSearchBar
        id="application-list-search"
        placeholder="Search volunteers…"
        value={searchQuery}
        onChange={onSearchChange}
        className="max-w-xl"
      />
      {onToggleFilters && (
        <button
          type="button"
          onClick={onToggleFilters}
          aria-expanded={filtersOpen}
          aria-label={filtersOpen ? 'Hide filters' : 'Show filters'}
          className="flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-crm-taupe/20 bg-crm-surface px-3 text-xs font-medium text-crm-heading transition hover:bg-crm-indigo-50 md:hidden"
        >
          <span>Filters</span>
          {filtersActive && (
            <span
              aria-hidden="true"
              className="h-1.5 w-1.5 rounded-full bg-crm-indigo"
            />
          )}
        </button>
      )}

      <div className="ml-auto flex shrink-0 items-center gap-2">
        <PipelineLayoutToggle
          value={layout}
          allowedLayouts={allowedLayouts}
          onChange={onLayoutChange}
        />
        {showSort && layout !== 'gantt' && sortBy && onSortByChange && (
          <>
            <label
              htmlFor="application-list-sort"
              className="text-xs font-medium text-crm-slate"
            >
              Sort by
            </label>
            <select
              id="application-list-sort"
              value={sortBy}
              onChange={(event) =>
                onSortByChange(event.target.value as ApplicationSortOption)
              }
              className="h-9 rounded-lg border border-crm-taupe/20 bg-crm-surface px-3 text-sm font-medium text-crm-heading transition hover:border-crm-taupe/28 hover:bg-crm-indigo-50 focus:border-crm-indigo/40 focus:outline-none focus:ring-2 focus:ring-crm-indigo/20"
            >
              {APPLICATION_SORT_OPTIONS.map(({ value, label }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </>
        )}
      </div>
    </div>
  );
}
