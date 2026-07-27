/**
 * Shared helpers for seeding the Email Templates monday.com board.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import mondaySdk from 'monday-sdk-js';

const BOARD_NAME = process.env.VITE_EMAIL_TEMPLATES_BOARD_NAME || 'Email Templates';
const SUBJECT_COL = process.env.VITE_EMAIL_TEMPLATE_COL_SUBJECT || 'Subject';
const BODY_COL = process.env.VITE_EMAIL_TEMPLATE_COL_BODY || 'Body';
const TEMPLATE_ID_COL =
  process.env.VITE_EMAIL_TEMPLATE_COL_TEMPLATE_ID || 'Template ID';

export interface SeedTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
}

export function createMondayClient() {
  const monday = mondaySdk();
  monday.setApiVersion('2025-01');
  monday.setToken(process.env.MONDAY_API_TOKEN);
  return monday;
}

export async function api<T>(
  monday: ReturnType<typeof createMondayClient>,
  query: string,
  variables?: Record<string, unknown>,
): Promise<T> {
  const response = await monday.api(query, { variables });
  if (response.errors?.length) {
    throw new Error(response.errors.map((entry) => entry.message).join('; '));
  }
  return response.data as T;
}

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

export async function ensureEmailTemplatesBoard(
  monday: ReturnType<typeof createMondayClient>,
  dryRun: boolean,
): Promise<string> {
  const existingId = process.env.VITE_EMAIL_TEMPLATES_BOARD_ID?.trim();
  if (existingId) {
    console.log(`Using configured board id ${existingId}`);
    return existingId;
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
  console.log(`Created board "${created.create_board.name}" (${created.create_board.id})`);
  return created.create_board.id;
}

export async function ensureColumn(
  monday: ReturnType<typeof createMondayClient>,
  boardId: string,
  title: string,
  type: 'text' | 'long_text',
  dryRun: boolean,
): Promise<void> {
  const data = await api<{
    boards: Array<{ columns: Array<{ id: string; title: string; type: string }> }>;
  }>(
    monday,
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
    monday,
    `mutation ($boardId: ID!, $title: String!, $type: ColumnType!) {
      create_column(board_id: $boardId, title: $title, column_type: $type) { id title }
    }`,
    { boardId, title, type },
  );
  console.log(`Added column "${title}"`);
}

export async function fetchBoardColumns(
  monday: ReturnType<typeof createMondayClient>,
  boardId: string,
): Promise<Array<{ id: string; title: string; type: string }>> {
  const columnData = await api<{
    boards: Array<{ columns: Array<{ id: string; title: string; type: string }> }>;
  }>(
    monday,
    `query ($boardId: [ID!]) { boards(ids: $boardId) { columns { id title type } } }`,
    { boardId: [boardId] },
  );
  return columnData.boards?.[0]?.columns ?? [];
}

export async function fetchExistingTemplates(
  monday: ReturnType<typeof createMondayClient>,
  boardId: string,
): Promise<Map<string, string>> {
  const data = await api<{
    boards: Array<{
      items_page: {
        items: Array<{
          id: string;
          name: string;
          column_values: Array<{ text?: string | null; column?: { title?: string | null } | null }>;
        }>;
      };
    }>;
  }>(
    monday,
    `query ($boardId: [ID!]) {
      boards(ids: $boardId) {
        items_page(limit: 500) {
          items {
            id
            name
            column_values { text column { title } }
          }
        }
      }
    }`,
    { boardId: [boardId] },
  );

  const byTemplateId = new Map<string, string>();
  for (const item of data.boards?.[0]?.items_page?.items ?? []) {
    const templateId = item.column_values.find(
      (column) =>
        column.column?.title?.trim().toLowerCase() ===
        TEMPLATE_ID_COL.trim().toLowerCase(),
    )?.text;
    if (templateId?.trim()) byTemplateId.set(templateId.trim(), item.id);
  }
  return byTemplateId;
}

export async function fetchExistingTemplateIds(
  monday: ReturnType<typeof createMondayClient>,
  boardId: string,
): Promise<Set<string>> {
  const existing = await fetchExistingTemplates(monday, boardId);
  return new Set(existing.keys());
}

function columnValuePayload(value: string, columnType: string): { text: string } | string {
  if (columnType === 'long_text') {
    return { text: value };
  }
  return value;
}

export async function createTemplateItem(
  monday: ReturnType<typeof createMondayClient>,
  boardId: string,
  columns: Array<{ id: string; title: string; type: string }>,
  template: SeedTemplate,
  dryRun: boolean,
): Promise<void> {
  if (dryRun) {
    console.log(`Would create template ${template.id} — ${template.name}`);
    return;
  }

  const byTitle = new Map(
    columns.map((column) => [column.title.trim().toLowerCase(), column]),
  );

  const created = await api<{ create_item: { id: string } }>(
    monday,
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
    monday,
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

export async function updateTemplateItem(
  monday: ReturnType<typeof createMondayClient>,
  boardId: string,
  itemId: string,
  columns: Array<{ id: string; title: string; type: string }>,
  template: SeedTemplate,
  dryRun: boolean,
): Promise<void> {
  if (dryRun) {
    console.log(`Would update template ${template.id} — ${template.name}`);
    return;
  }

  const byTitle = new Map(
    columns.map((column) => [column.title.trim().toLowerCase(), column]),
  );

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
    monday,
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

  console.log(`Updated ${template.name} (${template.id})`);
}

export function upsertEnvBoardId(envPath: string, boardId: string, dryRun: boolean): void {
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
