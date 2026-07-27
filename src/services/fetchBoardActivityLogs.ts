import { resolveBoardRole, resolveMonitoredBoardIds } from '../config/boards';
import type { CrmActivityEvent, MondayActivityLogRaw } from '../types/activityLog';
import { formatActivityLogEvent } from './formatActivityLogEvent';
import { mondayGraphQL } from './mondayGraphQL';
import { resolveMondayUserNames } from './resolveMondayUsers';

const BOARD_ACTIVITY_LOGS_QUERY = `query (
  $boardIds: [ID!],
  $from: ISO8601DateTime,
  $to: ISO8601DateTime,
  $page: Int,
  $limit: Int
) {
  boards(ids: $boardIds) {
    id
    name
    activity_logs(from: $from, to: $to, page: $page, limit: $limit) {
      id
      event
      entity
      user_id
      created_at
      data
    }
  }
}`;

interface BoardActivityLogsResult {
  boards?: Array<{
    id: string;
    name: string;
    activity_logs?: MondayActivityLogRaw[];
  }>;
}

export interface FetchBoardActivityLogsOptions {
  from: string;
  to: string;
  page?: number;
  limit?: number;
  boardIds?: string[];
}

export interface FetchBoardActivityLogsResult {
  events: CrmActivityEvent[];
  hasMore: boolean;
  boardNames: Map<string, string>;
}

function toIsoDateTimeStart(dateStr: string): string {
  return new Date(`${dateStr}T00:00:00.000Z`).toISOString();
}

function toIsoDateTimeEnd(dateStr: string): string {
  return new Date(`${dateStr}T23:59:59.999Z`).toISOString();
}

export async function fetchBoardActivityLogs(
  options: FetchBoardActivityLogsOptions,
): Promise<FetchBoardActivityLogsResult> {
  const boardIds = options.boardIds ?? resolveMonitoredBoardIds();
  if (boardIds.length === 0) {
    return { events: [], hasMore: false, boardNames: new Map() };
  }

  const page = options.page ?? 1;
  const limit = options.limit ?? 50;

  const data = await mondayGraphQL<BoardActivityLogsResult>(
    BOARD_ACTIVITY_LOGS_QUERY,
    {
      boardIds,
      from: toIsoDateTimeStart(options.from),
      to: toIsoDateTimeEnd(options.to),
      page,
      limit,
    },
  );

  const boardNames = new Map<string, string>();
  const rawLogs: Array<MondayActivityLogRaw & { boardId: string; boardName: string }> =
    [];

  for (const board of data.boards ?? []) {
    const boardId = String(board.id);
    const boardName = board.name?.trim() || `Board ${boardId}`;
    boardNames.set(boardId, boardName);

    for (const log of board.activity_logs ?? []) {
      rawLogs.push({
        ...log,
        boardId,
        boardName,
      });
    }
  }

  const userIds = rawLogs.map((log) => log.user_id).filter(Boolean);
  const userNamesById = await resolveMondayUserNames(userIds);

  const events = rawLogs.map((log) =>
    formatActivityLogEvent(log, {
      boardId: log.boardId,
      boardName: log.boardName,
      userNamesById,
      boardRole: resolveBoardRole(log.boardId),
    }),
  );

  events.sort(
    (a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime(),
  );

  const perBoardCount = limit * boardIds.length;
  const hasMore = rawLogs.length >= perBoardCount;

  return { events, hasMore, boardNames };
}
