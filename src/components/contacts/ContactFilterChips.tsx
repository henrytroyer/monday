/**
 * ContactFilterChips.tsx — Dismissible active-filter chips above the contacts list.
 */

import {
  CONTACT_TAG_LABELS,
  type ContactFilterState,
  type ContactTag,
} from '../../types/contact';
import { contactTagFilterSelectedClass } from '../../utils/contactTagStyles';

interface ContactFilterChipsProps {
  filters: ContactFilterState;
  onChange: (filters: ContactFilterState) => void;
  onClear: () => void;
}

function Chip({
  label,
  onDismiss,
  selectedClass,
}: {
  label: string;
  onDismiss: () => void;
  selectedClass?: string;
}) {
  return (
    <button
      type="button"
      onClick={onDismiss}
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition ${
        selectedClass ??
        'bg-crm-indigo-50 text-crm-heading ring-1 ring-crm-indigo/10'
      }`}
      aria-label={`Remove filter ${label}`}
    >
      <span>{label}</span>
      <span aria-hidden="true" className="text-crm-slate">
        ×
      </span>
    </button>
  );
}

export default function ContactFilterChips({
  filters,
  onChange,
  onClear,
}: ContactFilterChipsProps) {
  const search = filters.searchQuery.trim();
  if (search.length === 0 && filters.tags.length === 0) {
    return null;
  }

  const removeTag = (tag: ContactTag) => {
    onChange({
      ...filters,
      tags: filters.tags.filter((current) => current !== tag),
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-2 px-4 py-2">
      {search.length > 0 && (
        <Chip
          label={`Search: ${search}`}
          onDismiss={() => onChange({ ...filters, searchQuery: '' })}
        />
      )}
      {filters.tags.map((tag) => (
        <Chip
          key={tag}
          label={CONTACT_TAG_LABELS[tag]}
          selectedClass={contactTagFilterSelectedClass(tag)}
          onDismiss={() => removeTag(tag)}
        />
      ))}
      <button
        type="button"
        onClick={onClear}
        className="text-xs font-medium text-crm-slate transition hover:text-crm-heading"
      >
        Clear all
      </button>
    </div>
  );
}
