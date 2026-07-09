import ContactFiltersTab from './ContactFiltersTab';
import ContactSearchBar from './ContactSearchBar';

interface ContactListToolbarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  filtersOpen: boolean;
  filtersActive: boolean;
  onToggleFilters: () => void;
  onClearFilters: () => void;
}

/** Full-width search + filter row at the top of the contacts list card. */
export default function ContactListToolbar({
  searchQuery,
  onSearchChange,
  filtersOpen,
  filtersActive,
  onToggleFilters,
  onClearFilters,
}: ContactListToolbarProps) {
  return (
    <div className="relative z-30 flex shrink-0 items-center gap-2 border-b border-crm-taupe/15 bg-crm-surface px-4 py-2">
      <ContactSearchBar value={searchQuery} onChange={onSearchChange} />
      <ContactFiltersTab
        open={filtersOpen}
        hasActiveFilters={filtersActive}
        onClick={onToggleFilters}
        onClear={onClearFilters}
      />
    </div>
  );
}
