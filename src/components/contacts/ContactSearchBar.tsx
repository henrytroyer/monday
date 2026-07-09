interface ContactSearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  id?: string;
}

function SearchIcon() {
  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-crm-slate"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21 21l-4.35-4.35M11 18a7 7 0 100-14 7 7 0 000 14z"
      />
    </svg>
  );
}

/** Compact contact search for the list toolbar. */
export default function ContactSearchBar({
  value,
  onChange,
  placeholder = 'Search contacts…',
  id = 'contact-list-search',
}: ContactSearchBarProps) {
  return (
    <div className="relative min-w-0 max-w-md flex-1">
      <label htmlFor={id} className="sr-only">
        Search
      </label>
      <SearchIcon />
      <input
        id={id}
        type="search"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 w-full rounded-lg border border-crm-taupe/20 bg-crm-surface pl-8 pr-3 text-sm text-crm-text outline-none placeholder:text-crm-slate/70 focus:border-crm-taupe/28 focus:ring-2 focus:ring-crm-taupe/15"
      />
    </div>
  );
}
