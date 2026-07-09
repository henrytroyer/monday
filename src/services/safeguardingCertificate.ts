import { contactMap } from '../config/contactMap';
import { columnMap } from '../config/columnMap';
import {
  safeguardingBoardId,
  safeguardingBoardMap,
} from '../config/safeguardingBoardMap';
import { queries } from '../utils/mondayQueries';
import type { VolunteerFile } from '../types/volunteer';
import { mondayGraphQL } from './mondayGraphQL';
import {
  assetIdFromProtectedUrl,
  certificateFileFromColumn,
  mondayAssetProxyUrl,
  parseLinkedBoardRelationIds,
} from './mondayFileColumns';
import type {
  MondayBoardItem,
  MondayColumnValue,
} from './mapMondayToCrm';
import type { MondayContactItem } from './mapMondayToContact';

const SAFEGUARDING_CERTIFICATE_NAME = 'Child safeguarding certificate';

type SafeguardingBoardMeta = {
  emailColumnId: string;
  certificateColumnId: string;
};

type SafeguardingItemsPageResponse = {
  boards: Array<{
    columns: Array<{ id: string; title: string }>;
    items_page: {
      items: MondayBoardItem[];
    };
  }>;
};

type SafeguardingItemResponse = {
  items: MondayBoardItem[];
};

let cachedBoardMeta: SafeguardingBoardMeta | null = null;

function normalizeEmail(value: string | undefined): string {
  return (value ?? '').trim().toLowerCase();
}

function columnTitle(col: MondayColumnValue): string {
  return col.column?.title?.trim() || '';
}

function findColumnIdByTitle(
  columns: Array<{ id: string; title: string }>,
  title: string,
): string | undefined {
  const normalized = title.trim().toLowerCase();
  return columns.find((col) => col.title.trim().toLowerCase() === normalized)
    ?.id;
}

function findColumnByTitle(
  columnValues: MondayColumnValue[] | undefined,
  title: string,
): MondayColumnValue | undefined {
  const normalized = title.trim().toLowerCase();
  return columnValues?.find(
    (col) => columnTitle(col).toLowerCase() === normalized,
  );
}

function parseEmailColumnValue(
  col: MondayColumnValue | undefined,
): string | undefined {
  const text = col?.text?.trim();
  if (text) return text;
  if (!col?.value) return undefined;

  try {
    const parsed = JSON.parse(col.value) as { email?: string; text?: string };
    return (parsed.email || parsed.text)?.trim() || undefined;
  } catch {
    return undefined;
  }
}

function emailFromApplicationItem(item: MondayBoardItem): string | undefined {
  return parseEmailColumnValue(
    findColumnByTitle(item.column_values, columnMap.email),
  );
}

function certificateFromSafeguardingMirror(
  columnValues: MondayColumnValue[] | undefined,
  proxyBase?: string,
): VolunteerFile | undefined {
  const mirrorCol = findColumnByTitle(
    columnValues,
    columnMap.safeguardingMirror,
  );
  const text = mirrorCol?.text?.trim() || '';
  const assetId =
    assetIdFromProtectedUrl(text) ||
    mirrorCol?.value?.match(/"assetId":(\d+)/)?.[1];
  if (!assetId) return undefined;

  const url = mondayAssetProxyUrl(assetId, proxyBase);
  if (!url) return undefined;

  const fileName =
    text.split('/').pop()?.split('?')[0] || SAFEGUARDING_CERTIFICATE_NAME;

  return {
    id: `safeguard-mirror-${assetId}`,
    name: /\.[a-z0-9]+$/i.test(fileName)
      ? fileName
      : SAFEGUARDING_CERTIFICATE_NAME,
    url,
    isImage: /\.(jpe?g|png|gif|webp)$/i.test(fileName),
  };
}

async function fetchSafeguardingBoardMeta(
  boardId: string,
): Promise<SafeguardingBoardMeta | null> {
  if (cachedBoardMeta) return cachedBoardMeta;

  const query = `
    query SafeguardingBoardMeta($boardId: [ID!]!) {
      boards(ids: $boardId) {
        columns {
          id
          title
        }
      }
    }
  `;

  const data = await mondayGraphQL<{
    boards: Array<{ columns: Array<{ id: string; title: string }> }>;
  }>(query, { boardId: [boardId] });

  const columns = data.boards?.[0]?.columns ?? [];
  const emailColumnId = findColumnIdByTitle(columns, safeguardingBoardMap.email);
  const certificateColumnId = findColumnIdByTitle(
    columns,
    safeguardingBoardMap.certificate,
  );

  if (!emailColumnId || !certificateColumnId) return null;

  cachedBoardMeta = { emailColumnId, certificateColumnId };
  return cachedBoardMeta;
}

function certificateFromItem(
  item: MondayBoardItem,
  certificateColumnId: string,
  proxyBase?: string,
): VolunteerFile | undefined {
  const certificateCol = item.column_values?.find(
    (col) => col.id === certificateColumnId,
  );
  return certificateFileFromColumn(
    certificateCol,
    proxyBase,
    SAFEGUARDING_CERTIFICATE_NAME,
  );
}

async function fetchSafeguardingItemById(
  itemId: string,
  certificateColumnId: string,
  proxyBase?: string,
): Promise<VolunteerFile | undefined> {
  const query = `
    query SafeguardingItem($itemId: [ID!]!) {
      items(ids: $itemId) {
        id
        column_values {
          id
          type
          text
          value
          column {
            title
          }
        }
      }
    }
  `;

  const data = await mondayGraphQL<SafeguardingItemResponse>(query, {
    itemId: [itemId],
  });

  const item = data.items?.[0];
  if (!item) return undefined;

  return certificateFromItem(item, certificateColumnId, proxyBase);
}

async function fetchContactItemById(
  itemId: string,
): Promise<MondayContactItem | null> {
  const data = await mondayGraphQL<{ items: MondayContactItem[] }>(
    queries.getItem,
    { itemId: [itemId] },
  );
  return data.items?.[0] ?? null;
}

export async function fetchSafeguardingCertificateByEmail(
  email: string | undefined,
  proxyBase?: string,
): Promise<VolunteerFile | undefined> {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) return undefined;

  const boardId = safeguardingBoardId();
  if (!boardId) return undefined;

  const meta = await fetchSafeguardingBoardMeta(boardId);
  if (!meta) return undefined;

  const query = `
    query SafeguardingByEmail(
      $boardId: [ID!]!
      $columnId: String!
      $compareValue: CompareValue!
    ) {
      boards(ids: $boardId) {
        columns {
          id
          title
        }
        items_page(
          limit: 1
          query_params: {
            rules: [
              {
                column_id: $columnId
                compare_value: $compareValue
                operator: any_of
              }
            ]
          }
        ) {
          items {
            id
            column_values {
              id
              type
              text
              value
              column {
                title
              }
            }
          }
        }
      }
    }
  `;

  const data = await mondayGraphQL<SafeguardingItemsPageResponse>(query, {
    boardId: [boardId],
    columnId: meta.emailColumnId,
    compareValue: [normalizedEmail],
  });

  const item = data.boards?.[0]?.items_page?.items?.[0];
  if (!item) return undefined;

  return certificateFromItem(item, meta.certificateColumnId, proxyBase);
}

export async function fetchSafeguardingCertificateFromContactLink(
  contactItemId: string | undefined,
  proxyBase?: string,
): Promise<VolunteerFile | undefined> {
  if (!contactItemId?.trim()) return undefined;

  const boardId = safeguardingBoardId();
  if (!boardId) return undefined;

  const meta = await fetchSafeguardingBoardMeta(boardId);
  if (!meta) return undefined;

  const contact = await fetchContactItemById(contactItemId);
  if (!contact) return undefined;

  const safeguardingCol = findColumnByTitle(
    contact.column_values,
    contactMap.safeguardingLink,
  );

  const linkedItemId = parseLinkedBoardRelationIds(safeguardingCol)[0];
  if (!linkedItemId) return undefined;

  return fetchSafeguardingItemById(
    linkedItemId,
    meta.certificateColumnId,
    proxyBase,
  );
}

export async function fetchSafeguardingCertificateFromApplicationItem(
  item: MondayBoardItem,
  email: string | undefined,
  proxyBase?: string,
): Promise<VolunteerFile | undefined> {
  const resolvedEmail = email ?? emailFromApplicationItem(item);
  const byEmail = await fetchSafeguardingCertificateByEmail(
    resolvedEmail,
    proxyBase,
  );
  if (byEmail) return byEmail;

  const fromMirror = certificateFromSafeguardingMirror(
    item.column_values,
    proxyBase,
  );
  if (fromMirror) return fromMirror;

  const contactsCol = findColumnByTitle(
    item.column_values,
    columnMap.contactsLink,
  );
  const contactItemId = parseLinkedBoardRelationIds(contactsCol)[0];

  return fetchSafeguardingCertificateFromContactLink(
    contactItemId,
    proxyBase,
  );
}

export { SAFEGUARDING_CERTIFICATE_NAME };
