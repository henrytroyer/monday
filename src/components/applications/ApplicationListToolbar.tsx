import ContactSearchBar from '../contacts/ContactSearchBar';
import ContactFiltersTab from '../contacts/ContactFiltersTab';

interface ApplicationListToolbarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  filtersOpen: boolean;
  filtersActive: boolean;
  onToggleFilters: () => void;
  onClearFilters: () => void;
}

/** Full-width search + filter row at the top of the applications list card. */
export default function ApplicationListToolbar({
  searchQuery,
  onSearchChange,
  filtersOpen,
  filtersActive,
  onToggleFilters,
  onClearFilters,
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
    </div>
  );
}
