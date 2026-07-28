/**
 * Create CRM Email Threads + CRM Email Messages boards on monday.com.
 *
 * Usage:
 *   MONDAY_API_TOKEN=... npx tsx scripts/seed-email-thread-boards.ts
 *   MONDAY_API_TOKEN=... npx tsx scripts/seed-email-thread-boards.ts --dry-run
 *
 * Writes board ids into .env when present.
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  emailMessagesBoardMap,
  emailThreadsBoardMap,
} from '../src/config/emailThreadBoardMap';
import { api, createMondayClient } from './lib/emailTemplatesBoard';

const dryRun = process.argv.includes('--dry-run');

async function findBoardByName(
  monday: ReturnType<typeof createMondayClient>,
  name: string,
): Promise<{ id: string; name: string } | null> {
  const data = await api<{ boards: Array<{ id: string; name: string }> }>(
    monday,
    `query { boards(limit: 500) { id name } }`,
  );
  const target = name.trim().toLowerCase();
  return (
    data.boards.find((board) => board.name.trim().toLowerCase() === target) ??
    null
  );
}

async function ensureTextColumns(
  monday: ReturnType<typeof createMondayClient>,
  boardId: string,
  titles: string[],
  dry: boolean,
): Promise<void> {
  const data = await api<{
    boards: Array<{ columns: Array<{ id: string; title: string }> }>;
  }>(
    monday,
    `query ($ids: [ID!]!) { boards(ids: $ids) { columns { id title } } }`,
    { ids: [boardId] },
  );
  const existing = new Set(
    (data.boards[0]?.columns ?? []).map((c) => c.title.trim().toLowerCase()),
  );

  for (const title of titles) {
    if (existing.has(title.trim().toLowerCase())) {
      console.log(`  column exists: ${title}`);
      continue;
    }
    if (dry) {
      console.log(`  would create column: ${title}`);
      continue;
    }
    await api(
      monday,
      `mutation ($boardId: ID!, $title: String!) {
        create_column(board_id: $boardId, title: $title, column_type: text) { id title }
      }`,
      { boardId, title },
    );
    console.log(`  created column: ${title}`);
  }
}

async function ensureBoard(
  monday: ReturnType<typeof createMondayClient>,
  boardName: string,
  columnTitles: string[],
  envKey: string,
): Promise<string> {
  const fromEnv = process.env[envKey]?.trim();
  if (fromEnv) {
    console.log(`Using ${envKey}=${fromEnv}`);
    await ensureTextColumns(monday, fromEnv, columnTitles, dryRun);
    return fromEnv;
  }

  const existing = await findBoardByName(monday, boardName);
  if (existing) {
    console.log(`Found board "${existing.name}" (${existing.id})`);
    await ensureTextColumns(monday, existing.id, columnTitles, dryRun);
    return existing.id;
  }

  if (dryRun) {
    console.log(`Would create board "${boardName}"`);
    return 'dry-run-board-id';
  }

  const created = await api<{ create_board: { id: string; name: string } }>(
    monday,
    `mutation ($name: String!) {
      create_board(board_name: $name, board_kind: public) { id name }
    }`,
    { name: boardName },
  );
  console.log(`Created board "${created.create_board.name}" (${created.create_board.id})`);
  await ensureTextColumns(monday, created.create_board.id, columnTitles, dryRun);
  return created.create_board.id;
}

function patchEnv(updates: Record<string, string>): void {
  const envPath = resolve(process.cwd(), '.env');
  if (!existsSync(envPath)) {
    console.log('No .env file — skip writing board ids');
    return;
  }
  let content = readFileSync(envPath, 'utf8');
  for (const [key, value] of Object.entries(updates)) {
    const line = `${key}=${value}`;
    const re = new RegExp(`^#?\\s*${key}=.*$`, 'm');
    if (re.test(content)) {
      content = content.replace(re, line);
    } else {
      content = `${content.trimEnd()}\n${line}\n`;
    }
  }
  writeFileSync(envPath, content);
  console.log('Updated .env with board ids');
}

async function main() {
  if (!process.env.MONDAY_API_TOKEN && !dryRun) {
    throw new Error('MONDAY_API_TOKEN is required');
  }

  const monday = createMondayClient();

  const threadCols = Object.values(emailThreadsBoardMap).filter(
    (v) => v !== emailThreadsBoardMap.boardName,
  );
  const messageCols = Object.values(emailMessagesBoardMap).filter(
    (v) => v !== emailMessagesBoardMap.boardName,
  );

  const threadsId = await ensureBoard(
    monday,
    emailThreadsBoardMap.boardName,
    threadCols,
    'VITE_EMAIL_THREADS_BOARD_ID',
  );
  const messagesId = await ensureBoard(
    monday,
    emailMessagesBoardMap.boardName,
    messageCols,
    'VITE_EMAIL_MESSAGES_BOARD_ID',
  );

  if (!dryRun) {
    patchEnv({
      VITE_EMAIL_THREADS_BOARD_ID: threadsId,
      VITE_EMAIL_MESSAGES_BOARD_ID: messagesId,
    });
  }

  console.log('Done.');
  console.log(`Threads board: ${threadsId}`);
  console.log(`Messages board: ${messagesId}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
