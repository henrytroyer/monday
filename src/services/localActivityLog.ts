import type { CrmActivityEvent } from '../types/activityLog';

const STORAGE_KEY = 'crm-local-activity-log';
const MAX_ENTRIES = 500;

function readAll(): CrmActivityEvent[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CrmActivityEvent[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(events: CrmActivityEvent[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(events.slice(0, MAX_ENTRIES)));
}

export function getLocalActivityLog(): CrmActivityEvent[] {
  return readAll();
}

export function logLocalActivity(
  event: Omit<CrmActivityEvent, 'id'> & { id?: string },
): CrmActivityEvent {
  const entry: CrmActivityEvent = {
    ...event,
    id: event.id ?? `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  };
  const existing = readAll();
  writeAll([entry, ...existing]);
  return entry;
}

export function clearLocalActivityLog(): void {
  localStorage.removeItem(STORAGE_KEY);
}
