/**
 * Undo helpers for the global History page.
 * Restores previous column values, moves items back to prior groups,
 * or deletes newly created items when the activity log allows it.
 */
import {
  canEditApplications,
  canEditContacts,
  canEditDonations,
  isMondayReadOnly,
  resolveApplicationsBoardId,
  resolveContactsBoardId,
  resolveDonationsBoardId,
  resolveLongtermApplicationsBoardId,
  useMockData,
} from '../config/boards';
import type { CrmActivityEvent } from '../types/activityLog';
import { mutations } from '../utils/mondayQueries';
import { mondayGraphQL } from './mondayGraphQL';

/** Whether History may show Undo for this event (same gates as the undo mutation). */
export function canUndoActivityEvent(event: CrmActivityEvent): boolean {
  try {
    assertUndoAllowed(event);
    return true;
  } catch {
    return false;
  }
}

function assertUndoAllowed(event: CrmActivityEvent): void {
  if (isMondayReadOnly() && !canEditContacts() && !canEditApplications()) {
    throw new Error('CRM is read-only: cannot undo changes.');
  }

  const boardId = event.boardId ? String(event.boardId) : '';
  const contactsId = resolveContactsBoardId();
  const appsId = resolveApplicationsBoardId();
  const ltAppsId = resolveLongtermApplicationsBoardId();
  const donationsId = resolveDonationsBoardId();

  if (contactsId && boardId === String(contactsId)) {
    if (!canEditContacts()) {
      throw new Error('Contacts are read-only: cannot undo this change.');
    }
    return;
  }

  if (
    (appsId && boardId === String(appsId)) ||
    (ltAppsId && boardId === String(ltAppsId))
  ) {
    if (!canEditApplications()) {
      throw new Error('Applications are read-only: cannot undo this change.');
    }
    return;
  }

  if (donationsId && boardId === String(donationsId)) {
    if (!canEditDonations()) {
      throw new Error('Donations are read-only: cannot undo this change.');
    }
    return;
  }

  if (event.entityType === 'contact' && !canEditContacts()) {
    throw new Error('Contacts are read-only: cannot undo this change.');
  }
  if (event.entityType === 'application' && !canEditApplications()) {
    throw new Error('Applications are read-only: cannot undo this change.');
  }
  if (event.entityType === 'donation' && !canEditDonations()) {
    throw new Error('Donations are read-only: cannot undo this change.');
  }

  // Unknown board — require global writable (not master read-only without overrides).
  if (isMondayReadOnly()) {
    throw new Error('CRM is read-only: cannot undo this change.');
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return null;
}

/**
 * Convert an activity-log previous_value into a change_column_value JSON string.
 */
export function previousValueToMutationJson(
  columnType: string | undefined,
  previousValue: unknown,
): string {
  if (previousValue == null) {
    // Clear the column — empty object works for most monday column types.
    return '{}';
  }

  const type = (columnType || '').toLowerCase();
  const record = asRecord(previousValue);

  if (type === 'color' || type === 'status') {
    const label = record?.label;
    if (label && typeof label === 'object') {
      const text = (label as Record<string, unknown>).text;
      if (typeof text === 'string' && text.trim()) {
        return JSON.stringify({ label: text.trim() });
      }
    }
    if (typeof record?.index === 'number') {
      return JSON.stringify({ index: record.index });
    }
  }

  if (type === 'dropdown') {
    const chosen = record?.chosenValues ?? record?.chosen_values;
    if (Array.isArray(chosen)) {
      const ids = chosen
        .map((entry) => {
          if (!entry || typeof entry !== 'object') return undefined;
          const id = (entry as Record<string, unknown>).id;
          return typeof id === 'number' || typeof id === 'string' ? Number(id) : undefined;
        })
        .filter((id): id is number => Number.isFinite(id as number));
      if (ids.length > 0) return JSON.stringify({ ids });
      const labels = chosen
        .map((entry) => {
          if (!entry || typeof entry !== 'object') return undefined;
          const name = (entry as Record<string, unknown>).name;
          return typeof name === 'string' && name.trim() ? name.trim() : undefined;
        })
        .filter((n): n is string => Boolean(n));
      if (labels.length > 0) return JSON.stringify({ labels });
    }
    return JSON.stringify({ ids: [] });
  }

  if (type === 'timerange' || type === 'timeline') {
    if (record && (record.from || record.to)) {
      return JSON.stringify({
        from: record.from ?? null,
        to: record.to ?? null,
      });
    }
  }

  if (type === 'date' && record && typeof record.date === 'string') {
    return JSON.stringify({ date: record.date });
  }

  if ((type === 'text' || type === 'long_text') && record) {
    const text =
      typeof record.text === 'string'
        ? record.text
        : typeof previousValue === 'string'
          ? previousValue
          : '';
    return JSON.stringify({ text });
  }

  if (type === 'numbers' && record?.number != null) {
    return JSON.stringify({ number: String(record.number) });
  }

  if (type === 'checkbox' && record) {
    const checked = record.checked === true || record.checked === 'true';
    return JSON.stringify({ checked: checked ? 'true' : 'false' });
  }

  if (type === 'email' && record && typeof record.email === 'string') {
    return JSON.stringify({
      email: record.email,
      text: typeof record.text === 'string' ? record.text : record.email,
    });
  }

  if (type === 'phone' && record && typeof record.phone === 'string') {
    return JSON.stringify({
      phone: record.phone,
      countryShortName:
        typeof record.countryShortName === 'string' ? record.countryShortName : '',
    });
  }

  // Fallback: re-post the activity payload as-is when it looks like column JSON.
  if (record) {
    return JSON.stringify(record);
  }
  if (typeof previousValue === 'string' || typeof previousValue === 'number') {
    return JSON.stringify({ text: String(previousValue) });
  }
  return '{}';
}

export function describeUndo(event: CrmActivityEvent): string {
  const name = event.entityName ? `"${event.entityName}"` : 'this record';
  const undo = event.undo;
  if (!undo || !event.undoable) {
    return 'This change cannot be undone from History.';
  }
  if (undo.kind === 'restore_column') {
    const field = undo.columnTitle || 'the field';
    return `Restore previous ${field} value on ${name}?`;
  }
  if (undo.kind === 'move_group') {
    const group = undo.sourceGroupName || 'the previous stage';
    return `Move ${name} back to ${group}?`;
  }
  if (undo.kind === 'delete_item') {
    return `Delete ${name}? This permanently removes the newly created item.`;
  }
  return 'Undo this change?';
}

export async function undoActivityEvent(event: CrmActivityEvent): Promise<void> {
  if (useMockData()) {
    throw new Error('Undo is only available with live portal data.');
  }
  if (!event.undoable || !event.undo || !event.boardId || !event.entityId) {
    throw new Error('This change cannot be undone from History.');
  }
  assertUndoAllowed(event);

  const { undo } = event;
  const boardId = event.boardId;
  const itemId = event.entityId;

  if (undo.kind === 'restore_column') {
    if (!undo.columnId) {
      throw new Error('Missing column information for undo.');
    }
    const value = previousValueToMutationJson(
      undo.columnType,
      undo.previousValueRaw,
    );
    await mondayGraphQL(mutations.updateColumnValue, {
      boardId,
      itemId,
      columnId: undo.columnId,
      value,
      createLabelsIfMissing: true,
    });
    return;
  }

  if (undo.kind === 'move_group') {
    if (!undo.sourceGroupId) {
      throw new Error('Missing previous stage for undo.');
    }
    await mondayGraphQL(mutations.moveItemToGroup, {
      itemId,
      groupId: undo.sourceGroupId,
    });
    return;
  }

  if (undo.kind === 'delete_item') {
    await mondayGraphQL(mutations.deleteItem, { itemId });
    return;
  }

  throw new Error('This change cannot be undone from History.');
}
