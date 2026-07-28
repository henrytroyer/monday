/**
 * Formats raw monday.com activity_log rows into coordinator-facing CRM events.
 * Avoids Monday jargon (pulse, raw entity names, JSON dumps) in summaries.
 */
import type { MondayBoardRole } from '../config/boards';
import { resolveBoardRole } from '../config/boards';
import {
  activityEntityNoun,
  friendlyActivityBoardLabel,
} from '../constants/activityLabels';
import type {
  CrmActivityCategory,
  CrmActivityEntityType,
  CrmActivityEvent,
  CrmActivityUndo,
  MondayActivityLogRaw,
} from '../types/activityLog';
import { systemActorName } from './resolveMondayUsers';

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

function nestedString(
  value: unknown,
  ...keys: string[]
): string | undefined {
  if (!value || typeof value !== 'object') return undefined;
  return stringField(value as Record<string, unknown>, ...keys);
}

function cleanColumnTitle(title: string | undefined): string {
  if (!title?.trim()) return 'a field';
  return title.replace(/[↗️⬅︎→⬅]+/g, '').trim() || 'a field';
}

/** Prefer human-readable label/text; never dump raw JSON into the UI. */
export function formatColumnValue(value: unknown): string | undefined {
  if (value == null) return undefined;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    const text = String(value).trim();
    return text || undefined;
  }
  if (typeof value !== 'object') return undefined;

  const record = value as Record<string, unknown>;

  // Status / color columns
  const label = record.label;
  if (label && typeof label === 'object') {
    const text = (label as Record<string, unknown>).text;
    if (typeof text === 'string' && text.trim()) return text.trim();
  }
  if (typeof record.text === 'string' && record.text.trim()) {
    return record.text.trim();
  }
  if (typeof record.name === 'string' && record.name.trim()) {
    return record.name.trim();
  }

  // Dropdown / tags
  const chosen = record.chosenValues ?? record.chosen_values;
  if (Array.isArray(chosen) && chosen.length > 0) {
    const names = chosen
      .map((entry) => {
        if (!entry || typeof entry !== 'object') return undefined;
        const name = (entry as Record<string, unknown>).name;
        return typeof name === 'string' && name.trim() ? name.trim() : undefined;
      })
      .filter((n): n is string => Boolean(n));
    if (names.length > 0) return names.join(', ');
  }
  if (Array.isArray(record.labels) && record.labels.length > 0) {
    const labels = record.labels
      .map((entry) => (typeof entry === 'string' ? entry.trim() : undefined))
      .filter((n): n is string => Boolean(n));
    if (labels.length > 0) return labels.join(', ');
  }

  // Timeline / date range (en dash so the change arrow stays clear)
  if (
    (typeof record.from === 'string' && record.from.trim()) ||
    (typeof record.to === 'string' && record.to.trim())
  ) {
    const from = typeof record.from === 'string' ? record.from.trim() : '';
    const to = typeof record.to === 'string' ? record.to.trim() : '';
    if (from && to) return `${from} – ${to}`;
    return from || to || undefined;
  }

  if (typeof record.date === 'string' && record.date.trim()) {
    return record.date.trim();
  }
  if (typeof record.email === 'string' && record.email.trim()) {
    return record.email.trim();
  }
  if (typeof record.phone === 'string' && record.phone.trim()) {
    return record.phone.trim();
  }
  if (record.checked === true || record.checked === 'true') return 'Checked';
  if (record.checked === false || record.checked === 'false') return 'Unchecked';
  if (record.number != null && String(record.number).trim()) {
    return String(record.number).trim();
  }

  return undefined;
}

function resolveEntityType(
  boardId: string,
  boardRole?: MondayBoardRole,
): CrmActivityEntityType {
  const role = boardRole ?? resolveBoardRole(boardId);
  if (role === 'contacts') return 'contact';
  if (role === 'applications') return 'application';

  const env = import.meta.env as Record<string, string | undefined> | undefined;
  if (
    env?.VITE_DONATIONS_BOARD_ID &&
    String(boardId) === String(env.VITE_DONATIONS_BOARD_ID)
  ) {
    return 'donation';
  }
  if (
    env?.VITE_LONGTERM_APPLICATIONS_BOARD_ID &&
    String(boardId) === String(env.VITE_LONGTERM_APPLICATIONS_BOARD_ID)
  ) {
    return 'application';
  }
  return 'board';
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

  const env = import.meta.env as Record<string, string | undefined> | undefined;
  if (
    env?.VITE_LONGTERM_APPLICATIONS_BOARD_ID &&
    String(boardId) === String(env.VITE_LONGTERM_APPLICATIONS_BOARD_ID)
  ) {
    return { page: 'longterm-applications', focusId: entityId };
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
    normalized.includes('move_to_group') ||
    normalized.includes('move_from_group')
  ) {
    return 'moved';
  }
  if (normalized.includes('create_update') || normalized.includes('create_comment')) {
    return 'comment';
  }
  if (normalized.includes('comment') || normalized.includes('reply')) {
    return 'comment';
  }
  if (normalized.includes('update') || normalized.includes('change')) {
    return 'updated';
  }
  return 'other';
}

function resolveActorName(
  actorUserId: string | undefined,
  payload: Record<string, unknown>,
  userNamesById: Map<string, string>,
): string {
  if (actorUserId) {
    const system = systemActorName(actorUserId);
    if (system) return system;

    const fromMap =
      userNamesById.get(actorUserId) || userNamesById.get(String(actorUserId));
    if (fromMap?.trim()) return fromMap.trim();
  }

  const fromPayload = stringField(
    payload,
    'user_name',
    'userName',
    'author_name',
    'authorName',
  );
  if (fromPayload) return fromPayload;

  return 'Unknown person';
}

function resolveItemName(payload: Record<string, unknown>): string | undefined {
  return (
    stringField(payload, 'pulse_name', 'pulseName', 'item_name', 'itemName', 'name') ||
    nestedString(payload.pulse, 'name')
  );
}

function resolveItemId(payload: Record<string, unknown>): string | undefined {
  return (
    stringField(payload, 'pulse_id', 'pulseId', 'item_id', 'itemId') ||
    nestedString(payload.pulse, 'id')
  );
}

function changeDetail(
  payload: Record<string, unknown>,
  previous: string | undefined,
  next: string | undefined,
): string | undefined {
  const prevText =
    previous ||
    stringField(payload, 'previous_textual_value', 'previousTextualValue');
  const nextText =
    next || stringField(payload, 'textual_value', 'textualValue');

  if (prevText && nextText && prevText !== nextText) {
    return `${prevText} → ${nextText}`;
  }
  if (nextText && !prevText) return `Set to ${nextText}`;
  if (prevText && !nextText) return `Cleared (was ${prevText})`;
  if (nextText) return nextText;
  return undefined;
}

function formatUpdateColumnValue(
  actorName: string,
  payload: Record<string, unknown>,
  itemName: string | undefined,
  noun: string,
): { summary: string; detail?: string; undo?: CrmActivityUndo } {
  const columnTitle = cleanColumnTitle(
    stringField(payload, 'column_title', 'columnTitle'),
  );
  const previous = formatColumnValue(payload.previous_value ?? payload.previousValue);
  const next = formatColumnValue(payload.value ?? payload.new_value ?? payload.newValue);
  const detail = changeDetail(payload, previous, next);
  const subject = itemName ? `"${itemName}"` : `this ${noun}`;

  const columnId = stringField(payload, 'column_id', 'columnId');
  const columnType = stringField(payload, 'column_type', 'columnType');
  const undo: CrmActivityUndo | undefined = columnId
    ? {
        kind: 'restore_column',
        columnId,
        columnType,
        columnTitle,
        previousValueRaw: payload.previous_value ?? payload.previousValue ?? null,
      }
    : undefined;

  return {
    summary: `${actorName} updated ${columnTitle} on ${subject}`,
    detail,
    undo,
  };
}

function formatMoveToGroup(
  actorName: string,
  payload: Record<string, unknown>,
  itemName: string | undefined,
  noun: string,
): { summary: string; detail?: string; undo?: CrmActivityUndo } {
  const destGroup =
    stringField(payload, 'dest_group_name', 'destGroupName', 'group_name') ||
    nestedString(payload.dest_group, 'title', 'name') ||
    'another stage';
  const sourceGroup =
    stringField(
      payload,
      'source_group_name',
      'sourceGroupName',
      'previous_group_name',
    ) || nestedString(payload.source_group, 'title', 'name');
  const sourceGroupId =
    stringField(payload, 'source_group_id', 'sourceGroupId') ||
    nestedString(payload.source_group, 'id');

  const subject = itemName ? `"${itemName}"` : `this ${noun}`;
  const undo: CrmActivityUndo | undefined = sourceGroupId
    ? {
        kind: 'move_group',
        sourceGroupId,
        sourceGroupName: sourceGroup,
      }
    : undefined;

  return {
    summary: `${actorName} moved ${subject} to ${destGroup}`,
    detail: sourceGroup ? `From ${sourceGroup} → ${destGroup}` : undefined,
    undo,
  };
}

export function formatActivityLogEvent(
  raw: MondayActivityLogRaw,
  context: FormatActivityLogContext,
): CrmActivityEvent {
  const payload = parseDataPayload(raw.data);
  const itemName = resolveItemName(payload);
  const itemId = resolveItemId(payload);
  const actorUserId =
    raw.user_id != null ? String(raw.user_id).trim() || undefined : undefined;
  const actorName = resolveActorName(actorUserId, payload, context.userNamesById);
  const category = categoryForEvent(raw.event);
  const entityType = resolveEntityType(context.boardId, context.boardRole);
  const noun = activityEntityNoun(entityType);
  const navigateTo = resolveNavigateTo(context.boardId, itemId, context.boardRole);
  const boardName = friendlyActivityBoardLabel(
    context.boardId,
    context.boardName,
    context.boardRole ?? resolveBoardRole(context.boardId),
  );

  let summary = itemName
    ? `${actorName} updated "${itemName}"`
    : `${actorName} updated ${noun}`;
  let detail: string | undefined;
  let undo: CrmActivityUndo | undefined;

  const event = raw.event.toLowerCase();

  if (event.includes('create_pulse') || event.includes('create_item')) {
    summary = itemName
      ? `${actorName} created "${itemName}"`
      : `${actorName} created ${noun}`;
    if (itemId) {
      undo = { kind: 'delete_item' };
    }
  } else if (event.includes('delete_pulse') || event.includes('delete_item')) {
    summary = itemName
      ? `${actorName} deleted "${itemName}"`
      : `${actorName} deleted ${noun}`;
    undo = { kind: 'none' };
  } else if (
    event.includes('move_pulse') ||
    event.includes('move_item') ||
    event.includes('move_to_group') ||
    event.includes('move_from_group')
  ) {
    const formatted = formatMoveToGroup(actorName, payload, itemName, noun);
    summary = formatted.summary;
    detail = formatted.detail;
    undo = formatted.undo;
  } else if (
    event.includes('update_column_value') ||
    event.includes('change_column_value') ||
    (event.includes('batch_change') && event.includes('column'))
  ) {
    // Batch changes often omit pulse_name; still show the field change.
    const formatted = formatUpdateColumnValue(actorName, payload, itemName, noun);
    summary = formatted.summary;
    detail = formatted.detail;
    // Batch events may target many items — only undo single-item updates.
    if (!event.includes('batch_change')) {
      undo = formatted.undo;
    }
  } else if (event.includes('create_update') || event.includes('create_comment')) {
    summary = itemName
      ? `${actorName} added a note on "${itemName}"`
      : `${actorName} added a note`;
  } else if (event.includes('update_name')) {
    summary = itemName
      ? `${actorName} renamed a record to "${itemName}"`
      : `${actorName} renamed ${noun}`;
  }

  const undoable = Boolean(
    undo &&
      undo.kind !== 'none' &&
      itemId &&
      (undo.kind === 'delete_item' ||
        undo.kind === 'move_group' ||
        (undo.kind === 'restore_column' && undo.columnId)),
  );

  const isAutomation = Boolean(
    (actorUserId && systemActorName(actorUserId)) ||
      actorName === 'Automation',
  );

  return {
    id: `${context.boardId}-${raw.id}`,
    occurredAt: parseMondayActivityTimestamp(raw.created_at),
    actorUserId,
    actorName,
    category,
    boardId: context.boardId,
    boardName,
    entityType,
    entityId: itemId,
    entityName: itemName,
    summary,
    detail,
    navigateTo,
    undoable,
    undo: undoable ? undo : undo?.kind === 'none' ? undo : undefined,
    isAutomation,
  };
}
