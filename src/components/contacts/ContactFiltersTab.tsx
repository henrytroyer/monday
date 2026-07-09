function ChevronDownIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-3.5 w-3.5"
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
      className="h-3.5 w-3.5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
    </svg>
  );
}

function ClearXIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-3 w-3 text-red-500"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2.5}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

interface ContactFiltersTabProps {
  open: boolean;
  hasActiveFilters: boolean;
  onClick: () => void;
  onClear?: () => void;
}

const shellClass =
  'h-9 overflow-hidden rounded-lg border border-crm-taupe/20 bg-crm-surface text-sm transition-colors';

const segmentClass =
  'flex h-full flex-1 items-center justify-center px-3 text-xs font-medium transition-colors';

export default function ContactFiltersTab({
  open,
  hasActiveFilters,
  onClick,
  onClear,
}: ContactFiltersTabProps) {
  if (!hasActiveFilters || !onClear) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-expanded={open}
        aria-label={open ? 'Hide filters' : 'Show filters'}
        className={`${shellClass} flex items-center gap-1.5 px-3.5 font-medium text-crm-heading hover:border-crm-taupe/28 hover:bg-crm-indigo-50`}
      >
        <span>Filters</span>
        {open ? <ChevronUpIcon /> : <ChevronDownIcon />}
      </button>
    );
  }

  return (
    <div
      className={`group ${shellClass} w-[8.5rem]`}
      aria-label="Filter actions"
    >
      <button
        type="button"
        onClick={onClick}
        aria-expanded={open}
        aria-label={open ? 'Hide filters' : 'Show filters'}
        className="flex h-full w-full items-center justify-center gap-1.5 px-3 font-medium text-crm-heading transition-colors hover:bg-crm-indigo-50 group-hover:hidden group-focus-within:hidden [@media(hover:none)]:hidden"
      >
        <span>Filters</span>
        <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-crm-indigo" />
        {open ? <ChevronUpIcon /> : <ChevronDownIcon />}
      </button>

      <div className="hidden h-full w-full group-hover:flex group-focus-within:flex [@media(hover:none)]:flex">
        <button
          type="button"
          onClick={onClick}
          aria-expanded={open}
          aria-label={open ? 'Hide filters' : 'Show filters'}
          className={`${segmentClass} gap-1 border-r border-crm-taupe/20 text-crm-heading hover:bg-crm-indigo-50`}
        >
          <span>Filter</span>
          <ChevronDownIcon />
        </button>
        <button
          type="button"
          onClick={onClear}
          aria-label="Clear filters"
          className={`${segmentClass} gap-1 text-crm-slate hover:bg-crm-taupe-50 hover:text-crm-heading`}
        >
          <span>Clear</span>
          <ClearXIcon />
        </button>
      </div>
    </div>
  );
}
