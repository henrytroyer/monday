/**
 * merge-contact-duplicates.ts — Daily contact duplicate merge via shared engine.
 *
 * Usage:
 *   npm run merge:contact-duplicates -- --dry-run
 *   npm run merge:contact-duplicates
 *   MERGE_REPORT_ONLY=false npm run merge:contact-duplicates -- --override-high-volume
 *
 * Schedule: .github/workflows/merge-contact-duplicates.yml (17:00 Europe/Athens).
 */

import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import mondaySdk from 'monday-sdk-js';
import { contactMap } from '../src/config/contactMap.ts';
import {
  mapItemToContactListItem,
  type MondayContactItem,
} from '../src/services/mapMondayToContact.ts';
import {
  acquireRunLock,
  executeMerge,
  planMergeRun,
  releaseRunLock,
  saveMergeRunReport,
} from '../src/services/contactUpsert/merge/index.ts';
import { withBoardNotificationsMuted } from '../src/services/mondayBoardMute.ts';
import { mondayGraphQL } from '../src/services/mondayGraphQL.ts';
import { queries } from '../src/utils/mondayQueries.ts';
import { isSeventeenHundredAthens } from './lib/athensSchedule.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));

const dryRun =
  process.argv.includes('--dry-run') ||
  process.env.MERGE_REPORT_ONLY === 'true';
const force =
  process.argv.includes('--force') || process.env.FORCE_MERGE === 'true';
const overrideHighVolume = process.argv.includes('--override-high-volume');
const boardId =
  process.env.VITE_CONTACTS_BOARD_ID?.trim() ||
  process.env.CONTACTS_BOARD_ID?.trim() ||
  '2463183745';

/** GitHub secrets sometimes include trailing newlines; those break Authorization headers. */
function sanitizeEnvVar(value: string | undefined): string | undefined {
  if (!value) return undefined;
  return value.trim().replace(/^["']|["']$/g, '').replace(/\n|\r/g, '');
}

const mondayApiToken = sanitizeEnvVar(process.env.MONDAY_API_TOKEN);
if (mondayApiToken) {
  process.env.MONDAY_API_TOKEN = mondayApiToken;
}

const monday = mondaySdk();
monday.setApiVersion('2025-01');
if (mondayApiToken) monday.setToken(mondayApiToken);

const PAGE_SIZE = 50;
const REQUEST_DELAY_MS = 200;
const MAX_RETRIES = 4;

function sleep(ms: number): Promise<void> {
  return new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
}

function normalizeTitle(title: string): string {
  return title.trim().toLowerCase();
}

function isRetryableApiMessage(message: string): boolean {
  return /internal server error|rate limit|complexity|timed? ?out|ECONNRESET|ETIMEDOUT|socket hang up/i.test(
    message,
  );
}

async function api<T>(
  query: string,
  variables?: Record<string, unknown>,
  attempt = 0,
): Promise<T> {
  try {
    const response = await monday.api(query, { variables });
    if (response.errors?.length) {
      const message = response.errors.map((entry) => entry.message).join('; ');
      if (isRetryableApiMessage(message) && attempt < MAX_RETRIES) {
        await sleep(800 * (attempt + 1));
        return api(query, variables, attempt + 1);
      }
      throw new Error(message);
    }
    return response.data as T;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (isRetryableApiMessage(message) && attempt < MAX_RETRIES) {
      console.warn(
        `  …retry ${attempt + 1}/${MAX_RETRIES} after: ${message.slice(0, 80)}`,
      );
      await sleep(1000 * (attempt + 1));
      return api(query, variables, attempt + 1);
    }
    throw error instanceof Error ? error : new Error(message);
  }
}

async function resolveColumnIds(): Promise<string[]> {
  const data = await api<{
    boards: Array<{ columns: Array<{ id: string; title: string }> }>;
  }>(
    `query ($boardId: [ID!]!) {
      boards(ids: $boardId) {
        columns { id title }
      }
    }`,
    { boardId: [boardId] },
  );
  const columns = data.boards[0]?.columns ?? [];
  const titles = [
    contactMap.email,
    contactMap.altEmail,
    contactMap.phone,
    contactMap.tags,
    contactMap.type,
    contactMap.address,
    contactMap.city,
    contactMap.state,
    contactMap.zip,
    contactMap.country,
    contactMap.spouseName,
    contactMap.connectedTo,
    contactMap.pastorName,
    contactMap.parentName,
  ].map(normalizeTitle);

  const ids: string[] = [];
  const seen = new Set<string>();
  for (const column of columns) {
    if (titles.includes(normalizeTitle(column.title)) && !seen.has(column.id)) {
      ids.push(column.id);
      seen.add(column.id);
    }
  }
  return ids;
}

const MUTE_API_VERSION = '2025-10';
const MUTE_WAIT_POLL_MS = 15_000;
const MUTE_WAIT_MAX_MS = 15 * 60_000;

async function readBoardMuteState(): Promise<string | null> {
  try {
    const data = await mondayGraphQL<{
      mute_board_settings: Array<{ mute_state?: string | null }>;
    }>(
      queries.getMuteBoardSettings,
      { boardIds: [boardId] },
      { apiVersion: MUTE_API_VERSION },
    );
    return data.mute_board_settings?.[0]?.mute_state ?? null;
  } catch (err) {
    console.warn(
      '[board-mute] could not read mute_board_settings:',
      err instanceof Error ? err.message : err,
    );
    return null;
  }
}

/**
 * Live archive can notify subscribers. Prefer MUTE_ALL (API or manual).
 * Default: warn and continue — withBoardNotificationsMuted still tries API mute
 * around the merge loop. Set MERGE_REQUIRE_MUTE=true to hard-fail if not muted.
 */
async function ensureBoardMutedForLiveRun(): Promise<void> {
  if (process.env.MERGE_SKIP_MUTE_CHECK === 'true') {
    console.warn(
      '[board-mute] MERGE_SKIP_MUTE_CHECK=true — proceeding without MUTE_ALL gate',
    );
    return;
  }

  const state = await readBoardMuteState();
  if (state === 'MUTE_ALL') {
    console.log(`[board-mute] preflight OK: board ${boardId} is MUTE_ALL`);
    return;
  }

  console.warn(
    `[board-mute] board ${boardId} mute_state=${state ?? 'unknown'} — will try API MUTE_ALL during the merge window.`,
  );
  console.warn(
    '[board-mute] If the token is not admin: Contacts → ⋯ → Notifications → Mute for everyone.',
  );

  if (process.env.MERGE_REQUIRE_MUTE === 'true') {
    if (process.env.MERGE_WAIT_FOR_MUTE !== 'false') {
      const deadline = Date.now() + MUTE_WAIT_MAX_MS;
      console.log(
        `[board-mute] MERGE_REQUIRE_MUTE: waiting up to ${MUTE_WAIT_MAX_MS / 60_000}m for MUTE_ALL…`,
      );
      while (Date.now() < deadline) {
        await sleep(MUTE_WAIT_POLL_MS);
        const next = await readBoardMuteState();
        console.log(`[board-mute] poll mute_state=${next ?? 'unknown'}`);
        if (next === 'MUTE_ALL') {
          console.log('[board-mute] MUTE_ALL detected — continuing live merge');
          return;
        }
      }
    }
    throw new Error(
      `Board ${boardId} is not MUTE_ALL (MERGE_REQUIRE_MUTE=true). Mute in Monday UI, or unset MERGE_REQUIRE_MUTE.`,
    );
  }
}

async function fetchAllContacts() {
  const columnIds = await resolveColumnIds();
  console.log(`Using ${columnIds.length} slim columns for Contacts fetch`);
  const contacts = [];
  let cursor: string | null = null;
  let page = 0;

  do {
    page += 1;
    const data = await api<{
      boards: Array<{
        items_page: {
          cursor: string | null;
          items: MondayContactItem[];
        };
      }>;
    }>(
      `query ($boardId: [ID!]!, $limit: Int!, $cursor: String, $columnIds: [String!]) {
        boards(ids: $boardId) {
          items_page(limit: $limit, cursor: $cursor) {
            cursor
            items {
              id
              name
              created_at
              column_values(ids: $columnIds) {
                id
                text
                value
                type
                column { id title type }
              }
            }
          }
        }
      }`,
      {
        boardId: [boardId],
        limit: PAGE_SIZE,
        cursor,
        columnIds,
      },
    );
    const itemsPage = data.boards[0]?.items_page;
    cursor = itemsPage?.cursor ?? null;
    for (const item of itemsPage?.items ?? []) {
      contacts.push(mapItemToContactListItem(item));
    }
    if (page % 10 === 0) {
      console.log(`  …loaded ${contacts.length} contacts`);
    }
    await sleep(REQUEST_DELAY_MS);
  } while (cursor);

  return contacts;
}

async function main(): Promise<void> {
  if (!mondayApiToken) {
    throw new Error('MONDAY_API_TOKEN is required');
  }
  if (/[^\x20-\x7E]/.test(mondayApiToken)) {
    throw new Error(
      'MONDAY_API_TOKEN contains characters that cannot be used in HTTP headers (check for newlines in the GitHub secret)',
    );
  }

  const fromSchedule = process.env.GITHUB_EVENT_NAME === 'schedule';
  if (fromSchedule && !force && !isSeventeenHundredAthens()) {
    console.log(
      'Skipping: scheduled run is outside 17:00 Europe/Athens (DST-safe guard).',
    );
    return;
  }

  const runHolder = `daily-${Date.now()}`;
  if (!acquireRunLock(runHolder)) {
    throw new Error('Another merge run is already in progress');
  }

  try {
    console.log(
      `${dryRun ? '[dry-run/report-only] ' : '[LIVE] '}Contact merge engine on board ${boardId}`,
    );

    // Gate live archives before any bulk fetch/write — API mute needs admin token.
    if (!dryRun) {
      await ensureBoardMutedForLiveRun();
    }

    const contacts = await fetchAllContacts();
    const planned = planMergeRun(contacts, {
      source: 'DAILY_JOB',
      overrideHighVolume,
      enqueueReviews: true,
      config: {
        reportOnly: dryRun,
        ...(overrideHighVolume ? { highVolumeThreshold: 100_000 } : {}),
      },
    });

    console.log(
      `Scanned ${contacts.length} · groups ${planned.classified.length} · auto ${planned.autoPlans.length} · review ${planned.report.reviewGroupsCreated}` +
        (planned.highVolumeTriggered ? ' · HIGH VOLUME → report/review only' : ''),
    );

    for (const group of planned.classified) {
      if (group.disposition === 'review') {
        console.log(
          `\n↷ review ${group.key}: ${group.reviewReasons.join(', ')} · ${group.contacts
            .map((c) => c.name)
            .join(' · ')}`,
        );
        continue;
      }
      console.log(
        `\n• auto ${group.key}: keep "${group.survivor.name}" (${group.survivor.id}); archive ${group.losers
          .map((l) => `${l.name} (${l.id})`)
          .join(', ')}`,
      );
    }

    const report = {
      ...planned.report,
      mode: dryRun ? ('dry_run' as const) : ('live' as const),
    };

    if (dryRun || planned.highVolumeTriggered) {
      report.finishedAt = new Date().toISOString();
      report.durationMs =
        Date.parse(report.finishedAt) - Date.parse(report.startedAt);
      saveMergeRunReport(report);
      console.log(
        `\nReport only. Would archive ${planned.projectedArchives}. Review queue updated.`,
      );
      return;
    }

    // Re-check in case mute was lifted during planning/fetch.
    await ensureBoardMutedForLiveRun();

    let archived = 0;
    let merged = 0;
    let failed = 0;

    // Hold MUTE_ALL for the entire auto-merge loop (not per-executeMerge).
    // Per-merge mute restores between groups and re-opens the notification flood.
    await withBoardNotificationsMuted(boardId, async () => {
      console.log(
        `[board-mute] full-run mute window open for ${planned.autoPlans.length} auto group(s)`,
      );
      for (const plan of planned.autoPlans) {
        try {
          const result = await executeMerge(
            plan.group.survivor,
            plan.group.losers,
            {
              allContacts: contacts,
              source: 'DAILY_JOB',
              jobRunId: report.jobRunId,
              actorEmail: 'daily-merge@crm',
              actorName: 'Daily contact merge',
            },
          );
          merged += 1;
          archived += result.archivedIds.length;
          console.log(
            `  ✓ archived ${result.archivedIds.length} into ${result.survivorId}`,
          );
          await sleep(REQUEST_DELAY_MS);
        } catch (error) {
          failed += 1;
          console.error(
            `  ✗ Failed ${plan.group.key}:`,
            error instanceof Error ? error.message : error,
          );
        }
      }
      console.log('[board-mute] full-run mute window closing');
    });

    report.groupsAutoMerged = merged;
    report.contactsArchived = archived;
    report.failedGroups = failed;
    report.finishedAt = new Date().toISOString();
    report.durationMs =
      Date.parse(report.finishedAt) - Date.parse(report.startedAt);
    saveMergeRunReport(report);

    console.log(
      `\nDone. Merged ${merged} · archived ${archived} · review ${report.reviewGroupsCreated} · failed ${failed}`,
    );
  } finally {
    releaseRunLock(runHolder);
  }
}

function isExecutedDirectly(): boolean {
  const entry = process.argv[1];
  if (!entry) return false;
  try {
    return import.meta.url === pathToFileURL(resolve(entry)).href;
  } catch {
    return entry.includes('merge-contact-duplicates');
  }
}

if (isExecutedDirectly()) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
