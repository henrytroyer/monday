import { resolveTimelineId } from '../config/timelineMap';
import { serviceEndedColumnMap } from '../config/serviceEndedColumnMap';
import { getTimelineLabel } from '../data/timelines';
import type { VolunteerTerm } from '../types/volunteer';
import { parseLinkedBoardRelationIds } from './mondayFileColumns';
import type { MondayBoardItem, MondayColumnValue } from './mapMondayToCrm';
import { parseMondayTimelineColumn } from './mondayTimelineColumn';

function normalizeTitle(title: string): string {
  return title.trim().toLowerCase();
}

function columnTitle(col: MondayColumnValue): string {
  return col.column?.title?.trim() || '';
}

export function findServiceEndedColumn(
  columnValues: MondayColumnValue[],
  fieldKey: keyof typeof serviceEndedColumnMap,
): MondayColumnValue | undefined {
  const shortTermLinkColumnId = (import.meta.env ?? {})
    .VITE_SERVICE_ENDED_COL_SHORT_TERM_LINK_ID as string | undefined;
  if (fieldKey === 'shortTermAppLink' && shortTermLinkColumnId?.trim()) {
    const byId = columnValues.find(
      (col) => col.id === shortTermLinkColumnId.trim(),
    );
    if (byId) return byId;
  }

  const contactLinkColumnId = (import.meta.env ?? {})
    .VITE_SERVICE_ENDED_COL_CONTACT_LINK_ID as string | undefined;
  if (fieldKey === 'contactLink' && contactLinkColumnId?.trim()) {
    const byId = columnValues.find(
      (col) => col.id === contactLinkColumnId.trim(),
    );
    if (byId) return byId;
  }

  const target = normalizeTitle(serviceEndedColumnMap[fieldKey]);
  return columnValues.find(
    (col) => normalizeTitle(columnTitle(col)) === target,
  );
}

export function getServiceEndedColumnText(
  columnValues: MondayColumnValue[],
  fieldKey: keyof typeof serviceEndedColumnMap,
): string {
  return findServiceEndedColumn(columnValues, fieldKey)?.text?.trim() || '';
}

export function parseServiceEndedTermRange(
  columnValues: MondayColumnValue[],
): { termStart?: string; termEnd?: string } {
  const col = findServiceEndedColumn(columnValues, 'termRange');
  // Prefer JSON from/to (and ISO-safe text regex). Never split on bare "-" —
  // that shatters "2026-06-16 - 2026-09-07" into "2026" / "06" (shows as 2001).
  const range = parseMondayTimelineColumn(col);
  if (!range) return {};
  return { termStart: range.from, termEnd: range.to };
}

export function parseLinkedContactIdsFromServiceEnded(
  columnValues: MondayColumnValue[],
): string[] {
  const col = findServiceEndedColumn(columnValues, 'contactLink');
  return parseLinkedBoardRelationIds(col);
}

export function parseLinkedShortTermAppIdsFromServiceEnded(
  columnValues: MondayColumnValue[],
): string[] {
  const col = findServiceEndedColumn(columnValues, 'shortTermAppLink');
  return parseLinkedBoardRelationIds(col);
}

export function mapServiceEndedItemToTerm(item: MondayBoardItem): VolunteerTerm {
  const timelineLabel = getServiceEndedColumnText(
    item.column_values,
    'signupTimeline',
  );
  const timelineId = resolveTimelineId(timelineLabel);
  const { termStart, termEnd } = parseServiceEndedTermRange(item.column_values);
  const linkedApplicationItemId =
    parseLinkedShortTermAppIdsFromServiceEnded(item.column_values)[0];

  return {
    itemId: item.id,
    timelineId,
    timelineLabel: getTimelineLabel(timelineId) || timelineLabel || '—',
    termStart,
    termEnd,
    status: getServiceEndedColumnText(item.column_values, 'status') || '—',
    pipelineStage: item.group?.title ?? '—',
    locationPreference:
      getServiceEndedColumnText(item.column_values, 'locationPreference') ||
      getServiceEndedColumnText(item.column_values, 'location') ||
      undefined,
    recordType: 'service-ended',
    linkedApplicationItemId,
    notes: [],
  };
}
