/**
 * boardRelationWrite.ts — Write Monday board_relation columns via { item_ids }.
 * Mirrors server/mondayDonorSync.mjs formatBoardRelationValue.
 */

import { mondayGraphQL as api } from './mondayGraphQL';
import { mutations, parseFormattedColumnValue } from '../utils/mondayQueries';
import {
  changeMultipleColumnsByTitle,
  fetchWriteBoardColumns,
  findBoardColumnByTitle,
} from './mondayColumnWrite';

export function formatBoardRelationValue(itemIds: string[]): string {
  const unique = [...new Set(itemIds.map(String).filter(Boolean))];
  return JSON.stringify({ item_ids: unique });
}

export async function writeBoardRelationByTitle(
  boardId: string,
  itemId: string,
  columnTitle: string,
  itemIds: string[],
  options?: { quiet?: boolean },
): Promise<void> {
  const column = await findBoardColumnByTitle(boardId, columnTitle);
  if (!column) {
    throw new Error(`Relation column "${columnTitle}" not found on board ${boardId}`);
  }
  const formatted = formatBoardRelationValue(itemIds);
  if (options?.quiet) {
    await api(mutations.updateMultipleColumnValues, {
      boardId,
      itemId,
      columnValues: JSON.stringify({
        [column.id]: parseFormattedColumnValue(formatted),
      }),
      createLabelsIfMissing: false,
    });
    return;
  }
  await api(mutations.updateColumnValue, {
    boardId,
    itemId,
    columnId: column.id,
    value: formatted,
  });
}

/** Batch several relation columns onto one item (merge quiet path). */
export async function writeBoardRelationsByTitle(
  boardId: string,
  itemId: string,
  relations: Array<{ columnTitle: string; itemIds: string[] }>,
): Promise<void> {
  if (relations.length === 0) return;
  await changeMultipleColumnsByTitle(
    boardId,
    itemId,
    relations.map((entry) => ({
      columnTitle: entry.columnTitle,
      rawValue: '',
      formattedValue: formatBoardRelationValue(entry.itemIds),
    })),
  );
}

export async function readBoardRelationIdsByTitle(
  boardId: string,
  itemId: string,
  columnTitle: string,
  columnValues: Array<{
    id?: string;
    value?: string | null;
    column?: { title?: string | null; id?: string } | null;
    linked_item_ids?: string[];
  }>,
): Promise<string[]> {
  await fetchWriteBoardColumns(boardId);
  const column = await findBoardColumnByTitle(boardId, columnTitle);
  if (!column) return [];

  const match = columnValues.find(
    (col) =>
      col.id === column.id ||
      col.column?.id === column.id ||
      col.column?.title?.trim().toLowerCase() ===
        columnTitle.trim().toLowerCase(),
  );
  if (!match) return [];

  if (Array.isArray(match.linked_item_ids) && match.linked_item_ids.length > 0) {
    return match.linked_item_ids.map(String);
  }
  if (!match.value) return [];
  try {
    const parsed = JSON.parse(match.value) as {
      linkedPulseIds?: Array<{ linkedPulseId?: number | string }>;
      item_ids?: Array<number | string>;
    };
    if (Array.isArray(parsed.item_ids)) {
      return parsed.item_ids.map(String);
    }
    if (Array.isArray(parsed.linkedPulseIds)) {
      return parsed.linkedPulseIds
        .map((entry) => entry.linkedPulseId)
        .filter(Boolean)
        .map(String);
    }
  } catch {
    // ignore
  }
  return [];
}
