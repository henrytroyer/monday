import { useMockData } from '../config/boards';
import type { ContactEmailMessage } from '../types/contact';
import { queries } from '../utils/mondayQueries';
import { fetchItemSuperMailEmails } from './fetchItemSuperMailEmails';
import { dedupeEmailCorrespondence } from './dedupeEmailCorrespondence';
import { mondayGraphQL } from './mondayGraphQL';
import {
  parseTimelineEmails,
  type MondayTimelineItemRaw,
  type ParseTimelineEmailContext,
} from './parseTimelineEmail';

const MAX_ITEMS_PER_FETCH = 200;
const PAGE_LIMIT = 50;

interface TimelinePageResponse {
  timeline: {
    timeline_items_page: {
      cursor: string | null;
      timeline_items: MondayTimelineItemRaw[];
    } | null;
  } | null;
}

const timelineCache = new Map<string, ContactEmailMessage[]>();
const timelineErrors = new Map<string, string>();

export function clearEmailTimelineCache(itemId?: string): void {
  if (itemId) {
    timelineCache.delete(itemId);
    timelineErrors.delete(itemId);
    return;
  }
  timelineCache.clear();
  timelineErrors.clear();
}

export function getCachedItemEmailTimeline(
  itemId: string,
): ContactEmailMessage[] | undefined {
  return timelineCache.get(itemId);
}

export function getItemEmailTimelineError(itemId: string): string | undefined {
  return timelineErrors.get(itemId);
}

async function fetchTimelinePage(
  itemId: string,
  cursor?: string,
  limit = PAGE_LIMIT,
): Promise<{ items: MondayTimelineItemRaw[]; nextCursor: string | null }> {
  const data = await mondayGraphQL<TimelinePageResponse>(
    queries.getItemTimeline,
    {
      itemId,
      limit,
      cursor: cursor ?? undefined,
    },
  );

  const page = data.timeline?.timeline_items_page;
  return {
    items: page?.timeline_items ?? [],
    nextCursor: page?.cursor ?? null,
  };
}

/** Lightweight peek at recent timeline items (no cache) for email watch polling. */
export async function fetchTimelineEmailPeek(
  itemId: string,
  limit = 15,
): Promise<MondayTimelineItemRaw[]> {
  if (!itemId || itemId.startsWith('mock-') || useMockData()) return [];
  const page = await fetchTimelinePage(itemId, undefined, limit);
  return page.items;
}

export async function fetchItemEmailTimeline(
  itemId: string,
  context: Omit<ParseTimelineEmailContext, 'itemId'> & { itemId?: string },
  options?: { skipCache?: boolean },
): Promise<ContactEmailMessage[]> {
  if (!itemId || itemId.startsWith('mock-')) return [];
  if (useMockData()) return [];

  if (!options?.skipCache && timelineCache.has(itemId)) {
    return timelineCache.get(itemId)!;
  }

  timelineErrors.delete(itemId);

  try {
    const allItems: MondayTimelineItemRaw[] = [];
    let cursor: string | null | undefined = undefined;

    do {
      const page = await fetchTimelinePage(itemId, cursor ?? undefined);
      allItems.push(...page.items);
      cursor = page.nextCursor;
    } while (cursor && allItems.length < MAX_ITEMS_PER_FETCH);

    const parseContext = {
      ...context,
      contactId: context.contactId,
      itemId,
    };

    const [timelineMessages, superMailMessages] = await Promise.all([
      Promise.resolve(parseTimelineEmails(allItems, parseContext)),
      fetchItemSuperMailEmails(itemId, parseContext),
    ]);

    const messages = dedupeEmailCorrespondence([
      ...timelineMessages,
      ...superMailMessages,
    ]);

    timelineCache.set(itemId, messages);
    return messages;
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Failed to load email timeline';
    timelineErrors.set(itemId, message);
    timelineCache.set(itemId, []);
    return [];
  }
}
