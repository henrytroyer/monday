import { resolveTimelineId } from '../config/timelineMap';
import { serviceEndedColumnMap } from '../config/serviceEndedColumnMap';
import { getTimelineLabel } from '../data/timelines';
import type { VolunteerTerm } from '../types/volunteer';
import { parseLinkedBoardRelationIds } from './mondayFileColumns';
import type { MondayBoardItem, MondayColumnValue } from './mapMondayToCrm';

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
  const shortTermLinkColumnId = import.meta.env
    .VITE_SERVICE_ENDED_COL_SHORT_TERM_LINK_ID as string | undefined;
  if (fieldKey === 'shortTermAppLink' && shortTermLinkColumnId?.trim()) {
    const byId = columnValues.find(
      (col) => col.id === shortTermLinkColumnId.trim(),
    );
    if (byId) return byId;
  }

  const contactLinkColumnId = import.meta.env
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
  if (!col) return {};

  const text = col.text?.trim();
  if (text) {
    const parts = text.split(/\s*-\s*/);
    if (parts.length >= 2) {
      return { termStart: parts[0].trim(), termEnd: parts[1].trim() };
    }
  }

  if (col.value) {
    try {
      const parsed = JSON.parse(col.value) as {
        from?: string;
        to?: string;
      };
      return {
        ...(parsed.from?.trim() ? { termStart: parsed.from.trim() } : {}),
        ...(parsed.to?.trim() ? { termEnd: parsed.to.trim() } : {}),
      };
    } catch {
      // fall through
    }
  }

  return {};
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
