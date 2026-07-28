/**
 * Resolve which monday.com automation produced a History activity event.
 *
 * monday activity_logs do not include automation ids. We match nearby
 * trigger_events / block_events for the same item, then map step titles
 * back to an automation id from account trigger statistics.
 */
import type { CrmActivityEvent } from '../types/activityLog';
import { mondayGraphQL } from './mondayGraphQL';
import {
  getMondayBoardAutomationsUrl,
  getMondayBoardUrl,
} from './mondayBoardLinks';

interface TriggerEventRow {
  triggerUuid?: string | null;
  triggerStartedAt?: string | null;
  eventKind?: string | null;
  entityKind?: string | null;
}

interface BlockEventRow {
  title?: string | null;
  entityKind?: string | null;
  atomicActionId?: string | null;
}

interface TriggerEventsResult {
  trigger_events?: { triggerEvents?: TriggerEventRow[] | null } | null;
}

interface BlockEventsResult {
  block_events?: { blockEvents?: BlockEventRow[] | null } | null;
}

interface AutomationStatsResult {
  account_triggers_statistics_by_entity_id?: {
    automation_statistics?: Record<string, { total?: number }> | null;
  } | null;
}

export interface ResolvedActivityAutomation {
  /** Human-readable automation recipe name (from monday step titles). */
  name: string;
  /** monday automation / recipe id when we can map it. */
  automationId?: string;
  stepTitles: string[];
  triggerUuid?: string;
  matchedAt?: string;
  /** Best URL to open this automation (or the board automations page). */
  openUrl: string;
  /** Text to search for in monday if deep-link is imprecise. */
  searchText: string;
}

/** automationId → resolved step titles / name */
const automationNameCache = new Map<
  string,
  { name: string; stepTitles: string[] }
>();

function titleKey(titles: string[]): string {
  return titles
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean)
    .join('||');
}

function relevanceScore(event: CrmActivityEvent, titles: string[]): number {
  const joined = titles.join(' ').toLowerCase();
  let score = 0;
  if (event.category === 'moved' && /move|group/.test(joined)) score += 5;
  if (event.category === 'created' && /create|created|item/.test(joined)) {
    score += 4;
  }
  if (event.category === 'updated' || event.category === 'comment') {
    if (/update|status|column|change/.test(joined)) score += 2;
  }
  const field = event.undo?.columnTitle?.toLowerCase();
  if (field) {
    for (const word of field.split(/\s+/)) {
      if (word.length > 2 && joined.includes(word)) score += 3;
    }
  }
  if (event.detail && /→/.test(event.detail)) {
    const destName = event.detail.split('→').pop()?.trim().toLowerCase();
    if (destName && joined.includes(destName.slice(0, 12))) score += 2;
  }
  return score;
}

function fallbackName(event: CrmActivityEvent): string {
  if (event.category === 'moved') {
    const dest = event.detail?.split('→').pop()?.trim();
    return dest ? `Move to “${dest}”` : 'Move item to group';
  }
  if (event.undo?.columnTitle) {
    return `Update “${event.undo.columnTitle}”`;
  }
  if (event.category === 'created') return 'Create item';
  return 'Board automation';
}

async function fetchStepTitles(triggerUuid: string): Promise<string[]> {
  const blocks = await mondayGraphQL<BlockEventsResult>(
    `query ($triggerUuid: String!) {
      block_events(triggerUuid: $triggerUuid) {
        blockEvents {
          title
          entityKind
          atomicActionId
        }
      }
    }`,
    { triggerUuid },
  );
  return (blocks.block_events?.blockEvents ?? [])
    .map((b) => b.title?.trim())
    .filter((t): t is string => Boolean(t));
}

async function describeAutomation(
  automationId: string,
): Promise<{ name: string; stepTitles: string[] }> {
  const cached = automationNameCache.get(automationId);
  if (cached) return cached;

  const triggers = await mondayGraphQL<TriggerEventsResult>(
    `query ($filters: TriggerEventsFiltersInput) {
      trigger_events(filters: $filters) {
        triggerEvents {
          triggerUuid
          triggerStartedAt
        }
      }
    }`,
    { filters: { automationIds: [Number(automationId)] } },
  );
  const first =
    triggers.trigger_events?.triggerEvents?.find((t) => t.triggerUuid) ?? null;
  if (!first?.triggerUuid) {
    const empty = {
      name: `Automation ${automationId}`,
      stepTitles: [] as string[],
    };
    automationNameCache.set(automationId, empty);
    return empty;
  }

  const stepTitles = await fetchStepTitles(first.triggerUuid);
  const named = {
    name: stepTitles.length
      ? stepTitles.join(' → ')
      : `Automation ${automationId}`,
    stepTitles,
  };
  automationNameCache.set(automationId, named);
  return named;
}

function titlesMatch(
  candidateTitles: string[],
  targetTitles: string[],
): boolean {
  if (candidateTitles.length === 0 || targetTitles.length === 0) return false;
  if (titleKey(candidateTitles) === titleKey(targetTitles)) return true;
  const candidateKey = titleKey(candidateTitles);
  return targetTitles.every((title) =>
    candidateKey.includes(title.trim().toLowerCase()),
  );
}

async function findAutomationIdForTitles(
  titles: string[],
): Promise<string | undefined> {
  if (titles.length === 0) return undefined;

  for (const [automationId, cached] of automationNameCache) {
    if (titlesMatch(cached.stepTitles, titles)) return automationId;
  }

  const stats = await mondayGraphQL<AutomationStatsResult>(
    `query {
      account_triggers_statistics_by_entity_id(run_status: success) {
        automation_statistics
      }
    }`,
  );
  const statsMap =
    stats.account_triggers_statistics_by_entity_id?.automation_statistics ?? {};
  const ids = Object.keys(statsMap);

  // Prefer frequently-run automations first — likelier matches.
  const ranked = [...ids].sort(
    (a, b) => (statsMap[b]?.total ?? 0) - (statsMap[a]?.total ?? 0),
  );

  // Cap lookup so History stays responsive; most recipes are in the top runs.
  const candidates = ranked.slice(0, 40);
  const chunkSize = 8;
  for (let i = 0; i < candidates.length; i += chunkSize) {
    const chunk = candidates.slice(i, i + chunkSize);
    const described = await Promise.all(
      chunk.map(async (automationId) => ({
        automationId,
        ...(await describeAutomation(automationId)),
      })),
    );
    const hit = described.find((entry) =>
      titlesMatch(entry.stepTitles, titles),
    );
    if (hit) return hit.automationId;
  }
  return undefined;
}

async function buildOpenUrl(
  boardId: string,
  automationId: string | undefined,
  searchText: string,
): Promise<string> {
  const boardUrl = await getMondayBoardUrl(boardId);
  const automationsUrl = await getMondayBoardAutomationsUrl(boardId);
  const base = automationsUrl || boardUrl;
  if (!base) return 'https://monday.com';

  if (automationId) {
    return `${base.replace(/\/$/, '')}/${automationId}`;
  }
  if (searchText) {
    const url = new URL(base);
    url.searchParams.set('q', searchText);
    return url.toString();
  }
  return base;
}

/**
 * Identify the monday automation behind an activity-log row.
 * Call when the user expands “See automation”.
 */
export async function resolveActivityAutomation(
  event: CrmActivityEvent,
): Promise<ResolvedActivityAutomation> {
  const fallback = fallbackName(event);
  const searchText = event.undo?.columnTitle || fallback;

  if (!event.boardId) {
    return {
      name: fallback,
      stepTitles: [],
      openUrl: 'https://monday.com',
      searchText,
    };
  }

  if (!event.entityId) {
    const openUrl = await buildOpenUrl(event.boardId, undefined, searchText);
    return {
      name: fallback,
      stepTitles: [],
      openUrl,
      searchText,
    };
  }

  try {
    const triggers = await mondayGraphQL<TriggerEventsResult>(
      `query ($filters: TriggerEventsFiltersInput) {
        trigger_events(filters: $filters) {
          triggerEvents {
            triggerUuid
            triggerStartedAt
            eventKind
            entityKind
          }
        }
      }`,
      {
        filters: {
          boardId: String(event.boardId),
          itemId: String(event.entityId),
        },
      },
    );

    const rows = triggers.trigger_events?.triggerEvents ?? [];
    const occurredMs = new Date(event.occurredAt).getTime();

    const scored: Array<{
      trigger: TriggerEventRow;
      titles: string[];
      timeDelta: number;
      relevance: number;
    }> = [];

    const byTime = [...rows].sort((a, b) => {
      const da = Math.abs(
        new Date(a.triggerStartedAt ?? 0).getTime() - occurredMs,
      );
      const db = Math.abs(
        new Date(b.triggerStartedAt ?? 0).getTime() - occurredMs,
      );
      return da - db;
    });

    for (const trigger of byTime.slice(0, 8)) {
      if (!trigger.triggerUuid) continue;
      const timeDelta = Math.abs(
        new Date(trigger.triggerStartedAt ?? 0).getTime() - occurredMs,
      );
      if (Number.isFinite(timeDelta) && timeDelta > 15 * 60 * 1000) continue;

      const titles = await fetchStepTitles(trigger.triggerUuid);
      if (titles.length === 0) continue;
      scored.push({
        trigger,
        titles,
        timeDelta: Number.isFinite(timeDelta)
          ? timeDelta
          : Number.MAX_SAFE_INTEGER,
        relevance: relevanceScore(event, titles),
      });
    }

    scored.sort((a, b) => {
      if (b.relevance !== a.relevance) return b.relevance - a.relevance;
      return a.timeDelta - b.timeDelta;
    });

    const best = scored[0];
    if (!best) {
      const openUrl = await buildOpenUrl(event.boardId, undefined, searchText);
      return {
        name: fallback,
        stepTitles: [],
        openUrl,
        searchText,
      };
    }

    const name = best.titles.join(' → ');
    const automationId = await findAutomationIdForTitles(best.titles);
    const openUrl = await buildOpenUrl(event.boardId, automationId, name);

    return {
      name,
      automationId,
      stepTitles: best.titles,
      triggerUuid: best.trigger.triggerUuid ?? undefined,
      matchedAt: best.trigger.triggerStartedAt ?? undefined,
      openUrl,
      searchText: name,
    };
  } catch {
    const openUrl = await buildOpenUrl(event.boardId, undefined, searchText);
    return {
      name: fallback,
      stepTitles: [],
      openUrl,
      searchText,
    };
  }
}
