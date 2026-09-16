/**
 * ApplicationFilterChips.tsx — Dismissible active-filter chips above the applications list.
 */

import { getTimelineLabel } from '../../data/timelines';
import type { ApplicationFilterState } from '../../types/volunteer';
import type { ApplicationFilterOption } from '../../utils/filterApplications';

interface ApplicationFilterChipsProps {
  filters: ApplicationFilterState;
  onChange: (filters: ApplicationFilterState) => void;
  onClear: () => void;
  timelineOptions?: ApplicationFilterOption[];
}

function Chip({
  label,
  onDismiss,
}: {
  label: string;
  onDismiss: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onDismiss}
      className="inline-flex items-center gap-1.5 rounded-full bg-crm-indigo-50 px-3 py-1 text-xs font-medium text-crm-heading ring-1 ring-crm-indigo/10 transition"
      aria-label={`Remove filter ${label}`}
    >
      <span>{label}</span>
      <span aria-hidden="true" className="text-crm-slate">
        ×
      </span>
    </button>
  );
}

export default function ApplicationFilterChips({
  filters,
  onChange,
  onClear,
  timelineOptions,
}: ApplicationFilterChipsProps) {
  const search = filters.searchQuery.trim();
  const location = filters.locations[0];
  const timelineId = filters.timelineIds[0];
  if (search.length === 0 && !location && !timelineId) {
    return null;
  }

  const timelineLabel =
    timelineOptions?.find((option) => option.id === timelineId)?.label ??
    (timelineId ? getTimelineLabel(timelineId) : '');

  return (
    <div className="flex flex-wrap items-center gap-2 px-4 py-2">
      {search.length > 0 && (
        <Chip
          label={`Search: ${search}`}
          onDismiss={() => onChange({ ...filters, searchQuery: '' })}
        />
      )}
      {location && (
        <Chip
          label={location}
          onDismiss={() => onChange({ ...filters, locations: [] })}
        />
      )}
      {timelineId && (
        <Chip
          label={timelineLabel}
          onDismiss={() => onChange({ ...filters, timelineIds: [] })}
        />
      )}
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
