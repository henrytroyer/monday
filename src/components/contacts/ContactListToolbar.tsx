/**
 * ContactListToolbar.tsx — Search row at the top of the contacts results column.
 */

import ContactSearchBar from './ContactSearchBar';

interface ContactListToolbarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  /** Phone-only Filters toggle. Omitted on desktop where the rail is always visible. */
  filtersOpen?: boolean;
  filtersActive?: boolean;
  onToggleFilters?: () => void;
}

export default function ContactListToolbar({
  searchQuery,
  onSearchChange,
  filtersOpen = false,
  filtersActive = false,
  onToggleFilters,
}: ContactListToolbarProps) {
  return (
    <div className="relative z-10 flex shrink-0 items-center gap-2 border-b border-crm-taupe/15 bg-crm-surface px-4 py-2">
      <ContactSearchBar
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
    </div>
  );
}
