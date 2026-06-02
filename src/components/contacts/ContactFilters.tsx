import {
  CONTACT_TAGS,
  CONTACT_TAG_LABELS,
  type ContactFilterState,
} from '../../types/contact';
import { hasActiveContactFilters, toggleContactTag } from '../../utils/filterContacts';

interface ContactFiltersProps {
  filters: ContactFilterState;
  onChange: (filters: ContactFilterState) => void;
  onClear: () => void;
  matchingCount: number;
  totalCount: number;
}

const inputClass =
  'mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200';

export default function ContactFilters({
  filters,
  onChange,
  onClear,
  matchingCount,
  totalCount,
}: ContactFiltersProps) {
  const active = hasActiveContactFilters(filters);

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

      <p className="mt-2 text-sm text-slate-500">
        Showing {matchingCount} of {totalCount} contacts
      </p>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div>
          <label
            htmlFor="contact-search"
            className="text-sm font-medium text-slate-700"
          >
            Search by name or email
          </label>
          <input
            id="contact-search"
            type="search"
            placeholder="Search contacts..."
            value={filters.searchQuery}
            onChange={(e) =>
              onChange({ ...filters, searchQuery: e.target.value })
            }
            className={inputClass}
          />
        </div>

        <div>
          <span className="text-sm font-medium text-slate-700">Tags</span>
          <div className="mt-2 flex flex-wrap gap-2">
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
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {CONTACT_TAG_LABELS[tag]}
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Select one or more tags. Leave empty to show all contacts.
          </p>
        </div>
      </div>
    </div>
  );
}
