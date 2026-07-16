/**
 * Mine outgoing SuperMail send logs from Applications board item updates
 * and write src/data/supermailTemplates.mined.ts for the CRM template catalog.
 *
 * Usage:
 *   npm run mine:supermail-templates
 *   npm run mine:supermail-templates -- --dry-run
 */

import dotenv from 'dotenv';
import { writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import mondaySdk from 'monday-sdk-js';
import { getCrmEmailTemplates } from '../src/data/emailTemplates.ts';
import { extractSuperMailPayload } from '../src/services/parseSuperMailUpdate.ts';
import {
  buildMinedTemplates,
  generalizeWithMergeFields,
  type MinedSend,
} from '../src/utils/supermailTemplateMining.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, '..');
const outputPath = resolve(projectRoot, 'src/data/supermailTemplates.mined.ts');

dotenv.config({ path: resolve(projectRoot, '.env') });

const sanitizeEnvVar = (value: string | undefined): string | undefined => {
  if (!value) return undefined;
  return value.trim().replace(/^["']|["']$/g, '').replace(/\n|\r/g, '');
};

const MONDAY_API_TOKEN = sanitizeEnvVar(process.env.MONDAY_API_TOKEN);
const APPLICATIONS_BOARD_ID =
  sanitizeEnvVar(process.env.VITE_APPLICATIONS_BOARD_ID) ?? '2473000031';
const EMAIL_COLUMN_TITLE =
  sanitizeEnvVar(process.env.VITE_COL_EMAIL) ?? 'Email Address';

const dryRun = process.argv.includes('--dry-run');
const UPDATE_BATCH_SIZE = 10;
const REQUEST_DELAY_MS = 150;

const monday = mondaySdk();
monday.setApiVersion('2025-01');
if (MONDAY_API_TOKEN) {
  monday.setToken(MONDAY_API_TOKEN);
}

interface BoardItem {
  id: string;
  name: string;
  column_values?: Array<{
    text?: string | null;
    column?: { title?: string | null } | null;
  }>;
}

interface ItemUpdate {
  id: string;
  body?: string | null;
  text_body?: string | null;
  created_at: string;
  creator?: { email?: string | null } | null;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
}

async function mondayQuery<T>(
  query: string,
  variables: Record<string, unknown>,
): Promise<T> {
  const response = await monday.api(query, { variables });
  if (response.errors?.length) {
    throw new Error(response.errors.map((entry) => entry.message).join('; '));
  }
  return response.data as T;
}

async function fetchAllBoardItems(boardId: string): Promise<BoardItem[]> {
  const query = `query ($boardId: [ID!], $limit: Int, $cursor: String) {
    boards(ids: $boardId) {
      items_page(limit: $limit, cursor: $cursor) {
        cursor
        items {
          id
          name
          column_values {
            text
            column {
              title
            }
          }
        }
      }
    }
  }`;

  const allItems: BoardItem[] = [];
  let cursor: string | null = null;

  do {
    const data = await mondayQuery<{
      boards: Array<{
        items_page: { cursor: string | null; items: BoardItem[] };
      }>;
    }>(query, {
      boardId: [boardId],
      limit: 500,
      cursor: cursor ?? undefined,
    });

    const page = data.boards?.[0]?.items_page;
    if (!page?.items?.length) break;

    allItems.push(...page.items);
    cursor = page.cursor || null;
    await sleep(REQUEST_DELAY_MS);
  } while (cursor);

  return allItems;
}

async function fetchItemsWithUpdates(
  itemIds: string[],
): Promise<Array<{ itemId: string; updates: ItemUpdate[] }>> {
  const query = `query ($itemIds: [ID!]) {
    items(ids: $itemIds) {
      id
      updates(limit: 100) {
        id
        body
        text_body
        created_at
        creator {
          email
        }
      }
    }
  }`;

  const data = await mondayQuery<{
    items: Array<{ id: string; updates: ItemUpdate[] }> | null;
  }>(query, { itemIds });

  return (data.items ?? []).map((item) => ({
    itemId: item.id,
    updates: item.updates ?? [],
  }));
}

function normalizeColumnTitle(title: string): string {
  return title.trim().toLowerCase();
}

function getItemEmail(item: BoardItem): string {
  for (const column of item.column_values ?? []) {
    const title = column.column?.title?.trim();
    if (!title) continue;
    if (normalizeColumnTitle(title) === normalizeColumnTitle(EMAIL_COLUMN_TITLE)) {
      return column.text?.trim() ?? '';
    }
  }
  return '';
}

function chunk<T>(values: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }
  return chunks;
}

function serializeTemplate(template: {
  id: string;
  name: string;
  subject: string;
  body: string;
  source?: string;
  minedAt?: string;
  sendCount?: number;
}): string {
  const lines = [
    '  {',
    `    id: ${JSON.stringify(template.id)},`,
    `    name: ${JSON.stringify(template.name)},`,
    `    subject: ${JSON.stringify(template.subject)},`,
    `    body: ${JSON.stringify(template.body)},`,
    `    source: 'supermail',`,
  ];

  if (template.minedAt) {
    lines.push(`    minedAt: ${JSON.stringify(template.minedAt)},`);
  }
  if (template.sendCount != null) {
    lines.push(`    sendCount: ${template.sendCount},`);
  }

  lines.push('  }');
  return lines.join('\n');
}

function writeMinedTemplatesFile(
  templates: ReturnType<typeof buildMinedTemplates>,
  minedAt: string,
): void {
  const body = `/** Generated by \`npm run mine:supermail-templates\`. Do not edit by hand. */

export const SUPERMAIL_MINED_TEMPLATES: Array<{
  id: string;
  name: string;
  subject: string;
  body: string;
  source: 'supermail';
  minedAt?: string;
  sendCount?: number;
}> = [
${templates.map((template) => serializeTemplate(template)).join(',\n')}
];

export const SUPERMAIL_MINED_AT: string | null = ${JSON.stringify(minedAt)};
`;

  writeFileSync(outputPath, body, 'utf8');
}

async function main(): Promise<void> {
  if (!MONDAY_API_TOKEN) {
    console.error('❌ MONDAY_API_TOKEN is required in .env');
    process.exit(1);
  }

  console.log(`📋 Applications board: ${APPLICATIONS_BOARD_ID}`);
  console.log(`📧 Email column title: ${EMAIL_COLUMN_TITLE}`);
  if (dryRun) {
    console.log('🔍 Dry run — no file will be written');
  }

  const items = await fetchAllBoardItems(APPLICATIONS_BOARD_ID);
  console.log(`✅ Loaded ${items.length} application items`);

  const itemContext = new Map(
    items.map((item) => {
      const firstName = item.name.trim().split(/\s+/)[0] ?? item.name;
      return [
        item.id,
        {
          name: item.name.trim(),
          firstName,
          email: getItemEmail(item),
        },
      ] as const;
    }),
  );

  const minedSends: MinedSend[] = [];
  const itemIdChunks = chunk(items.map((item) => item.id), UPDATE_BATCH_SIZE);

  for (const [index, itemIds] of itemIdChunks.entries()) {
    const itemsWithUpdates = await fetchItemsWithUpdates(itemIds);

    for (const { itemId, updates } of itemsWithUpdates) {
      const context = itemContext.get(itemId);

      for (const update of updates) {
        const html = (update.body || update.text_body || '').trim();
        if (!html) continue;

        const payload = extractSuperMailPayload(html, {
          fallbackSentAt: update.created_at
            ? new Date(update.created_at).toISOString()
            : new Date().toISOString(),
          contactEmails: context?.email ? [context.email] : [],
          creatorEmail: update.creator?.email ?? undefined,
        });

        if (!payload || payload.direction !== 'outbound') continue;

        const generalizedSubject = generalizeWithMergeFields(payload.subject, {
          name: context?.name,
          firstName: context?.firstName,
          email: context?.email,
        });
        const generalizedBody = generalizeWithMergeFields(payload.body, {
          name: context?.name,
          firstName: context?.firstName,
          email: context?.email,
        });

        minedSends.push({
          subject: generalizedSubject,
          body: generalizedBody,
          sentAt: payload.sentAt,
        });
      }
    }

    console.log(
      `   Processed update batch ${index + 1}/${itemIdChunks.length}`,
    );
    await sleep(REQUEST_DELAY_MS);
  }

  console.log(`📨 Found ${minedSends.length} outgoing SuperMail sends`);

  const existingSubjects = getCrmEmailTemplates().map((template) => template.subject);
  const minedAt = new Date().toISOString();
  const templates = buildMinedTemplates(minedSends, existingSubjects, minedAt);

  console.log(`🧩 ${templates.length} unique templates after dedupe/skip`);

  for (const template of templates) {
    console.log(
      `   • ${template.name} (${template.id}) — ${template.sendCount ?? 1} send(s)`,
    );
  }

  if (dryRun) {
    console.log('✅ Dry run complete');
    return;
  }

  writeMinedTemplatesFile(templates, minedAt);
  console.log(`✅ Wrote ${outputPath}`);
}

main().catch((error) => {
  console.error('❌ Mining failed:', error instanceof Error ? error.message : error);
  process.exit(1);
});
