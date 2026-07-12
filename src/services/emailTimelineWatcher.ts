import {
  isMondayWatchEnabled,
  mondayWatchIntervalMs,
  useMockData,
} from '../config/boards';
import {
  clearEmailTimelineCache,
  fetchTimelineEmailPeek,
} from './fetchItemEmailTimeline';
import { isEmailTimelineItem } from './parseTimelineEmail';

const WATERMARKS_KEY = 'crm-email-watch-watermarks';
const POLL_CONCURRENCY = 4;

const registeredItemIds = new Set<string>();

type EmailWatermarks = Record<string, string[]>;

function readWatermarks(): EmailWatermarks {
  try {
    const raw = localStorage.getItem(WATERMARKS_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as EmailWatermarks;
  } catch {
    return {};
  }
}

function writeWatermarks(watermarks: EmailWatermarks): void {
  localStorage.setItem(WATERMARKS_KEY, JSON.stringify(watermarks));
}

export function registerWatchedApplicationItemIds(itemIds: string[]): void {
  for (const id of itemIds) {
    if (id && !id.startsWith('mock-')) {
      registeredItemIds.add(id);
    }
  }
}

export function registerWatchedContactItemId(contactId: string): void {
  if (contactId && !contactId.startsWith('mock-')) {
    registeredItemIds.add(contactId);
  }
}

export function notifyEmailCorrespondenceChanged(itemIds: string[] = []): void {
  window.dispatchEvent(
    new CustomEvent('crm-email-correspondence-changed', {
      detail: { itemIds },
    }),
  );
}

export function emailWatchIntervalMs(): number {
  return mondayWatchIntervalMs();
}

export function emailWatchIsEnabled(): boolean {
  return isMondayWatchEnabled() && !useMockData();
}

export async function pollEmailTimelineUpdates(): Promise<string[]> {
  if (!emailWatchIsEnabled()) return [];

  const itemIds = [...registeredItemIds];
  if (itemIds.length === 0) return [];

  const watermarks = readWatermarks();
  const changed: string[] = [];

  for (let i = 0; i < itemIds.length; i += POLL_CONCURRENCY) {
    const chunk = itemIds.slice(i, i + POLL_CONCURRENCY);
    await Promise.all(
      chunk.map(async (itemId) => {
        try {
          const items = await fetchTimelineEmailPeek(itemId, 15);
          const emailIds = items
            .filter(isEmailTimelineItem)
            .map((item) => item.id);

          const previous = watermarks[itemId];
          if (previous === undefined) {
            watermarks[itemId] = emailIds;
            return;
          }

          const hasNew = emailIds.some((id) => !previous.includes(id));
          watermarks[itemId] = emailIds;

          if (hasNew) {
            changed.push(itemId);
            clearEmailTimelineCache(itemId);
          }
        } catch {
          // Watcher is best-effort during prototype
        }
      }),
    );
  }

  writeWatermarks(watermarks);

  if (changed.length > 0) {
    notifyEmailCorrespondenceChanged(changed);
  }

  return changed;
}
