import type { MondayBoardRole } from '../config/boards';
import { resolveBoardRole } from '../config/boards';
import type {
  CrmActivityCategory,
  CrmActivityEntityType,
  CrmActivityEvent,
  MondayActivityLogRaw,
} from '../types/activityLog';

export interface FormatActivityLogContext {
  boardId: string;
  boardName: string;
  userNamesById: Map<string, string>;
  boardRole?: MondayBoardRole;
}

function parseMondayActivityTimestamp(raw: string): string {
  const trimmed = raw.trim();
  if (/^\d{17,}$/.test(trimmed)) {
    const ms = Math.floor(Number(trimmed.slice(0, 13)));
    if (Number.isFinite(ms)) {
      return new Date(ms).toISOString();
    }
  }
  const parsed = new Date(trimmed);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString();
  }
  return trimmed;
}

function parseDataPayload(data: string | null | undefined): Record<string, unknown> {
  if (!data?.trim()) return {};
  try {
    const parsed = JSON.parse(data) as unknown;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // ignore malformed payloads
  }
  return {};
}

function stringField(payload: Record<string, unknown>, ...keys: string[]): string | undefined {
  for (const key of keys) {
    const value = payload[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
    if (typeof value === 'number' && Number.isFinite(value)) {
      return String(value);
    }
  }
  return undefined;
}

function formatColumnValue(value: unknown): string | undefined {
  if (value == null) return undefined;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  if (typeof value !== 'object') return undefined;

  const record = value as Record<string, unknown>;
  const label = record.label;
  if (label && typeof label === 'object') {
    const text = (label as Record<string, unknown>).text;
    if (typeof text === 'string' && text.trim()) return text.trim();
  }
  const text = record.text;
  if (typeof text === 'string' && text.trim()) return text.trim();
  const name = record.name;
  if (typeof name === 'string' && name.trim()) return name.trim();

  try {
    return JSON.stringify(value);
  } catch {
    return undefined;
  }
}

function resolveEntityType(
  boardId: string,
  boardRole?: MondayBoardRole,
): CrmActivityEntityType {
  const role = boardRole ?? resolveBoardRole(boardId);
  if (role === 'contacts') return 'contact';
  if (role === 'applications') return 'application';
  return 'donation';
}

function resolveNavigateTo(
  boardId: string,
  entityId: string | undefined,
  boardRole?: MondayBoardRole,
): CrmActivityEvent['navigateTo'] | undefined {
  if (!entityId) return undefined;
  const role = boardRole ?? resolveBoardRole(boardId);
  if (role === 'contacts') {
    return { page: 'contacts', focusId: entityId };
  }
  if (role === 'applications') {
    return { page: 'applications', focusId: entityId };
  }
  return undefined;
}

function categoryForEvent(event: string): CrmActivityCategory {
  const normalized = event.toLowerCase();
  if (normalized.includes('create_pulse') || normalized.includes('create_item')) {
    return 'created';
  }
  if (normalized.includes('delete_pulse') || normalized.includes('delete_item')) {
    return 'deleted';
  }
  if (
    normalized.includes('move_pulse') ||
    normalized.includes('move_item') ||
    normalized.includes('move_to_group')
  ) {
    return 'moved';
  }
  if (normalized.includes('create_update') || normalized.includes('create_comment')) {
    return 'comment';
  }
  if (normalized.includes('comment') || normalized.includes('reply')) {
    return 'comment';
  }
  if (normalized.includes('update')) {
    return 'updated';
  }
  return 'other';
}

function formatUpdateColumnValue(
  payload: Record<string, unknown>,
  itemName: string | undefined,
): { summary: string; detail?: string } {
  const columnTitle =
    stringField(payload, 'column_title', 'columnTitle') ?? 'field';
  const previous = formatColumnValue(payload.previous_value ?? payload.previousValue);
  const next = formatColumnValue(payload.value ?? payload.new_value ?? payload.newValue);

  const subject = itemName ? `"${itemName}"` : 'item';
  if (previous && next && previous !== next) {
    return {
      summary: `Changed ${columnTitle} on ${subject}`,
      detail: `${columnTitle}: ${previous} → ${next}`,
    };
  }
  if (next) {
    return {
      summary: `Updated ${columnTitle} on ${subject}`,
      detail: `${columnTitle}: ${next}`,
    };
  }
  return {
    summary: `Updated ${columnTitle} on ${subject}`,
  };
}

function formatMoveToGroup(
  payload: Record<string, unknown>,
  itemName: string | undefined,
): { summary: string; detail?: string } {
  const destGroup =
    stringField(payload, 'dest_group_name', 'destGroupName', 'group_name') ??
    'another group';
  const sourceGroup = stringField(
    payload,
    'source_group_name',
    'sourceGroupName',
    'previous_group_name',
  );
  const subject = itemName ? `"${itemName}"` : 'Item';
  return {
    summary: `Moved ${subject} to ${destGroup}`,
    detail: sourceGroup ? `From ${sourceGroup} → ${destGroup}` : undefined,
  };
}

export function formatActivityLogEvent(
  raw: MondayActivityLogRaw,
  context: FormatActivityLogContext,
): CrmActivityEvent {
  const payload = parseDataPayload(raw.data);
  const itemName = stringField(
    payload,
    'pulse_name',
    'pulseName',
    'item_name',
    'itemName',
    'name',
  );
  const itemId = stringField(
    payload,
    'pulse_id',
    'pulseId',
    'item_id',
    'itemId',
  );
  const actorUserId = raw.user_id?.trim() || undefined;
  const actorName =
    (actorUserId && context.userNamesById.get(actorUserId)) ||
    (actorUserId ? `User ${actorUserId}` : 'Unknown user');
  const category = categoryForEvent(raw.event);
  const entityType = resolveEntityType(context.boardId, context.boardRole);
  const navigateTo = resolveNavigateTo(context.boardId, itemId, context.boardRole);

  let summary = `Updated ${raw.entity || 'record'}`;
  let detail: string | undefined;

  const event = raw.event.toLowerCase();

  if (event.includes('create_pulse') || event.includes('create_item')) {
    summary = itemName ? `Created "${itemName}"` : 'Created item';
  } else if (event.includes('delete_pulse') || event.includes('delete_item')) {
    summary = itemName ? `Deleted "${itemName}"` : 'Deleted item';
  } else if (
    event.includes('move_pulse') ||
    event.includes('move_item') ||
    event.includes('move_to_group')
  ) {
    const formatted = formatMoveToGroup(payload, itemName);
    summary = formatted.summary;
    detail = formatted.detail;
  } else if (event.includes('update_column_value')) {
    const formatted = formatUpdateColumnValue(payload, itemName);
    summary = formatted.summary;
    detail = formatted.detail;
  } else if (event.includes('create_update') || event.includes('create_comment')) {
    summary = itemName ? `Added comment on "${itemName}"` : 'Added comment';
  } else if (event.includes('update_name')) {
    summary = itemName ? `Renamed item to "${itemName}"` : 'Renamed item';
  }

  return {
    id: `${context.boardId}-${raw.id}`,
    occurredAt: parseMondayActivityTimestamp(raw.created_at),
    actorUserId,
    actorName,
    category,
    boardId: context.boardId,
    boardName: context.boardName,
    entityType,
    entityId: itemId,
    entityName: itemName,
    summary,
    detail,
    navigateTo,
  };
}
