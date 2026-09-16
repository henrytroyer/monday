/**
 * ContactDetailNav.tsx — Breeze-style section rail for contact detail.
 */

import type { SectionId } from '../../preferences/workFocus';

export interface ContactDetailNavItem {
  id: SectionId;
  label: string;
}

interface ContactDetailNavProps {
  items: ContactDetailNavItem[];
  activeId: SectionId;
  onSelect: (id: SectionId) => void;
}

export default function ContactDetailNav({
  items,
  activeId,
  onSelect,
}: ContactDetailNavProps) {
  return (
    <nav
      aria-label="Contact sections"
      className="flex min-h-0 shrink-0 gap-1.5 overflow-x-auto border-b border-crm-taupe/15 px-3 py-2 md:w-52 md:flex-col md:overflow-y-auto md:border-b-0 md:border-r md:px-3 md:py-4"
    >
      <p className="mb-2 hidden px-3 text-xs font-semibold uppercase tracking-wide text-crm-heading md:block">
        Sections
      </p>
      {items.map((item) => {
        const selected = item.id === activeId;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(item.id)}
            aria-current={selected ? 'page' : undefined}
            className={`shrink-0 rounded-xl px-3 py-2 text-left text-sm font-medium transition ${
              selected
                ? 'bg-crm-indigo-50 text-crm-heading ring-1 ring-crm-indigo/10'
                : 'text-crm-text hover:bg-crm-taupe-50'
            }`}
          >
            {item.label}
          </button>
        );
      })}
    </nav>
  );
}
