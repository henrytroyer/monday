import type { CrmActivityEvent } from '../types/activityLog';

export function mergeActivityFeed(
  ...groups: CrmActivityEvent[][]
): CrmActivityEvent[] {
  const seen = new Set<string>();
  const merged: CrmActivityEvent[] = [];

  for (const group of groups) {
    for (const event of group) {
      if (seen.has(event.id)) continue;
      seen.add(event.id);
      merged.push(event);
    }
  }

  return merged.sort(
    (a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime(),
  );
}

export function filterActivityEvents(
  events: CrmActivityEvent[],
  filters: {
    searchQuery?: string;
    actorUserId?: string | null;
    boardId?: string | null;
    category?: CrmActivityEvent['category'] | null;
  },
): CrmActivityEvent[] {
  const query = filters.searchQuery?.trim().toLowerCase() ?? '';

  return events.filter((event) => {
    if (filters.actorUserId && event.actorUserId !== filters.actorUserId) {
      return false;
    }
    if (filters.boardId && event.boardId !== filters.boardId) {
      return false;
    }
    if (filters.category && event.category !== filters.category) {
      return false;
    }
    if (!query) return true;

    const haystack = [
      event.summary,
      event.detail,
      event.actorName,
      event.entityName,
      event.boardName,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    return haystack.includes(query);
  });
}

export function uniqueActors(
  events: CrmActivityEvent[],
): Array<{ id: string; name: string }> {
  const map = new Map<string, string>();
  for (const event of events) {
    if (event.actorUserId && event.actorName) {
      map.set(event.actorUserId, event.actorName);
    }
  }
  return [...map.entries()]
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name));
}
