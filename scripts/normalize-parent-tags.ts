/**
 * Rewrite Contacts board tags: legacy "Parent" → canonical "Parents".
 *
 * Usage:
 *   npx tsx scripts/normalize-parent-tags.ts --dry-run
 *   npx tsx scripts/normalize-parent-tags.ts
 *
 * After the script, delete the unused "Parent" label from the Tags column
 * in monday board settings (keep "Parents").
 */

import dotenv from 'dotenv';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import mondaySdk from 'monday-sdk-js';
import { CONTACT_TAG_LABELS, type ContactTag } from '../src/types/contact.ts';
import {
  contactTagsUseSimpleColumnValue,
  formatContactTagsColumnValue,
  formatContactTagsSimpleValue,
  resolveContactTagsWriteColumn,
} from '../src/services/contactTagColumnWrite.ts';
import { contactMap } from '../src/config/contactMap.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, '../.env') });

const dryRun = process.argv.includes('--dry-run');
const boardId =
  process.env.VITE_CONTACTS_BOARD_ID?.trim() ||
  process.env.CONTACTS_BOARD_ID?.trim();

const monday = mondaySdk();
monday.setApiVersion('2025-01');
monday.setToken(process.env.MONDAY_API_TOKEN);

async function api<T>(
  query: string,
  variables?: Record<string, unknown>,
): Promise<T> {
  const response = await monday.api(query, { variables });
  if (response.errors?.length) {
    throw new Error(response.errors.map((entry) => entry.message).join('; '));
  }
  return response.data as T;
}

const TAG_LABEL_TO_ID: Record<string, ContactTag> = {
  volunteer: 'volunteer',
  pastor: 'pastor',
  parent: 'parent',
  parents: 'parent',
  donor: 'donor',
  recruitment: 'recruitment',
};

function parseLabelsFromText(text: string): ContactTag[] {
  const tags = new Set<ContactTag>();
  for (const part of text.split(/[,;]/)) {
    const tag = TAG_LABEL_TO_ID[part.trim().toLowerCase()];
    if (tag) tags.add(tag);
  }
  return [...tags];
}

function textHasLegacyParent(text: string): boolean {
  return text
    .split(/[,;]/)
    .some((part) => part.trim().toLowerCase() === 'parent');
}

async function main(): Promise<void> {
  if (!process.env.MONDAY_API_TOKEN?.trim()) {
    throw new Error('MONDAY_API_TOKEN is required in .env');
  }
  if (!boardId) {
    throw new Error('VITE_CONTACTS_BOARD_ID is required in .env');
  }

  console.log(
    `${dryRun ? '[dry-run] ' : ''}Normalizing Parent → ${CONTACT_TAG_LABELS.parent} on board ${boardId}`,
  );

  const columnsData = await api<{
    boards: Array<{
      columns: Array<{
        id: string;
        title: string;
        type: string;
        settings_str?: string;
      }>;
    }>;
  }>(
    `query ($boardId: [ID!]!) {
      boards(ids: $boardId) {
        columns { id title type settings_str }
      }
    }`,
    { boardId: [boardId] },
  );

  const columns = columnsData.boards[0]?.columns ?? [];
  const writeColumn = resolveContactTagsWriteColumn(columns, {
    tagsColumnTitle: contactMap.tags,
    typeColumnTitle: contactMap.type,
    explicitTagsColumnEnv: process.env.VITE_CONTACT_COL_TAGS,
  });
  if (!writeColumn) {
    throw new Error('Could not resolve Contacts Tags/type column');
  }

  console.log(
    `Using column "${writeColumn.title}" (${writeColumn.id}, ${writeColumn.type})`,
  );

  let cursor: string | null = null;
  let scanned = 0;
  let rewritten = 0;

  do {
    const page = await api<{
      boards: Array<{
        items_page: {
          cursor: string | null;
          items: Array<{ id: string; name: string; column_values: Array<{ id: string; text: string | null }> }>;
        };
      }>;
    }>(
      `query ($boardId: [ID!]!, $cursor: String) {
        boards(ids: $boardId) {
          items_page(limit: 100, cursor: $cursor) {
            cursor
            items {
              id
              name
              column_values(ids: ["${writeColumn.id}"]) {
                id
                text
              }
            }
          }
        }
      }`,
      { boardId: [boardId], cursor },
    );

    const itemsPage = page.boards[0]?.items_page;
    cursor = itemsPage?.cursor ?? null;
    const items = itemsPage?.items ?? [];

    for (const item of items) {
      scanned += 1;
      const text = item.column_values[0]?.text?.trim() ?? '';
      if (!text || !textHasLegacyParent(text)) continue;

      const tags = parseLabelsFromText(text);
      if (!tags.includes('parent')) continue;

      const nextLabels = tags.map((tag) => CONTACT_TAG_LABELS[tag]).join(', ');
      console.log(`  ${item.name} (${item.id}): "${text}" → "${nextLabels}"`);

      if (dryRun) {
        rewritten += 1;
        continue;
      }

      if (contactTagsUseSimpleColumnValue(writeColumn.type)) {
        await api(
          `mutation ($boardId: ID!, $itemId: ID!, $columnId: String!, $value: String!) {
            change_simple_column_value(
              board_id: $boardId
              item_id: $itemId
              column_id: $columnId
              value: $value
            ) { id }
          }`,
          {
            boardId,
            itemId: item.id,
            columnId: writeColumn.id,
            value: formatContactTagsSimpleValue(tags),
          },
        );
      } else {
        await api(
          `mutation ($boardId: ID!, $itemId: ID!, $columnId: String!, $value: JSON!) {
            change_column_value(
              board_id: $boardId
              item_id: $itemId
              column_id: $columnId
              value: $value
              create_labels_if_missing: true
            ) { id }
          }`,
          {
            boardId,
            itemId: item.id,
            columnId: writeColumn.id,
            value: formatContactTagsColumnValue(
              tags,
              writeColumn.type,
              writeColumn.settings_str,
              writeColumn.title,
            ),
          },
        );
      }
      rewritten += 1;
    }
  } while (cursor);

  console.log(`\nScanned ${scanned} contacts · ${rewritten} needed Parent → Parents`);
  if (dryRun) {
    console.log('Dry run only — re-run without --dry-run to apply.');
  } else {
    console.log(
      'Done. In monday board settings, delete the unused "Parent" label from Tags (keep "Parents").',
    );
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
