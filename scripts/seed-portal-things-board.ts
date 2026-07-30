/**
 * Create the Portal Things board on monday.com for CRM infrastructure state.
 *
 * Usage:
 *   MONDAY_API_TOKEN=... npx tsx scripts/seed-portal-things-board.ts
 *   npm run seed:portal-things
 *   npm run seed:portal-things -- --dry-run
 *
 * Patches local .env with VITE_PORTAL_THINGS_BOARD_ID (never commit .env).
 */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import dotenv from 'dotenv';
import { api, createMondayClient } from './lib/emailTemplatesBoard';

dotenv.config();

const dryRun = process.argv.includes('--dry-run');
const BOARD_NAME = process.env.VITE_PORTAL_THINGS_BOARD_NAME || 'Portal Things';

const GROUPS = ['Onboarding', 'Recruitment', 'Config'] as const;

const COLUMNS: Array<{ title: string; type: string }> = [
  { title: 'Kind', type: 'status' },
  { title: 'Entity ID', type: 'text' },
  { title: 'Entity Type', type: 'status' },
  { title: 'Linked Contact ID', type: 'text' },
  { title: 'Linked Application ID', type: 'text' },
  { title: 'Payload JSON', type: 'long_text' },
  { title: 'Last Synced At', type: 'date' },
  { title: 'Email', type: 'text' },
  { title: 'Phone', type: 'text' },
  { title: 'Assigned To', type: 'text' },
  { title: 'Source Contact ID', type: 'text' },
];

const CONFIG_ITEMS = [
  { name: 'Note Review Registry', kind: 'note_review_registry' },
  { name: 'Email Signatures', kind: 'email_signatures' },
  { name: 'Portal Settings', kind: 'settings' },
] as const;

type MondayClient = ReturnType<typeof createMondayClient>;

async function findBoardByName(
  monday: MondayClient,
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

async function ensureBoard(monday: MondayClient): Promise<string> {
  const fromEnv = process.env.VITE_PORTAL_THINGS_BOARD_ID?.trim();
  if (fromEnv) {
    console.log(`Using VITE_PORTAL_THINGS_BOARD_ID=${fromEnv}`);
    return fromEnv;
  }

  const existing = await findBoardByName(monday, BOARD_NAME);
  if (existing) {
    console.log(`Found board "${existing.name}" (${existing.id})`);
    return existing.id;
  }

  if (dryRun) {
    console.log(`Would create board "${BOARD_NAME}"`);
    return 'dry-run-board-id';
  }

  const created = await api<{ create_board: { id: string; name: string } }>(
    monday,
    `mutation ($name: String!) {
      create_board(board_name: $name, board_kind: public) { id name }
    }`,
    { name: BOARD_NAME },
  );
  console.log(
    `Created board "${created.create_board.name}" (${created.create_board.id})`,
  );
  return created.create_board.id;
}

async function ensureGroups(monday: MondayClient, boardId: string): Promise<void> {
  const data = await api<{
    boards: Array<{ groups: Array<{ id: string; title: string }> }>;
  }>(
    monday,
    `query ($ids: [ID!]!) { boards(ids: $ids) { groups { id title } } }`,
    { ids: [boardId] },
  );
  const existing = new Set(
    (data.boards[0]?.groups ?? []).map((g) => g.title.trim().toLowerCase()),
  );

  for (const title of GROUPS) {
    if (existing.has(title.toLowerCase())) {
      console.log(`  group exists: ${title}`);
      continue;
    }
    if (dryRun) {
      console.log(`  would create group: ${title}`);
      continue;
    }
    await api(
      monday,
      `mutation ($boardId: ID!, $groupName: String!) {
        create_group(board_id: $boardId, group_name: $groupName) { id title }
      }`,
      { boardId, groupName: title },
    );
    console.log(`  created group: ${title}`);
  }
}

async function ensureColumns(monday: MondayClient, boardId: string): Promise<void> {
  const data = await api<{
    boards: Array<{ columns: Array<{ id: string; title: string; type: string }> }>;
  }>(
    monday,
    `query ($ids: [ID!]!) { boards(ids: $ids) { columns { id title type } } }`,
    { ids: [boardId] },
  );
  const existing = new Set(
    (data.boards[0]?.columns ?? []).map((c) => c.title.trim().toLowerCase()),
  );

  for (const col of COLUMNS) {
    if (existing.has(col.title.trim().toLowerCase())) {
      console.log(`  column exists: ${col.title}`);
      continue;
    }
    if (dryRun) {
      console.log(`  would create column: ${col.title} (${col.type})`);
      continue;
    }
    await api(
      monday,
      `mutation ($boardId: ID!, $title: String!, $type: ColumnType!) {
        create_column(board_id: $boardId, title: $title, column_type: $type) {
          id title
        }
      }`,
      { boardId, title: col.title, type: col.type },
    );
    console.log(`  created column: ${col.title}`);
  }
}

async function getGroups(
  monday: MondayClient,
  boardId: string,
): Promise<Array<{ id: string; title: string }>> {
  const data = await api<{
    boards: Array<{ groups: Array<{ id: string; title: string }> }>;
  }>(
    monday,
    `query ($ids: [ID!]!) { boards(ids: $ids) { groups { id title } } }`,
    { ids: [boardId] },
  );
  return data.boards[0]?.groups ?? [];
}

async function getBoardItems(
  monday: MondayClient,
  boardId: string,
): Promise<Array<{ id: string; name: string }>> {
  const data = await api<{
    boards: Array<{
      items_page: { items: Array<{ id: string; name: string }> };
    }>;
  }>(
    monday,
    `query ($ids: [ID!]!) {
      boards(ids: $ids) {
        items_page(limit: 100) { items { id name } }
      }
    }`,
    { ids: [boardId] },
  );
  return data.boards[0]?.items_page?.items ?? [];
}

async function ensureConfigItems(
  monday: MondayClient,
  boardId: string,
): Promise<void> {
  const groups = await getGroups(monday, boardId);
  const configGroup = groups.find(
    (g) => g.title.trim().toLowerCase() === 'config',
  );
  const items = await getBoardItems(monday, boardId);
  const byName = new Map(
    items.map((item) => [item.name.trim().toLowerCase(), item]),
  );

  for (const config of CONFIG_ITEMS) {
    if (byName.has(config.name.toLowerCase())) {
      console.log(`  config item exists: ${config.name}`);
      continue;
    }
    if (dryRun) {
      console.log(`  would create config item: ${config.name}`);
      continue;
    }

    const created = await api<{ create_item: { id: string; name: string } }>(
      monday,
      `mutation ($boardId: ID!, $itemName: String!, $groupId: String) {
        create_item(board_id: $boardId, item_name: $itemName, group_id: $groupId) {
          id name
        }
      }`,
      {
        boardId,
        itemName: config.name,
        groupId: configGroup?.id,
      },
    );

    const cols = await api<{
      boards: Array<{ columns: Array<{ id: string; title: string }> }>;
    }>(
      monday,
      `query ($ids: [ID!]!) { boards(ids: $ids) { columns { id title } } }`,
      { ids: [boardId] },
    );
    const columnList = cols.boards[0]?.columns ?? [];
    const kindCol = columnList.find(
      (c) => c.title.trim().toLowerCase() === 'kind',
    );
    const entityTypeCol = columnList.find(
      (c) => c.title.trim().toLowerCase() === 'entity type',
    );
    const values: Record<string, unknown> = {};
    if (kindCol) values[kindCol.id] = { label: config.kind };
    if (entityTypeCol) values[entityTypeCol.id] = { label: 'config' };
    if (Object.keys(values).length > 0) {
      await api(
        monday,
        `mutation ($boardId: ID!, $itemId: ID!, $columnValues: JSON!) {
          change_multiple_column_values(
            board_id: $boardId,
            item_id: $itemId,
            column_values: $columnValues,
            create_labels_if_missing: true
          ) { id }
        }`,
        {
          boardId,
          itemId: created.create_item.id,
          columnValues: JSON.stringify(values),
        },
      );
    }

    console.log(
      `  created config item: ${created.create_item.name} (${created.create_item.id})`,
    );
  }
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
  console.log('Updated .env with Portal Things board id');
}

async function main() {
  if (!process.env.MONDAY_API_TOKEN && !dryRun) {
    throw new Error('MONDAY_API_TOKEN is required');
  }

  const monday = createMondayClient();
  const boardId = await ensureBoard(monday);

  console.log('Ensuring groups…');
  await ensureGroups(monday, boardId);
  console.log('Ensuring columns…');
  await ensureColumns(monday, boardId);
  console.log('Ensuring Config items…');
  await ensureConfigItems(monday, boardId);

  if (!dryRun) {
    patchEnv({
      VITE_PORTAL_THINGS_BOARD_ID: boardId,
      VITE_PORTAL_THINGS_WRITABLE: 'true',
      VITE_PORTAL_THINGS_BOARD_NAME: BOARD_NAME,
    });
  }

  console.log('Done.');
  console.log(`Portal Things board: ${boardId}`);
  console.log('Restart npm run dev:live to pick up .env changes.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
