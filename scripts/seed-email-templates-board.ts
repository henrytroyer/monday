/**
 * Seed the Email Templates monday.com board from mined SuperMail templates.
 *
 * Usage:
 *   npm run seed:email-templates
 *   npm run seed:email-templates -- --dry-run
 */

import dotenv from 'dotenv';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import mondaySdk from 'monday-sdk-js';
import { SUPERMAIL_MINED_TEMPLATES } from '../src/data/supermailTemplates.mined.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, '..');
const envPath = resolve(projectRoot, '.env');

dotenv.config({ path: envPath });

const BOARD_NAME = process.env.VITE_EMAIL_TEMPLATES_BOARD_NAME || 'Email Templates';
const SUBJECT_COL = process.env.VITE_EMAIL_TEMPLATE_COL_SUBJECT || 'Subject';
const BODY_COL = process.env.VITE_EMAIL_TEMPLATE_COL_BODY || 'Body';
const TEMPLATE_ID_COL =
  process.env.VITE_EMAIL_TEMPLATE_COL_TEMPLATE_ID || 'Template ID';

const dryRun = process.argv.includes('--dry-run');

const monday = mondaySdk();
monday.setApiVersion('2025-01');
monday.setToken(process.env.MONDAY_API_TOKEN);

async function api<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
  const response = await monday.api(query, { variables });
  if (response.errors?.length) {
    throw new Error(response.errors.map((entry) => entry.message).join('; '));
  }
  return response.data as T;
}

async function findBoardByName(name: string): Promise<{ id: string; name: string } | null> {
  const data = await api<{ boards: Array<{ id: string; name: string }> }>(
    `query { boards(limit: 500) { id name } }`,
  );
  const target = name.trim().toLowerCase();
  return (
    data.boards.find((board) => board.name.trim().toLowerCase() === target) ??
    null
  );
}

async function ensureBoard(): Promise<string> {
  const existingId = process.env.VITE_EMAIL_TEMPLATES_BOARD_ID?.trim();
  if (existingId) {
    console.log(`Using configured board id ${existingId}`);
    return existingId;
  }

  const existing = await findBoardByName(BOARD_NAME);
  if (existing) {
    console.log(`Found board "${existing.name}" (${existing.id})`);
    return existing.id;
  }

  if (dryRun) {
    console.log(`Would create board "${BOARD_NAME}"`);
    return 'dry-run-board-id';
  }

  const created = await api<{ create_board: { id: string; name: string } }>(
    `mutation ($name: String!) {
      create_board(board_name: $name, board_kind: public) { id name }
    }`,
    { name: BOARD_NAME },
  );
  console.log(`Created board "${created.create_board.name}" (${created.create_board.id})`);
  return created.create_board.id;
}

async function ensureColumn(
  boardId: string,
  title: string,
  type: 'text' | 'long_text',
): Promise<void> {
  const data = await api<{
    boards: Array<{ columns: Array<{ id: string; title: string; type: string }> }>;
  }>(
    `query ($boardId: [ID!]) {
      boards(ids: $boardId) { columns { id title type } }
    }`,
    { boardId: [boardId] },
  );

  const exists = data.boards?.[0]?.columns?.some(
    (column) => column.title.trim().toLowerCase() === title.trim().toLowerCase(),
  );
  if (exists) return;

  if (dryRun) {
    console.log(`Would add column "${title}" (${type})`);
    return;
  }

  await api(
    `mutation ($boardId: ID!, $title: String!, $type: ColumnType!) {
      create_column(board_id: $boardId, title: $title, column_type: $type) { id title }
    }`,
    { boardId, title, type },
  );
  console.log(`Added column "${title}"`);
}

async function fetchExistingTemplateIds(boardId: string): Promise<Set<string>> {
  const data = await api<{
    boards: Array<{
      items_page: {
        items: Array<{
          name: string;
          column_values: Array<{ text?: string | null; column?: { title?: string | null } | null }>;
        }>;
      };
    }>;
  }>(
    `query ($boardId: [ID!]) {
      boards(ids: $boardId) {
        items_page(limit: 500) {
          items {
            name
            column_values { text column { title } }
          }
        }
      }
    }`,
    { boardId: [boardId] },
  );

  const ids = new Set<string>();
  for (const item of data.boards?.[0]?.items_page?.items ?? []) {
    const templateId = item.column_values.find(
      (column) =>
        column.column?.title?.trim().toLowerCase() ===
        TEMPLATE_ID_COL.trim().toLowerCase(),
    )?.text;
    if (templateId?.trim()) ids.add(templateId.trim());
  }
  return ids;
}

function columnValuePayload(value: string, columnType: string): { text: string } | string {
  if (columnType === 'long_text') {
    return { text: value };
  }
  return value;
}

async function createTemplateItem(
  boardId: string,
  columns: Array<{ id: string; title: string; type: string }>,
  template: {
    id: string;
    name: string;
    subject: string;
    body: string;
  },
): Promise<void> {
  if (dryRun) {
    console.log(`Would create template ${template.id} — ${template.name}`);
    return;
  }

  const byTitle = new Map(
    columns.map((column) => [column.title.trim().toLowerCase(), column]),
  );

  const created = await api<{ create_item: { id: string } }>(
    `mutation ($boardId: ID!, $itemName: String!) {
      create_item(board_id: $boardId, item_name: $itemName) { id }
    }`,
    { boardId, itemName: template.name },
  );

  const itemId = created.create_item.id;
  const updates: Array<[string, string]> = [
    [SUBJECT_COL, template.subject],
    [BODY_COL, template.body],
    [TEMPLATE_ID_COL, template.id],
  ];

  const columnValues: Record<string, { text: string } | string> = {};
  for (const [title, value] of updates) {
    const column = byTitle.get(title.trim().toLowerCase());
    if (!column) continue;
    columnValues[column.id] = columnValuePayload(value, column.type);
  }

  await api(
    `mutation ($boardId: ID!, $itemId: ID!, $columnValues: JSON!) {
      change_multiple_column_values(
        board_id: $boardId,
        item_id: $itemId,
        column_values: $columnValues
      ) { id }
    }`,
    {
      boardId,
      itemId,
      columnValues: JSON.stringify(columnValues),
    },
  );

  console.log(`Created ${template.name} (${template.id})`);
}

function upsertEnvBoardId(boardId: string): void {
  if (dryRun || boardId === 'dry-run-board-id') return;

  let env = readFileSync(envPath, 'utf8');
  if (/^VITE_EMAIL_TEMPLATES_BOARD_ID=/m.test(env)) {
    env = env.replace(
      /^VITE_EMAIL_TEMPLATES_BOARD_ID=.*$/m,
      `VITE_EMAIL_TEMPLATES_BOARD_ID=${boardId}`,
    );
  } else {
    env += `\nVITE_EMAIL_TEMPLATES_BOARD_ID=${boardId}\n`;
  }
  if (!/^VITE_EMAIL_TEMPLATES_WRITABLE=/m.test(env)) {
    env += 'VITE_EMAIL_TEMPLATES_WRITABLE=true\n';
  }
  writeFileSync(envPath, env, 'utf8');
  console.log(`Updated .env with VITE_EMAIL_TEMPLATES_BOARD_ID=${boardId}`);
}

async function main(): Promise<void> {
  if (!process.env.MONDAY_API_TOKEN) {
    console.error('MONDAY_API_TOKEN is required in .env');
    process.exit(1);
  }

  const boardId = await ensureBoard();
  await ensureColumn(boardId, SUBJECT_COL, 'text');
  await ensureColumn(boardId, BODY_COL, 'long_text');
  await ensureColumn(boardId, TEMPLATE_ID_COL, 'text');

  const columnData = await api<{
    boards: Array<{ columns: Array<{ id: string; title: string; type: string }> }>;
  }>(
    `query ($boardId: [ID!]) { boards(ids: $boardId) { columns { id title type } } }`,
    { boardId: [boardId] },
  );
  const columns = columnData.boards?.[0]?.columns ?? [];

  const existingIds = boardId === 'dry-run-board-id'
    ? new Set<string>()
    : await fetchExistingTemplateIds(boardId);

  let created = 0;
  for (const template of SUPERMAIL_MINED_TEMPLATES) {
    if (existingIds.has(template.id)) {
      console.log(`Skip existing ${template.id}`);
      continue;
    }
    try {
      await createTemplateItem(boardId, columns, template);
      created += 1;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to seed "${template.name}" (${template.id}): ${message}`);
    }
  }

  upsertEnvBoardId(boardId);
  console.log(`Done. ${created} template(s) seeded.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
