import { endOfServiceReviewColumnMap } from '../config/endOfServiceReviewColumnMap';
import type { ApplicationFormField } from '../types/volunteer';
import { parseFlexibleDate } from '../utils/volunteerTerm';
import { buildEndOfServiceReviewFormFields } from './applicationFormFields';
import { parseLinkedBoardRelationIds } from './mondayFileColumns';
import type { MondayBoardItem, MondayColumnValue } from './mapMondayToCrm';

function normalizeTitle(title: string): string {
  return title.trim().toLowerCase();
}

function columnTitle(col: MondayColumnValue): string {
  return col.column?.title?.trim() || '';
}

export interface EndOfServiceReviewSummary {
  itemId: string;
  volunteerName: string;
  completedAt?: string;
  contactIds: string[];
  email: string;
  fields: ApplicationFormField[];
}

export function findEndOfServiceReviewColumn(
  columnValues: MondayColumnValue[],
  fieldKey: keyof typeof endOfServiceReviewColumnMap,
): MondayColumnValue | undefined {
  const viteEnv = import.meta.env ?? {};
  const contactLinkColumnId = viteEnv
    .VITE_EOS_REVIEW_COL_CONTACT_LINK_ID as string | undefined;
  if (fieldKey === 'contactLink' && contactLinkColumnId?.trim()) {
    const byId = columnValues.find(
      (col) => col.id === contactLinkColumnId.trim(),
    );
    if (byId) return byId;
  }

  const target = normalizeTitle(endOfServiceReviewColumnMap[fieldKey]);
  if (!target) return undefined;

  return columnValues.find(
    (col) => normalizeTitle(columnTitle(col)) === target,
  );
}

export function getEndOfServiceReviewColumnText(
  columnValues: MondayColumnValue[],
  fieldKey: keyof typeof endOfServiceReviewColumnMap,
): string {
  return findEndOfServiceReviewColumn(columnValues, fieldKey)?.text?.trim() || '';
}

export function parseLinkedContactIdsFromReview(
  columnValues: MondayColumnValue[],
): string[] {
  const col = findEndOfServiceReviewColumn(columnValues, 'contactLink');
  return parseLinkedBoardRelationIds(col);
}

function parseCompletedDateFromColumn(
  columnValues: MondayColumnValue[],
): string | undefined {
  const configuredTitle = endOfServiceReviewColumnMap.completedDate.trim();
  if (!configuredTitle) return undefined;

  const col = findEndOfServiceReviewColumn(columnValues, 'completedDate');
  if (!col) return undefined;

  const fromText = col.text?.trim();
  if (fromText) {
    const parsed = parseFlexibleDate(fromText);
    if (parsed) return parsed.toISOString().slice(0, 10);
    return fromText;
  }

  if (col.value) {
    try {
      const parsed = JSON.parse(col.value) as { date?: string };
      if (parsed.date?.trim()) {
        return parsed.date.trim();
      }
    } catch {
      // fall through
    }
  }

  return undefined;
}

export function resolveReviewCompletedAt(item: MondayBoardItem): string | undefined {
  const fromColumn = parseCompletedDateFromColumn(item.column_values);
  if (fromColumn) return fromColumn;

  if (item.created_at?.trim()) {
    const parsed = parseFlexibleDate(item.created_at.slice(0, 10));
    return parsed
      ? parsed.toISOString().slice(0, 10)
      : item.created_at.slice(0, 10);
  }

  return undefined;
}

export function mapEndOfServiceReviewItem(
  item: MondayBoardItem,
): EndOfServiceReviewSummary {
  return {
    itemId: item.id,
    volunteerName: item.name,
    completedAt: resolveReviewCompletedAt(item),
    contactIds: parseLinkedContactIdsFromReview(item.column_values),
    email: getEndOfServiceReviewColumnText(item.column_values, 'email'),
    fields: buildEndOfServiceReviewFormFields(item.column_values),
  };
}
