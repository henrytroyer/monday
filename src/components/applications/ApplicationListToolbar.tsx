/**
 * ApplicationListToolbar.tsx
 * Search + filters on the left; layout toggle + Sort by on the far right.
 */
import ContactSearchBar from '../contacts/ContactSearchBar';
import ContactFiltersTab from '../contacts/ContactFiltersTab';
import type { PipelineLayout } from '../../preferences/pipelineLayoutStorage';
import {
  APPLICATION_SORT_OPTIONS,
  type ApplicationSortOption,
} from '../../utils/organizePipelineVolunteers';
import PipelineLayoutToggle from './PipelineLayoutToggle';

interface ApplicationListToolbarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  filtersOpen: boolean;
  filtersActive: boolean;
  onToggleFilters: () => void;
  onClearFilters: () => void;
  sortBy: ApplicationSortOption;
  onSortByChange: (sortBy: ApplicationSortOption) => void;
  layout: PipelineLayout;
  onLayoutChange: (layout: PipelineLayout) => void;
}

/** Full-width search + filter + layout + sort row at the top of the applications list card. */
export default function ApplicationListToolbar({
  searchQuery,
  onSearchChange,
  filtersOpen,
  filtersActive,
  onToggleFilters,
  onClearFilters,
  sortBy,
  onSortByChange,
  layout,
  onLayoutChange,
}: ApplicationListToolbarProps) {
  return (
    <div className="relative z-30 flex shrink-0 items-center gap-2 border-b border-crm-taupe/15 bg-crm-surface px-4 py-2">
      <ContactSearchBar
        id="application-list-search"
        placeholder="Search volunteers…"
        value={searchQuery}
        onChange={onSearchChange}
      />
      <ContactFiltersTab
        open={filtersOpen}
        hasActiveFilters={filtersActive}
        onClick={onToggleFilters}
        onClear={onClearFilters}
      />

      <div className="ml-auto flex shrink-0 items-center gap-2">
        <PipelineLayoutToggle value={layout} onChange={onLayoutChange} />
        {layout !== 'gantt' && (
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
