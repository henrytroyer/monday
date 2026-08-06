/**
 * Seed CRM RBAC on Portal Things (Operators, Audit, Role Permissions).
 *
 * Usage:
 *   npm run seed:crm-rbac
 *   npm run seed:crm-rbac -- --dry-run
 *
 * Bootstraps henry@ / lesvos@ as BASIC+DEV, and the other Monday Project
 * allowlisted emails as BASIC operators.
 * Does not modify i58finance users/roles.
 */

import dotenv from 'dotenv';
import { api, createMondayClient } from './lib/emailTemplatesBoard';
import { DEFAULT_ROLE_PERMISSIONS } from '../src/permissions/defaults';
import { PERMISSION_CATALOG } from '../src/permissions/permissionKeys';
import { CRM_ROLE_META, CRM_ROLES } from '../src/permissions/roles';

dotenv.config();

const dryRun = process.argv.includes('--dry-run');
const BOARD_ID = process.env.VITE_PORTAL_THINGS_BOARD_ID?.trim();

const GROUPS = ['Operators', 'Audit', 'Config'] as const;

/** DEV operators — roles are refreshed on every seed. */
const DEV_BOOTSTRAP = [
  {
    email: 'henry@i58global.org',
    displayName: 'Henry',
    roles: ['BASIC', 'DEV'],
    refreshRoles: true,
  },
  {
    email: 'lesvos@i58global.org',
    displayName: 'Lesvos',
    roles: ['BASIC', 'DEV'],
    refreshRoles: true,
  },
  {
    email: process.env.INITIAL_DEV_EMAIL?.trim().toLowerCase(),
    displayName: 'Initial DEV',
    roles: ['BASIC', 'DEV'],
    refreshRoles: true,
  },
].filter((b) => Boolean(b.email));

/**
 * Other Monday Project allowlist emails — created as BASIC if missing.
 * Existing custom role assignments are left alone.
 */
const ALLOWLIST_OPERATORS = [
  {
    email: 'shane@i58global.org',
    displayName: 'Shane',
    roles: ['BASIC'],
    refreshRoles: false,
  },
  {
    email: 'bweiler@i58global.org',
    displayName: 'B Weiler',
    roles: ['BASIC'],
    refreshRoles: false,
  },
  {
    email: 'info@i58global.org',
    displayName: 'Info',
    roles: ['BASIC'],
    refreshRoles: false,
  },
  {
    email: 'nbyler@i58global.org',
    displayName: 'N Byler',
    roles: ['BASIC'],
    refreshRoles: false,
  },
] as const;

const BOOTSTRAP = [...DEV_BOOTSTRAP, ...ALLOWLIST_OPERATORS];

type MondayClient = ReturnType<typeof createMondayClient>;

async function ensureGroups(monday: MondayClient, boardId: string) {
  const data = await api<{
    boards: Array<{ groups: Array<{ id: string; title: string }> }>;
  }>(
    monday,
    `query ($ids: [ID!]!) { boards(ids: $ids) { groups { id title } } }`,
    { ids: [boardId] },
  );
  const existing = new Map(
    (data.boards[0]?.groups ?? []).map((g) => [
      g.title.trim().toLowerCase(),
      g.id,
    ]),
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
    const created = await api<{ create_group: { id: string; title: string } }>(
      monday,
      `mutation ($boardId: ID!, $groupName: String!) {
        create_group(board_id: $boardId, group_name: $groupName) { id title }
      }`,
      { boardId, groupName: title },
    );
    existing.set(title.toLowerCase(), created.create_group.id);
    console.log(`  created group: ${title}`);
  }
  return existing;
}

async function loadItems(monday: MondayClient, boardId: string) {
  const all: Array<{
    id: string;
    name: string;
    group?: { title?: string } | null;
    column_values: Array<{ id: string; text: string; column?: { title: string } }>;
  }> = [];
  let cursor: string | null = null;
  do {
    const data = await api<{
      boards: Array<{
        items_page: {
          cursor: string | null;
          items: typeof all;
        };
      }>;
    }>(
      monday,
      `query ($boardId: [ID!], $limit: Int, $cursor: String) {
        boards(ids: $boardId) {
          items_page(limit: $limit, cursor: $cursor) {
            cursor
            items {
              id name
              group { title }
              column_values { id text column { title } }
            }
          }
        }
      }`,
      { boardId: [boardId], limit: 200, cursor: cursor ?? undefined },
    );
    const page = data.boards?.[0]?.items_page;
    if (!page?.items?.length) break;
    all.push(...page.items);
    cursor = page.cursor || null;
  } while (cursor);
  return all;
}

function colText(
  item: { column_values: Array<{ text: string; column?: { title: string } }> },
  title: string,
): string {
  const t = title.toLowerCase();
  return (
    item.column_values.find((c) => c.column?.title?.toLowerCase() === t)?.text ||
    ''
  );
}

async function changeCols(
  monday: MondayClient,
  boardId: string,
  itemId: string,
  values: Record<string, unknown>,
) {
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
    { boardId, itemId, columnValues: JSON.stringify(values) },
  );
}

async function resolveColumnIds(monday: MondayClient, boardId: string) {
  const data = await api<{
    boards: Array<{ columns: Array<{ id: string; title: string; type: string }> }>;
  }>(
    monday,
    `query ($ids: [ID!]!) { boards(ids: $ids) { columns { id title type } } }`,
    { ids: [boardId] },
  );
  const map = new Map<string, { id: string; type: string }>();
  for (const col of data.boards[0]?.columns ?? []) {
    map.set(col.title.trim().toLowerCase(), { id: col.id, type: col.type });
  }
  return map;
}

function encodeValue(
  col: { id: string; type: string },
  value: string,
): unknown {
  if (col.type === 'status') return { label: value };
  if (col.type === 'date') return { date: value };
  return value;
}

async function main() {
  if (!BOARD_ID) {
    throw new Error(
      'VITE_PORTAL_THINGS_BOARD_ID missing. Run npm run seed:portal-things first.',
    );
  }
  if (!process.env.MONDAY_API_TOKEN?.trim()) {
    throw new Error('MONDAY_API_TOKEN is required');
  }

  const monday = createMondayClient(process.env.MONDAY_API_TOKEN);
  console.log(`Seeding CRM RBAC on Portal Things ${BOARD_ID}`);
  console.log('Ensuring groups…');
  const groups = await ensureGroups(monday, BOARD_ID);
  const cols = await resolveColumnIds(monday, BOARD_ID);
  const items = await loadItems(monday, BOARD_ID);

  const rolePayload = {
    version: 1 as const,
    roles: CRM_ROLES.map((name) => ({
      name,
      displayName: CRM_ROLE_META[name].displayName,
      description: CRM_ROLE_META[name].description,
      system: true as const,
    })),
    permissions: PERMISSION_CATALOG,
    rolePermissions: { ...DEFAULT_ROLE_PERMISSIONS },
    updatedAt: new Date().toISOString(),
  };

  const roleItem = items.find(
    (i) => i.name.trim().toLowerCase() === 'role permissions',
  );
  if (roleItem) {
    console.log('  Role Permissions config exists — refreshing payload');
    if (!dryRun) {
      const payloadCol = cols.get('payload json');
      const kindCol = cols.get('kind');
      const entityTypeCol = cols.get('entity type');
      const entityIdCol = cols.get('entity id');
      const values: Record<string, unknown> = {};
      if (payloadCol)
        values[payloadCol.id] = encodeValue(
          payloadCol,
          JSON.stringify(rolePayload),
        );
      if (kindCol) values[kindCol.id] = encodeValue(kindCol, 'role_permissions');
      if (entityTypeCol)
        values[entityTypeCol.id] = encodeValue(entityTypeCol, 'config');
      if (entityIdCol)
        values[entityIdCol.id] = encodeValue(entityIdCol, 'role_permissions');
      await changeCols(monday, BOARD_ID, roleItem.id, values);
    }
  } else if (dryRun) {
    console.log('  would create Role Permissions config item');
  } else {
    const groupId = groups.get('config');
    const created = await api<{ create_item: { id: string } }>(
      monday,
      `mutation ($boardId: ID!, $itemName: String!, $groupId: String) {
        create_item(board_id: $boardId, item_name: $itemName, group_id: $groupId) { id }
      }`,
      { boardId: BOARD_ID, itemName: 'Role Permissions', groupId },
    );
    const payloadCol = cols.get('payload json');
    const kindCol = cols.get('kind');
    const entityTypeCol = cols.get('entity type');
    const entityIdCol = cols.get('entity id');
    const values: Record<string, unknown> = {};
    if (payloadCol)
      values[payloadCol.id] = encodeValue(
        payloadCol,
        JSON.stringify(rolePayload),
      );
    if (kindCol) values[kindCol.id] = encodeValue(kindCol, 'role_permissions');
    if (entityTypeCol)
      values[entityTypeCol.id] = encodeValue(entityTypeCol, 'config');
    if (entityIdCol)
      values[entityIdCol.id] = encodeValue(entityIdCol, 'role_permissions');
    await changeCols(monday, BOARD_ID, created.create_item.id, values);
    console.log('  created Role Permissions config item');
  }

  const operatorsGroupId = groups.get('operators');
  for (const boot of BOOTSTRAP) {
    const email = String(boot.email);
    const existing = items.find((i) => {
      const entity = colText(i, 'Entity ID').toLowerCase();
      const em = colText(i, 'Email').toLowerCase();
      return entity === email || em === email;
    });
    const payload = {
      email,
      displayName: boot.displayName,
      roles: boot.roles,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    if (existing) {
      if (!boot.refreshRoles) {
        console.log(`  operator exists: ${email} — leaving roles unchanged`);
        continue;
      }
      console.log(`  operator exists: ${email} — refreshing roles`);
      if (!dryRun) {
        const values: Record<string, unknown> = {};
        const payloadCol = cols.get('payload json');
        const kindCol = cols.get('kind');
        const entityTypeCol = cols.get('entity type');
        const entityIdCol = cols.get('entity id');
        const emailCol = cols.get('email');
        if (payloadCol)
          values[payloadCol.id] = encodeValue(
            payloadCol,
            JSON.stringify(payload),
          );
        if (kindCol) values[kindCol.id] = encodeValue(kindCol, 'operator');
        if (entityTypeCol)
          values[entityTypeCol.id] = encodeValue(entityTypeCol, 'operator');
        if (entityIdCol) values[entityIdCol.id] = encodeValue(entityIdCol, email);
        if (emailCol) values[emailCol.id] = encodeValue(emailCol, email);
        await changeCols(monday, BOARD_ID, existing.id, values);
        await api(
          monday,
          `mutation ($boardId: ID!, $itemId: ID!, $itemName: String!) {
            change_simple_column_value(board_id: $boardId, item_id: $itemId, column_id: "name", value: $itemName) { id }
          }`,
          {
            boardId: BOARD_ID,
            itemId: existing.id,
            itemName: boot.displayName,
          },
        ).catch(() => undefined);
      }
      continue;
    }
    if (dryRun) {
      console.log(`  would create operator: ${email}`);
      continue;
    }
    const created = await api<{ create_item: { id: string } }>(
      monday,
      `mutation ($boardId: ID!, $itemName: String!, $groupId: String) {
        create_item(board_id: $boardId, item_name: $itemName, group_id: $groupId) { id }
      }`,
      {
        boardId: BOARD_ID,
        itemName: boot.displayName,
        groupId: operatorsGroupId,
      },
    );
    const values: Record<string, unknown> = {};
    const payloadCol = cols.get('payload json');
    const kindCol = cols.get('kind');
    const entityTypeCol = cols.get('entity type');
    const entityIdCol = cols.get('entity id');
    const emailCol = cols.get('email');
    if (payloadCol)
      values[payloadCol.id] = encodeValue(payloadCol, JSON.stringify(payload));
    if (kindCol) values[kindCol.id] = encodeValue(kindCol, 'operator');
    if (entityTypeCol)
      values[entityTypeCol.id] = encodeValue(entityTypeCol, 'operator');
    if (entityIdCol) values[entityIdCol.id] = encodeValue(entityIdCol, email);
    if (emailCol) values[emailCol.id] = encodeValue(emailCol, email);
    await changeCols(monday, BOARD_ID, created.create_item.id, values);
    console.log(
      `  created operator: ${email} [${boot.roles.join(', ')}]`,
    );
  }

  console.log('Done. Restart npm run dev:live if needed.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
