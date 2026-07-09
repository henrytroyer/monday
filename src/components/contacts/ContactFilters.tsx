import {
  CONTACT_TAGS,
  CONTACT_TAG_LABELS,
  type ContactFilterState,
  type ContactSortOption,
} from '../../types/contact';
import { hasActiveContactFilters, toggleContactTag } from '../../utils/filterContacts';
import { contactTagFilterSelectedClass } from '../../utils/contactTagStyles';

interface ContactFiltersProps {
  filters: ContactFilterState;
  onChange: (filters: ContactFilterState) => void;
  onClear: () => void;
  matchingCount: number;
  totalCount: number;
  /** When true, omits outer bottom margin (used in collapsible list header). */
  embedded?: boolean;
  /** Flat panel inside dropdown — no outer card chrome. */
  variant?: 'card' | 'panel';
}

const inputClass =
  'mt-2 w-full rounded-2xl border border-crm-taupe/20 bg-crm-surface px-4 py-2.5 text-sm text-crm-text outline-none focus:border-crm-slate focus:ring-2 focus:ring-crm-taupe/20';

const SORT_OPTIONS: Array<{ value: ContactSortOption; label: string }> = [
  { value: 'name-asc', label: 'Name (A to Z)' },
  { value: 'name-desc', label: 'Name (Z to A)' },
  { value: 'date-desc', label: 'Date (newest first)' },
  { value: 'date-asc', label: 'Date (oldest first)' },
];

export default function ContactFilters({
  filters,
  onChange,
  onClear,
  matchingCount,
  totalCount,
  embedded = false,
  variant = 'card',
}: ContactFiltersProps) {
  const active = hasActiveContactFilters(filters);
  const isPanel = variant === 'panel';

  return (
    <div
      className={
        isPanel
          ? 'p-4'
          : `rounded-3xl border border-crm-taupe/20 bg-crm-surface p-6 shadow-sm ${
              embedded ? '' : 'mb-8'
            }`
      }
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-lg font-semibold text-crm-heading">Filters</h2>
        {active && (
          <button
            type="button"
            onClick={onClear}
            className="rounded-2xl border border-crm-taupe/20 px-4 py-2 text-sm font-medium text-crm-heading transition hover:bg-crm-taupe-50"
          >
            Clear all
          </button>
        )}
      </div>

      <p className="mt-2 text-sm text-crm-slate">
        Showing {matchingCount} of {totalCount} contacts
      </p>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div>
          <label
            htmlFor="contact-sort"
            className="text-sm font-medium text-crm-heading"
          >
            Sort by
          </label>
          <select
            id="contact-sort"
            value={filters.sortBy}
            onChange={(e) =>
              onChange({
                ...filters,
                sortBy: e.target.value as ContactSortOption,
              })
            }
            className={inputClass}
          >
            {SORT_OPTIONS.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <span className="text-sm font-medium text-crm-heading">Tags</span>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onChange({ ...filters, tags: [] })}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                filters.tags.length === 0
                  ? 'bg-crm-indigo-50 text-crm-heading font-medium ring-1 ring-crm-indigo/10'
                  : 'bg-crm-white text-crm-text hover:bg-crm-taupe-100'
              }`}
            >
              All
            </button>
            {CONTACT_TAGS.map((tag) => {
              const selected = filters.tags.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() =>
                    onChange({
                      ...filters,
                      tags: toggleContactTag(filters.tags, tag),
                    })
                  }
                  className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                    selected
                      ? contactTagFilterSelectedClass(tag)
                      : 'bg-crm-white text-crm-text hover:bg-crm-taupe-100'
                  }`}
                >
                  {CONTACT_TAG_LABELS[tag]}
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-xs text-crm-slate">
            Choose All or one or more tags to narrow the list.
          </p>
        </div>
      </div>
    </div>
  );
}
