import { SIGNUP_TIMELINES } from '../../data/timelines';
import type { ApplicationFilterState } from '../../types/volunteer';
import { LOCATION_OPTIONS } from '../../types/volunteer';
import { hasActiveFilters } from '../../utils/filterApplications';

interface ApplicationFiltersProps {
  filters: ApplicationFilterState;
  onChange: (filters: ApplicationFilterState) => void;
  onClear: () => void;
  matchingCount: number;
  totalCount: number;
}

const selectClassName =
  'mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200';

export default function ApplicationFilters({
  filters,
  onChange,
  onClear,
  matchingCount,
  totalCount,
}: ApplicationFiltersProps) {
  const active = hasActiveFilters(filters);
  const selectedLocation = filters.locations[0] ?? '';
  const selectedTimeline = filters.timelineIds[0] ?? '';

  return (
    <div className="mb-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-lg font-bold text-slate-900">Filters</h2>
        {active && (
          <button
            type="button"
            onClick={onClear}
            className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Clear all
          </button>
        )}
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <label
            htmlFor="volunteer-search"
            className="text-sm font-medium text-slate-700"
          >
            Search by name
          </label>
          <input
            id="volunteer-search"
            type="search"
            placeholder="Search volunteers..."
            value={filters.searchQuery}
            onChange={(e) =>
              onChange({ ...filters, searchQuery: e.target.value })
            }
            className={selectClassName}
          />
        </div>

        <div>
          <label
            htmlFor="filter-location"
            className="text-sm font-medium text-slate-700"
          >
            Location preference
          </label>
          <select
            id="filter-location-preference"
            value={selectedLocation}
            onChange={(e) =>
              onChange({
                ...filters,
                locations: e.target.value ? [e.target.value] : [],
              })
            }
            className={selectClassName}
          >
            <option value="">All locations</option>
            {LOCATION_OPTIONS.map((location) => (
              <option key={location} value={location}>
                {location}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="filter-timeline"
            className="text-sm font-medium text-slate-700"
          >
            Signup timeline
          </label>
          <select
            id="filter-timeline"
            value={selectedTimeline}
            onChange={(e) =>
              onChange({
                ...filters,
                timelineIds: e.target.value ? [e.target.value] : [],
              })
            }
            className={selectClassName}
          >
            <option value="">All timelines</option>
            {SIGNUP_TIMELINES.map((timeline) => (
              <option key={timeline.id} value={timeline.id}>
                {timeline.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <p className="mt-6 text-sm text-slate-500">
        Showing{' '}
        <span className="font-semibold text-slate-900">{matchingCount}</span> of{' '}
        <span className="font-semibold text-slate-900">{totalCount}</span>{' '}
        volunteers
      </p>
    </div>
  );
}
