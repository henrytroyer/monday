import type { VolunteerTerm } from '../types/volunteer';
import { formatDisplayDate } from './formatDateOfBirth';

/** Compact date range label for a service term row. */
export function formatTermDateRangeLabel(term: VolunteerTerm): string | undefined {
  const start = term.termStart?.trim();
  const end = term.termEnd?.trim();

  if (start && end) {
    const startLabel = formatDisplayDate(start) ?? start;
    const endLabel = formatDisplayDate(end) ?? end;
    return `${startLabel} – ${endLabel}`;
  }

  if (end) {
    return `Ended ${formatDisplayDate(end) ?? end}`;
  }

  if (start) {
    return `Started ${formatDisplayDate(start) ?? start}`;
  }

  return undefined;
}

export function formatEndOfServiceReviewLabel(
  completedAt?: string,
): string {
  if (!completedAt?.trim()) return 'No review on file';
  const formatted = formatDisplayDate(completedAt) ?? completedAt;
  return `Review completed ${formatted}`;
}
