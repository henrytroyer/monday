/**
 * portalThingsBoard.ts — Resolve Portal Things board + shared item helpers.
 */

import {
  canEditPortalThings,
  resolvePortalThingsBoardId,
  useMockData,
} from '../config/boards';
import {
  PORTAL_CONFIG_ITEM,
  PORTAL_ENTITY_TYPE,
  PORTAL_GROUP_CONFIG,
  PORTAL_GROUP_ONBOARDING,
  PORTAL_GROUP_RECRUITMENT,
  PORTAL_KIND,
  PORTAL_THINGS_BOARD_NAME,
  portalThingsMap,
} from '../config/portalThingsMap';
import { mutations, queries } from '../utils/mondayQueries';
import {
  changeColumnByTitle,
  findBoardColumnByTitle,
  tryChangeColumnByTitle,
} from './mondayColumnWrite';
import { mondayGraphQL as api } from './mondayGraphQL';

export interface PortalThingsItem {
  id: string;
  name: string;
  groupId?: string;
  groupTitle?: string;
  entityId?: string;
  kind?: string;
  payloadJson?: string;
  email?: string;
  phone?: string;
  assignedTo?: string;
  sourceContactId?: string;
  linkedContactId?: string;
  linkedApplicationId?: string;
}

type ColumnValue = {
  id: string;
  text?: string | null;
  value?: string | null;
  type?: string;
  column?: { title?: string | null } | null;
};

function normalizeTitle(title: string): string {
  return title.trim().toLowerCase();
}

function columnText(
  columns: ColumnValue[],
  mapTitle: string,
): string | undefined {
  const target = normalizeTitle(mapTitle);
  const col = columns.find(
    (c) => normalizeTitle(c.column?.title ?? '') === target,
  );
  const text = col?.text?.trim();
  return text || undefined;
}

let boardIdCache: string | null | undefined;
let groupsCache: Map<string, string> | null = null;

type PortalRawItem = {
  id: string;
  name: string;
  group?: { id: string; title: string } | null;
  column_values: ColumnValue[];
};

/** Avoid stampeding Monday while permissions/operators resolve (board is 500+ items). */
const PORTAL_ITEMS_TTL_MS = 5 * 60_000;
type PortalItemsCacheEntry = {
  boardId: string;
  items: PortalRawItem[];
  fetchedAt: number;
};
const portalCacheGlobal = globalThis as typeof globalThis & {
  __crmPortalItemsCache?: PortalItemsCacheEntry | null;
  __crmPortalItemsInflight?: {
    boardId: string;
    promise: Promise<PortalRawItem[]>;
  } | null;
};
function getPortalItemsCache(): PortalItemsCacheEntry | null {
  return portalCacheGlobal.__crmPortalItemsCache ?? null;
}
function setPortalItemsCache(entry: PortalItemsCacheEntry | null): void {
  portalCacheGlobal.__crmPortalItemsCache = entry;
}

export async function resolvePortalBoardId(): Promise<string | null> {
  if (useMockData()) return null;
  if (boardIdCache !== undefined) return boardIdCache;

  const fromEnv = resolvePortalThingsBoardId();
  if (fromEnv) {
    boardIdCache = fromEnv;
    return fromEnv;
  }

  // Best-effort find by name (seed should set env).
  try {
    const data = await api<{ boards: Array<{ id: string; name: string }> }>(
      `query { boards(limit: 500) { id name } }`,
    );
    const target = normalizeTitle(PORTAL_THINGS_BOARD_NAME);
    const found = data.boards.find(
      (b) => normalizeTitle(b.name) === target,
    );
    boardIdCache = found?.id ?? null;
    return boardIdCache;
  } catch {
    boardIdCache = null;
    return null;
  }
}

export function clearPortalBoardCache(): void {
  boardIdCache = undefined;
  groupsCache = null;
  setPortalItemsCache(null);
  portalCacheGlobal.__crmPortalItemsInflight = null;
}

async function loadGroups(boardId: string): Promise<Map<string, string>> {
  if (groupsCache) return groupsCache;
  const data = await api<{
    boards: Array<{ groups: Array<{ id: string; title: string }> }>;
  }>(
    `query ($ids: [ID!]!) { boards(ids: $ids) { groups { id title } } }`,
    { ids: [boardId] },
  );
  const map = new Map<string, string>();
  for (const g of data.boards[0]?.groups ?? []) {
    map.set(normalizeTitle(g.title), g.id);
  }
  groupsCache = map;
  return map;
}

export async function resolvePortalGroupId(
  groupTitle: string,
): Promise<string | null> {
  const boardId = await resolvePortalBoardId();
  if (!boardId) return null;
  const groups = await loadGroups(boardId);
  return groups.get(normalizeTitle(groupTitle)) ?? null;
}

type PortalItemsPage = {
  cursor: string | null;
  items: PortalRawItem[];
};

async function fetchAllPortalItemsUncached(
  boardId: string,
): Promise<PortalRawItem[]> {
  const all: PortalRawItem[] = [];
  let cursor: string | null = null;
  do {
    const data: { boards?: Array<{ items_page?: PortalItemsPage }> } = await api(
      queries.getBoardItemsPage,
      {
        boardId: [boardId],
        limit: 200,
        cursor: cursor ?? undefined,
      },
    );
    const page: PortalItemsPage | undefined = data.boards?.[0]?.items_page;
    if (!page?.items?.length) break;
    all.push(...page.items);
    cursor = page.cursor || null;
  } while (cursor);
  return all;
}

async function fetchAllPortalItems(boardId: string): Promise<PortalRawItem[]> {
  const now = Date.now();
  const portalItemsCache = getPortalItemsCache();
  if (
    portalItemsCache &&
    portalItemsCache.boardId === boardId &&
    now - portalItemsCache.fetchedAt < PORTAL_ITEMS_TTL_MS
  ) {
    return portalItemsCache.items;
  }
  const inflight = portalCacheGlobal.__crmPortalItemsInflight;
  if (inflight?.boardId === boardId) {
    return inflight.promise;
  }

  const promise = fetchAllPortalItemsUncached(boardId)
    .then((items) => {
      setPortalItemsCache({ boardId, items, fetchedAt: Date.now() });
      return items;
    })
    .finally(() => {
      if (portalCacheGlobal.__crmPortalItemsInflight?.promise === promise) {
        portalCacheGlobal.__crmPortalItemsInflight = null;
      }
    });
  portalCacheGlobal.__crmPortalItemsInflight = { boardId, promise };
  return promise;
}

function mapRawItem(item: {
  id: string;
  name: string;
  group?: { id: string; title: string } | null;
  column_values: ColumnValue[];
}): PortalThingsItem {
  return {
    id: item.id,
    name: item.name,
    groupId: item.group?.id,
    groupTitle: item.group?.title,
    entityId: columnText(item.column_values, portalThingsMap.entityId),
    kind: columnText(item.column_values, portalThingsMap.kind),
    payloadJson: columnText(item.column_values, portalThingsMap.payloadJson),
    email: columnText(item.column_values, portalThingsMap.email),
    phone: columnText(item.column_values, portalThingsMap.phone),
    assignedTo: columnText(item.column_values, portalThingsMap.assignedTo),
    sourceContactId: columnText(
      item.column_values,
      portalThingsMap.sourceContactId,
    ),
    linkedContactId: columnText(
      item.column_values,
      portalThingsMap.linkedContactId,
    ),
    linkedApplicationId: columnText(
      item.column_values,
      portalThingsMap.linkedApplicationId,
    ),
  };
}

export async function listPortalItems(options?: {
  groupTitle?: string;
  kind?: string;
}): Promise<PortalThingsItem[]> {
  const boardId = await resolvePortalBoardId();
  if (!boardId) return [];
  const raw = await fetchAllPortalItems(boardId);
  let items = raw.map(mapRawItem);
  if (options?.groupTitle) {
    const target = normalizeTitle(options.groupTitle);
    items = items.filter((i) => normalizeTitle(i.groupTitle ?? '') === target);
  }
  if (options?.kind) {
    const target = normalizeTitle(options.kind);
    items = items.filter((i) => normalizeTitle(i.kind ?? '') === target);
  }
  return items;
}

export async function findPortalItemByEntityId(
  entityId: string,
  kind?: string,
): Promise<PortalThingsItem | null> {
  const items = await listPortalItems(kind ? { kind } : undefined);
  return (
    items.find((i) => i.entityId === entityId) ??
    items.find((i) => i.name === entityId) ??
    null
  );
}

export async function findPortalItemByName(
  name: string,
): Promise<PortalThingsItem | null> {
  const items = await listPortalItems();
  const target = normalizeTitle(name);
  return items.find((i) => normalizeTitle(i.name) === target) ?? null;
}

export async function createPortalItem(input: {
  name: string;
  groupTitle: string;
  kind: string;
  entityType: string;
  entityId?: string;
  payloadJson?: string;
  email?: string;
  phone?: string;
  assignedTo?: string;
  sourceContactId?: string;
  linkedContactId?: string;
  linkedApplicationId?: string;
}): Promise<PortalThingsItem> {
  if (!canEditPortalThings()) {
    throw new Error('Portal Things is read-only.');
  }
  const boardId = await resolvePortalBoardId();
  if (!boardId) {
    throw new Error(
      'Portal Things board is not configured. Run npm run seed:portal-things.',
    );
  }
  const groupId = await resolvePortalGroupId(input.groupTitle);

  const created = await api<{ create_item: { id: string; name: string } }>(
    mutations.createItem,
    {
      boardId,
      itemName: input.name,
      groupId: groupId ?? undefined,
    },
  );

  const itemId = created.create_item.id;
  await writePortalFields(boardId, itemId, {
    kind: input.kind,
    entityType: input.entityType,
    entityId: input.entityId,
    payloadJson: input.payloadJson,
    email: input.email,
    phone: input.phone,
    assignedTo: input.assignedTo,
    sourceContactId: input.sourceContactId,
    linkedContactId: input.linkedContactId,
    linkedApplicationId: input.linkedApplicationId,
  });
  setPortalItemsCache(null);

  return {
    id: itemId,
    name: created.create_item.name,
    groupTitle: input.groupTitle,
    kind: input.kind,
    entityId: input.entityId,
    payloadJson: input.payloadJson,
    email: input.email,
    phone: input.phone,
    assignedTo: input.assignedTo,
    sourceContactId: input.sourceContactId,
    linkedContactId: input.linkedContactId,
    linkedApplicationId: input.linkedApplicationId,
  };
}

export async function writePortalFields(
  boardId: string,
  itemId: string,
  fields: {
    kind?: string;
    entityType?: string;
    entityId?: string;
    payloadJson?: string;
    email?: string;
    phone?: string;
    assignedTo?: string;
    sourceContactId?: string;
    linkedContactId?: string;
    linkedApplicationId?: string;
    lastSyncedAt?: string;
  },
): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);
  const pairs: Array<[string, string | undefined]> = [
    [portalThingsMap.kind, fields.kind],
    [portalThingsMap.entityType, fields.entityType],
    [portalThingsMap.entityId, fields.entityId],
    [portalThingsMap.payloadJson, fields.payloadJson],
    [portalThingsMap.email, fields.email],
    [portalThingsMap.phone, fields.phone],
    [portalThingsMap.assignedTo, fields.assignedTo],
    [portalThingsMap.sourceContactId, fields.sourceContactId],
    [portalThingsMap.linkedContactId, fields.linkedContactId],
    [portalThingsMap.linkedApplicationId, fields.linkedApplicationId],
    [portalThingsMap.lastSyncedAt, fields.lastSyncedAt ?? today],
  ];

  for (const [title, value] of pairs) {
    if (value === undefined) continue;
    await tryChangeColumnByTitle(boardId, itemId, title, value, {
      createLabelsIfMissing: true,
    });
  }
}

export async function updatePortalItemPayload(
  itemId: string,
  payloadJson: string,
  extras?: {
    name?: string;
    email?: string;
    phone?: string;
    assignedTo?: string;
    sourceContactId?: string;
    linkedContactId?: string;
    linkedApplicationId?: string;
  },
): Promise<void> {
  if (!canEditPortalThings()) {
    throw new Error('Portal Things is read-only.');
  }
  const boardId = await resolvePortalBoardId();
  if (!boardId) return;

  if (extras?.name?.trim()) {
    await api(mutations.updateItemName, {
      boardId,
      itemId,
      itemName: extras.name.trim(),
    }).catch(() => undefined);
  }

  await writePortalFields(boardId, itemId, {
    payloadJson,
    email: extras?.email,
    phone: extras?.phone,
    assignedTo: extras?.assignedTo,
    sourceContactId: extras?.sourceContactId,
    linkedContactId: extras?.linkedContactId,
    linkedApplicationId: extras?.linkedApplicationId,
  });
  setPortalItemsCache(null);
}

export async function deletePortalItem(itemId: string): Promise<void> {
  if (!canEditPortalThings()) {
    throw new Error('Portal Things is read-only.');
  }
  await api(mutations.deleteItem, { itemId });
  setPortalItemsCache(null);
}

export async function ensurePortalConfigItem(
  name: string,
  kind: string,
): Promise<string | null> {
  if (useMockData()) return null;
  const boardId = await resolvePortalBoardId();
  if (!boardId) return null;

  const existing = await findPortalItemByName(name);
  if (existing) return existing.id;

  if (!canEditPortalThings()) return null;

  const created = await createPortalItem({
    name,
    groupTitle: PORTAL_GROUP_CONFIG,
    kind,
    entityType: PORTAL_ENTITY_TYPE.config,
    entityId: kind,
    payloadJson: '{}',
  });
  return created.id;
}

export async function ensureNoteReviewRegistryOnPortal(): Promise<string | null> {
  return ensurePortalConfigItem(
    PORTAL_CONFIG_ITEM.noteReviewRegistry,
    PORTAL_KIND.noteReviewRegistry,
  );
}

export async function ensureEmailSignaturesOnPortal(): Promise<string | null> {
  return ensurePortalConfigItem(
    PORTAL_CONFIG_ITEM.emailSignatures,
    PORTAL_KIND.emailSignatures,
  );
}

export {
  PORTAL_GROUP_ONBOARDING,
  PORTAL_GROUP_RECRUITMENT,
  PORTAL_GROUP_CONFIG,
  PORTAL_KIND,
  PORTAL_ENTITY_TYPE,
  PORTAL_CONFIG_ITEM,
};

/** Ensure payload column exists conceptually — used by sync services. */
export async function portalPayloadColumnReady(): Promise<boolean> {
  const boardId = await resolvePortalBoardId();
  if (!boardId) return false;
  const col = await findBoardColumnByTitle(boardId, portalThingsMap.payloadJson);
  return Boolean(col);
}

export async function changePortalColumnByTitle(
  itemId: string,
  columnTitle: string,
  value: string,
): Promise<void> {
  const boardId = await resolvePortalBoardId();
  if (!boardId) return;
  await changeColumnByTitle(boardId, itemId, columnTitle, value, {
    createLabelsIfMissing: true,
  });
}
