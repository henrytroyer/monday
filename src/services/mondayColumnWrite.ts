/**
 * mondayColumnWrite.ts — Shared title-based column writes for CRM ↔ Monday sync.
 * Every product edit should go through these helpers so monday.com stays SoT.
 */

import { mondayGraphQL as api } from './mondayGraphQL';
import {
  formatColumnValue,
  mutations,
  parseFormattedColumnValue,
  queries,
} from '../utils/mondayQueries';

export interface MondayWriteColumn {
  id: string;
  title: string;
  type: string;
}

function normalizeColumnTitle(title: string): string {
  return title.trim().toLowerCase();
}

function columnWriteError(
  columnTitle: string,
  columnType: string,
  err: unknown,
): Error {
  const message = err instanceof Error ? err.message : String(err);
  return new Error(
    `Could not save "${columnTitle}" (${columnType}): ${message}`,
  );
}

const columnsCache = new Map<string, { at: number; columns: MondayWriteColumn[] }>();
const COLUMNS_TTL_MS = 60_000;

export async function fetchWriteBoardColumns(
  boardId: string,
): Promise<MondayWriteColumn[]> {
  const cached = columnsCache.get(boardId);
  if (cached && Date.now() - cached.at < COLUMNS_TTL_MS) {
    return cached.columns;
  }
  const data = await api<{
    boards: Array<{ columns: MondayWriteColumn[] }>;
  }>(queries.getBoardColumns, { boardId: [boardId] });
  const columns = data.boards?.[0]?.columns ?? [];
  columnsCache.set(boardId, { at: Date.now(), columns });
  return columns;
}

export function invalidateWriteBoardColumns(boardId?: string): void {
  if (boardId) columnsCache.delete(boardId);
  else columnsCache.clear();
}

export async function findBoardColumnByTitle(
  boardId: string,
  columnTitle: string,
): Promise<MondayWriteColumn | null> {
  const columns = await fetchWriteBoardColumns(boardId);
  const target = normalizeColumnTitle(columnTitle);
  return (
    columns.find((c) => normalizeColumnTitle(c.title) === target) ?? null
  );
}

export type MondayColumnWriteOptions = {
  createLabelsIfMissing?: boolean;
  simple?: boolean;
  /**
   * Prefer change_multiple_column_values when batching (opt-in for merge).
   * Single-column quiet writes still use one mutation; prefer changeMultipleColumnsByTitle.
   */
  quiet?: boolean;
};

/** Write a CRM string into a Monday column resolved by title. */
export async function changeColumnByTitle(
  boardId: string,
  itemId: string,
  columnTitle: string,
  rawValue: string,
  options?: MondayColumnWriteOptions,
): Promise<void> {
  const column = await findBoardColumnByTitle(boardId, columnTitle);
  if (!column) {
    throw new Error(
      `Column "${columnTitle}" not found on board ${boardId}. Check column maps / VITE_*_COL_* overrides.`,
    );
  }

  try {
    if (options?.quiet) {
      const value = options.simple
        ? rawValue
        : parseFormattedColumnValue(formatColumnValue(rawValue, column.type));
      await api(mutations.updateMultipleColumnValues, {
        boardId,
        itemId,
        columnValues: JSON.stringify({ [column.id]: value }),
        createLabelsIfMissing: options?.createLabelsIfMissing ?? false,
      });
      return;
    }

    if (options?.simple) {
      await api(mutations.updateSimpleColumnValue, {
        boardId,
        itemId,
        columnId: column.id,
        value: rawValue,
        createLabelsIfMissing: options?.createLabelsIfMissing ?? false,
      });
      return;
    }

    await api(mutations.updateColumnValue, {
      boardId,
      itemId,
      columnId: column.id,
      value: formatColumnValue(rawValue, column.type),
      createLabelsIfMissing: options?.createLabelsIfMissing ?? false,
    });
  } catch (err) {
    throw columnWriteError(column.title, column.type, err);
  }
}

export type MondayBatchColumnUpdate = {
  columnTitle: string;
  rawValue: string;
  /** When set, used as the change_multiple value instead of formatColumnValue(rawValue). */
  formattedValue?: string;
  simple?: boolean;
};

/**
 * Batch several title-resolved column writes into one change_multiple_column_values.
 * Opt-in quiet path for merge — normal CRM edits keep per-column mutations.
 */
export async function changeMultipleColumnsByTitle(
  boardId: string,
  itemId: string,
  updates: MondayBatchColumnUpdate[],
  options?: { createLabelsIfMissing?: boolean },
): Promise<void> {
  if (updates.length === 0) return;

  const columnValues: Record<string, unknown> = {};
  for (const update of updates) {
    const column = await findBoardColumnByTitle(boardId, update.columnTitle);
    if (!column) {
      throw new Error(
        `Column "${update.columnTitle}" not found on board ${boardId}. Check column maps / VITE_*_COL_* overrides.`,
      );
    }
    if (update.simple) {
      columnValues[column.id] = update.rawValue;
      continue;
    }
    const formatted =
      update.formattedValue ?? formatColumnValue(update.rawValue, column.type);
    columnValues[column.id] = parseFormattedColumnValue(formatted);
  }

  try {
    await api(mutations.updateMultipleColumnValues, {
      boardId,
      itemId,
      columnValues: JSON.stringify(columnValues),
      createLabelsIfMissing: options?.createLabelsIfMissing ?? false,
    });
  } catch (err) {
    const titles = updates.map((u) => u.columnTitle).join(', ');
    throw columnWriteError(titles, 'batch', err);
  }
}

/** Best-effort write: skip silently when the column is missing on the board. */
export async function tryChangeColumnByTitle(
  boardId: string,
  itemId: string,
  columnTitle: string,
  rawValue: string,
  options?: MondayColumnWriteOptions,
): Promise<boolean> {
  const column = await findBoardColumnByTitle(boardId, columnTitle);
  if (!column) return false;
  await changeColumnByTitle(boardId, itemId, columnTitle, rawValue, options);
  return true;
}
