function ChevronDownIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  );
}

function ChevronUpIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
    </svg>
  );
}

interface ContactFiltersTabProps {
  open: boolean;
  hasActiveFilters: boolean;
  onClick: () => void;
}

export default function ContactFiltersTab({
  open,
  hasActiveFilters,
  onClick,
}: ContactFiltersTabProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={open}
      aria-label={open ? 'Hide filters' : 'Show filters'}
      className="absolute left-1/2 top-0 z-30 flex -translate-x-1/2 items-center gap-2 rounded-b-2xl border border-t-0 border-crm-taupe/20 bg-crm-surface/95 px-5 py-2.5 text-sm font-semibold text-crm-heading shadow-sm backdrop-blur-md transition hover:border-crm-taupe/28 hover:bg-crm-indigo-50"
    >
      <span className="tracking-wide">Filters</span>
      {hasActiveFilters && (
        <span
          aria-hidden="true"
          className="h-2 w-2 rounded-full bg-crm-indigo"
        />
      )}
      {open ? <ChevronUpIcon /> : <ChevronDownIcon />}
    </button>
  );
}
