/**
 * Monday donor sync — find/create Contacts, create Donations, link via board_relation.
 * Used by qbo-income-watcher.mjs (server-side only; uses MONDAY_API_TOKEN).
 */

import dotenv from 'dotenv';

dotenv.config();

const MONDAY_API = 'https://api.monday.com/v2';
const API_VERSION = '2024-10';

const DONOR_TAG_LABEL = 'Donor';

/** @param {string} type @param {string|number} id */
export function buildQboTxnKey(type, id) {
  return `QBO:${type}:${id}`;
}

/** @param {string} text */
export function parseQboTxnKey(text) {
  const match = String(text ?? '').match(/QBO:([^:]+):([\w-]+)/);
  if (!match) return null;
  return { type: match[1], id: match[2] };
}

function env(key, viteKey, fallback = '') {
  const value = process.env[key] ?? process.env[viteKey];
  return value?.trim() ? value.trim() : fallback;
}

function contactsBoardId() {
  return env('CONTACTS_BOARD_ID', 'VITE_CONTACTS_BOARD_ID');
}

function donationsBoardId() {
  return env('DONATIONS_BOARD_ID', 'VITE_DONATIONS_BOARD_ID');
}

function donationsLinkColumnId() {
  return env(
    'CONTACT_COL_DONATIONS_LINK_ID',
    'VITE_CONTACT_COL_DONATIONS_LINK_ID',
    'link_to_donations',
  );
}

function columnTitle(mapKey, envKey, viteEnvKey, fallback) {
  return env(envKey, viteEnvKey, fallback);
}

function normalizeTitle(title) {
  return String(title ?? '').trim().toLowerCase();
}

async function mondayGraphql(query, variables = {}) {
  const token = process.env.MONDAY_API_TOKEN;
  if (!token) {
    throw new Error('Set MONDAY_API_TOKEN in environment');
  }

  const res = await fetch(MONDAY_API, {
    method: 'POST',
    headers: {
      Authorization: token,
      'Content-Type': 'application/json',
      'API-Version': API_VERSION,
    },
    body: JSON.stringify({ query, variables }),
  });

  const text = await res.text();
  let payload;
  try {
    payload = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(text || `monday API ${res.status}`);
  }

  if (!res.ok || payload.errors?.length) {
    const message =
      payload.errors?.[0]?.message ||
      payload.error_message ||
      text ||
      `monday API ${res.status}`;
    throw new Error(message);
  }

  return payload.data;
}

const boardColumnsCache = new Map();

async function fetchBoardColumns(boardId) {
  if (boardColumnsCache.has(boardId)) {
    return boardColumnsCache.get(boardId);
  }

  const data = await mondayGraphql(
    `query ($boardId: [ID!]) {
      boards(ids: $boardId) {
        columns { id title type settings_str }
      }
    }`,
    { boardId: [boardId] },
  );

  const columns = data.boards?.[0]?.columns ?? [];
  boardColumnsCache.set(boardId, columns);
  return columns;
}

function findColumn(columns, title) {
  const target = normalizeTitle(title);
  return columns.find((col) => normalizeTitle(col.title) === target);
}

function findColumnById(columns, id) {
  return columns.find((col) => col.id === id);
}

function parseLinkedItemIds(columnValue) {
  if (!columnValue?.value) return [];
  try {
    const parsed = JSON.parse(columnValue.value);
    if (Array.isArray(parsed.linkedPulseIds)) {
      return parsed.linkedPulseIds.map(String);
    }
    if (Array.isArray(parsed.item_ids)) {
      return parsed.item_ids.map(String);
    }
  } catch {
    // fall through
  }
  return [];
}

function formatEmailValue(email) {
  const trimmed = email.trim();
  return JSON.stringify({ email: trimmed, text: trimmed });
}

function formatDateValue(date) {
  return JSON.stringify({ date: String(date).slice(0, 10) });
}

function formatBoardRelationValue(itemIds) {
  const ids = [...new Set(itemIds.filter(Boolean))].map(Number);
  return JSON.stringify({ item_ids: ids });
}

function formatDropdownLabels(labels) {
  return JSON.stringify({ labels });
}

function formatStatusLabel(label) {
  return JSON.stringify({ label });
}

function formatTextValue(text) {
  return JSON.stringify(text);
}

async function changeColumnValue(boardId, itemId, columnId, value, options = {}) {
  await mondayGraphql(
    `mutation ($boardId: ID!, $itemId: ID!, $columnId: String!, $value: JSON!, $createLabelsIfMissing: Boolean) {
      change_column_value(
        board_id: $boardId,
        item_id: $itemId,
        column_id: $columnId,
        value: $value,
        create_labels_if_missing: $createLabelsIfMissing
      ) { id }
    }`,
    {
      boardId,
      itemId,
      columnId,
      value,
      createLabelsIfMissing: options.createLabelsIfMissing ?? false,
    },
  );
}

async function changeSimpleColumnValue(boardId, itemId, columnId, value) {
  await mondayGraphql(
    `mutation ($boardId: ID!, $itemId: ID!, $columnId: String!, $value: String!) {
      change_simple_column_value(
        board_id: $boardId,
        item_id: $itemId,
        column_id: $columnId,
        value: $value
      ) { id }
    }`,
    { boardId, itemId, columnId, value },
  );
}

async function createItem(boardId, itemName) {
  const data = await mondayGraphql(
    `mutation ($boardId: ID!, $itemName: String!) {
      create_item(board_id: $boardId, item_name: $itemName) { id name }
    }`,
    { boardId, itemName },
  );
  return data.create_item;
}

async function fetchItemsPage(boardId, rules, limit = 100, cursor) {
  const data = await mondayGraphql(
    `query ($boardId: [ID!], $rules: [ItemsQueryRule!]!, $limit: Int, $cursor: String) {
      boards(ids: $boardId) {
        items_page(limit: $limit, cursor: $cursor, query_params: { rules: $rules }) {
          cursor
          items {
            id
            name
            column_values { id text value type column { title } }
          }
        }
      }
    }`,
    {
      boardId: [boardId],
      rules,
      limit,
      cursor: cursor ?? undefined,
    },
  );
  return data.boards?.[0]?.items_page ?? { cursor: null, items: [] };
}

async function fetchContactItem(contactId) {
  const data = await mondayGraphql(
    `query ($itemIds: [ID!]) {
      items(ids: $itemIds) {
        id
        name
        column_values { id text value type column { title } }
      }
    }`,
    { itemIds: [contactId] },
  );
  return data.items?.[0] ?? null;
}

/** @param {string} email */
export async function findContactByEmail(email) {
  const boardId = contactsBoardId();
  if (!boardId) {
    throw new Error('Set CONTACTS_BOARD_ID or VITE_CONTACTS_BOARD_ID');
  }

  const columns = await fetchBoardColumns(boardId);
  const emailTitle = columnTitle(
    'email',
    'CONTACT_COL_EMAIL',
    'VITE_CONTACT_COL_EMAIL',
    'Email',
  );
  const emailCol = findColumn(columns, emailTitle);
  const emailColumnId = emailCol?.id ?? 'email';
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) return null;

  let cursor = null;
  do {
    const page = await fetchItemsPage(
      boardId,
      [
        {
          column_id: emailColumnId,
          compare_value: [normalizedEmail],
          operator: 'contains_text',
        },
      ],
      100,
      cursor,
    );

    const match = page.items.find((item) => {
      const emailColValue = item.column_values.find(
        (col) => col.id === emailColumnId,
      );
      const text = emailColValue?.text?.trim().toLowerCase() ?? '';
      return text === normalizedEmail || text.includes(normalizedEmail);
    });

    if (match) return match;
    cursor = page.cursor;
  } while (cursor);

  return null;
}

/** @param {string} qboKey */
export async function findDonationByQboKey(qboKey) {
  const boardId = donationsBoardId();
  if (!boardId) {
    throw new Error('Set DONATIONS_BOARD_ID or VITE_DONATIONS_BOARD_ID');
  }

  const qboColumnId = env(
    'DONATION_COL_QBO_TXN_ID',
    'VITE_DONATION_COL_QBO_TXN_ID',
  );
  const columns = await fetchBoardColumns(boardId);

  if (qboColumnId) {
    let cursor = null;
    do {
      const page = await fetchItemsPage(
        boardId,
        [
          {
            column_id: qboColumnId,
            compare_value: [qboKey],
            operator: 'contains_text',
          },
        ],
        100,
        cursor,
      );
      if (page.items.length > 0) return page.items[0];
      cursor = page.cursor;
    } while (cursor);
  }

  const detailsTitle = columnTitle(
    'details',
    'DONATION_COL_DETAILS',
    'VITE_DONATION_COL_DETAILS',
    'Details',
  );
  const detailsCol = findColumn(columns, detailsTitle);
  const detailsColumnId = detailsCol?.id ?? 'text';

  let cursor = null;
  do {
    const page = await fetchItemsPage(
      boardId,
      [
        {
          column_id: detailsColumnId,
          compare_value: [qboKey],
          operator: 'contains_text',
        },
      ],
      100,
      cursor,
    );
    if (page.items.length > 0) return page.items[0];
    cursor = page.cursor;
  } while (cursor);

  return null;
}

/**
 * Secondary dedupe: same email + amount + date within 24h window.
 * @param {string} email
 * @param {number} amount
 * @param {string} date YYYY-MM-DD
 */
export async function findDonationSecondaryDedupe(email, amount, date) {
  const boardId = donationsBoardId();
  if (!boardId) return null;

  const columns = await fetchBoardColumns(boardId);
  const emailTitle = columnTitle(
    'donorEmail',
    'DONATION_COL_EMAIL',
    'VITE_DONATION_COL_EMAIL',
    'Donor Email',
  );
  const emailCol = findColumn(columns, emailTitle);
  const emailColumnId = emailCol?.id ?? 'email';
  const normalizedEmail = email.trim().toLowerCase();

  let cursor = null;
  const candidates = [];
  do {
    const page = await fetchItemsPage(
      boardId,
      [
        {
          column_id: emailColumnId,
          compare_value: [normalizedEmail],
          operator: 'contains_text',
        },
      ],
      100,
      cursor,
    );
    candidates.push(...page.items);
    cursor = page.cursor;
  } while (cursor);

  const amountTitle = columnTitle(
    'amount',
    'DONATION_COL_AMOUNT',
    'VITE_DONATION_COL_AMOUNT',
    'Amount',
  );
  const dateTitle = columnTitle(
    'date',
    'DONATION_COL_DATE',
    'VITE_DONATION_COL_DATE',
    'Date',
  );

  const targetDate = Date.parse(date);
  if (!Number.isFinite(targetDate)) return null;

  for (const item of candidates) {
    const amountCol = item.column_values.find(
      (col) => normalizeTitle(col.column?.title) === normalizeTitle(amountTitle),
    );
    const dateCol = item.column_values.find(
      (col) => normalizeTitle(col.column?.title) === normalizeTitle(dateTitle),
    );

    const itemAmount = Number(
      String(amountCol?.text ?? '').replace(/[^0-9.-]/g, ''),
    );
    if (!Number.isFinite(itemAmount) || Math.abs(itemAmount - amount) > 0.01) {
      continue;
    }

    let itemDateText = dateCol?.text?.trim().split(' ')[0] ?? '';
    if (!itemDateText && dateCol?.value) {
      try {
        const parsed = JSON.parse(dateCol.value);
        itemDateText = parsed.date ?? '';
      } catch {
        // ignore
      }
    }

    const itemDate = Date.parse(itemDateText);
    if (!Number.isFinite(itemDate)) continue;

    const diffMs = Math.abs(itemDate - targetDate);
    if (diffMs <= 24 * 60 * 60 * 1000) {
      return item;
    }
  }

  return null;
}

async function resolveContactTagsColumn(columns) {
  const tagsTitle = columnTitle(
    'tags',
    'CONTACT_COL_TAGS',
    'VITE_CONTACT_COL_TAGS',
    'Tags',
  );
  const typeTitle = columnTitle(
    'type',
    'CONTACT_COL_TYPE',
    'VITE_CONTACT_COL_TYPE',
    'type',
  );

  const tagsCol = findColumn(columns, tagsTitle);
  const typeCol = findColumn(columns, typeTitle);

  if (tagsCol && (tagsCol.type === 'status' || tagsCol.type === 'dropdown')) {
    return tagsCol;
  }
  return typeCol ?? tagsCol;
}

/**
 * @param {{ displayName: string, email: string, qboCustomerId?: string }} customer
 */
export async function createContactFromQbo(customer) {
  const boardId = contactsBoardId();
  const columns = await fetchBoardColumns(boardId);
  const emailTitle = columnTitle(
    'email',
    'CONTACT_COL_EMAIL',
    'VITE_CONTACT_COL_EMAIL',
    'Email',
  );
  const qboTitle = columnTitle(
    'quickbooksCustomerId',
    'CONTACT_COL_QBO_CUSTOMER_ID',
    'VITE_CONTACT_COL_QBO_CUSTOMER_ID',
    'QuickBooks Customer ID',
  );

  const name =
    customer.displayName?.trim() ||
    customer.email.split('@')[0] ||
    'Donor';
  const item = await createItem(boardId, name);

  const emailCol = findColumn(columns, emailTitle);
  if (emailCol) {
    await changeColumnValue(
      boardId,
      item.id,
      emailCol.id,
      formatEmailValue(customer.email),
    );
  }

  const tagsCol = await resolveContactTagsColumn(columns);
  if (tagsCol) {
    if (tagsCol.type === 'dropdown') {
      await changeColumnValue(
        boardId,
        item.id,
        tagsCol.id,
        formatDropdownLabels([DONOR_TAG_LABEL]),
        { createLabelsIfMissing: true },
      );
    } else if (tagsCol.type === 'status') {
      await changeColumnValue(
        boardId,
        item.id,
        tagsCol.id,
        formatStatusLabel(DONOR_TAG_LABEL),
        { createLabelsIfMissing: true },
      );
    } else if (tagsCol.type === 'text' || tagsCol.type === 'long_text') {
      await changeSimpleColumnValue(
        boardId,
        item.id,
        tagsCol.id,
        DONOR_TAG_LABEL,
      );
    }
  }

  const qboCol = findColumn(columns, qboTitle);
  if (qboCol && customer.qboCustomerId) {
    if (qboCol.type === 'text' || qboCol.type === 'long_text') {
      await changeSimpleColumnValue(
        boardId,
        item.id,
        qboCol.id,
        String(customer.qboCustomerId),
      );
    } else {
      await changeColumnValue(
        boardId,
        item.id,
        qboCol.id,
        formatTextValue(String(customer.qboCustomerId)),
      );
    }
  }

  return item;
}

/**
 * @param {import('./qbo-income-types.mjs').NormalizedIncomeTxn} txn
 * @param {{ id: string, name: string }} contact
 */
export async function createDonationFromQbo(txn, contact) {
  const boardId = donationsBoardId();
  const columns = await fetchBoardColumns(boardId);

  const dateTitle = columnTitle(
    'date',
    'DONATION_COL_DATE',
    'VITE_DONATION_COL_DATE',
    'Date',
  );
  const emailTitle = columnTitle(
    'donorEmail',
    'DONATION_COL_EMAIL',
    'VITE_DONATION_COL_EMAIL',
    'Donor Email',
  );
  const amountTitle = columnTitle(
    'amount',
    'DONATION_COL_AMOUNT',
    'VITE_DONATION_COL_AMOUNT',
    'Amount',
  );
  const programTitle = columnTitle(
    'program',
    'DONATION_COL_PROGRAM',
    'VITE_DONATION_COL_PROGRAM',
    'Program',
  );
  const designationTitle = columnTitle(
    'designation',
    'DONATION_COL_DESIGNATION',
    'VITE_DONATION_COL_DESIGNATION',
    'Designation',
  );
  const detailsTitle = columnTitle(
    'details',
    'DONATION_COL_DETAILS',
    'VITE_DONATION_COL_DETAILS',
    'Details',
  );
  const nameTitle = columnTitle(
    'donorName',
    'DONATION_COL_NAME',
    'VITE_DONATION_COL_NAME',
    'Name',
  );

  const qboColumnId = env(
    'DONATION_COL_QBO_TXN_ID',
    'VITE_DONATION_COL_QBO_TXN_ID',
  );

  const itemName =
    txn.description?.trim().slice(0, 80) ||
    `${txn.type} — ${txn.customerName || contact.name}`;

  const detailsLines = [
    txn.qboKey,
    `Type: ${txn.type}`,
    `Customer: ${txn.customerName || contact.name}`,
    txn.description ? `Note: ${txn.description}` : '',
    txn.currency ? `Currency: ${txn.currency}` : '',
  ].filter(Boolean);

  const item = await createItem(boardId, itemName);

  const setColumn = async (title, value, formatter) => {
    const col = findColumn(columns, title);
    if (!col || value == null || value === '') return;
    if (col.type === 'numbers') {
      await changeSimpleColumnValue(boardId, item.id, col.id, String(value));
    } else if (formatter) {
      await changeColumnValue(boardId, item.id, col.id, formatter(value));
    } else {
      await changeColumnValue(boardId, item.id, col.id, formatTextValue(value));
    }
  };

  await setColumn(dateTitle, txn.txnDate, formatDateValue);
  await setColumn(emailTitle, txn.customerEmail, formatEmailValue);
  await setColumn(amountTitle, txn.amount);
  await setColumn(designationTitle, txn.description);
  await setColumn(nameTitle, txn.customerName || contact.name);
  await setColumn(detailsTitle, detailsLines.join('\n'));

  if (txn.programLabel) {
    const programCol = findColumn(columns, programTitle);
    if (programCol?.type === 'status') {
      await changeColumnValue(
        boardId,
        item.id,
        programCol.id,
        formatStatusLabel(txn.programLabel),
        { createLabelsIfMissing: true },
      );
    } else if (programCol) {
      await setColumn(programTitle, txn.programLabel);
    }
  }

  if (qboColumnId) {
    const qboCol = findColumnById(columns, qboColumnId);
    if (qboCol) {
      if (qboCol.type === 'text' || qboCol.type === 'long_text') {
        await changeSimpleColumnValue(boardId, item.id, qboCol.id, txn.qboKey);
      } else {
        await changeColumnValue(
          boardId,
          item.id,
          qboCol.id,
          formatTextValue(txn.qboKey),
        );
      }
    }
  }

  const contactLinkTitle = env(
    'DONATION_COL_CONTACT_LINK',
    'VITE_DONATION_COL_CONTACT_LINK',
    'Contact',
  );
  const contactLinkCol = findColumn(columns, contactLinkTitle);
  if (contactLinkCol?.type === 'board_relation') {
    await changeColumnValue(
      boardId,
      item.id,
      contactLinkCol.id,
      formatBoardRelationValue([contact.id]),
    );
  }

  return item;
}

/**
 * @param {string} contactItemId
 * @param {string} donationItemId
 * @param {string[]} [existingLinkedIds]
 */
export async function linkDonationToContact(
  contactItemId,
  donationItemId,
  existingLinkedIds = [],
) {
  const boardId = contactsBoardId();
  const linkColumnId = donationsLinkColumnId();

  let linkedIds = [...existingLinkedIds];
  if (linkedIds.length === 0) {
    const contactItem = await fetchContactItem(contactItemId);
    const linkCol = contactItem?.column_values.find(
      (col) => col.id === linkColumnId,
    );
    linkedIds = parseLinkedItemIds(linkCol);
  }

  if (linkedIds.includes(String(donationItemId))) {
    return;
  }

  linkedIds.push(String(donationItemId));
  await changeColumnValue(
    boardId,
    contactItemId,
    linkColumnId,
    formatBoardRelationValue(linkedIds),
  );
}

/**
 * @param {import('./qbo-income-types.mjs').NormalizedIncomeTxn} txn
 */
export async function syncIncomeTransaction(txn) {
  if (!txn.customerEmail) {
    return {
      status: 'skipped',
      reason: 'no_email',
      qboKey: txn.qboKey,
    };
  }

  const existing = await findDonationByQboKey(txn.qboKey);
  if (existing) {
    return {
      status: 'duplicate',
      qboKey: txn.qboKey,
      donationItemId: existing.id,
    };
  }

  const secondary = await findDonationSecondaryDedupe(
    txn.customerEmail,
    txn.amount,
    txn.txnDate,
  );
  if (secondary) {
    return {
      status: 'duplicate_secondary',
      qboKey: txn.qboKey,
      donationItemId: secondary.id,
    };
  }

  let contact = await findContactByEmail(txn.customerEmail);
  let contactCreated = false;

  if (!contact) {
    contact = await createContactFromQbo({
      displayName: txn.customerName,
      email: txn.customerEmail,
      qboCustomerId: txn.customerId,
    });
    contactCreated = true;
  }

  const donation = await createDonationFromQbo(txn, contact);
  await linkDonationToContact(contact.id, donation.id);

  return {
    status: 'created',
    qboKey: txn.qboKey,
    contactItemId: contact.id,
    contactCreated,
    donationItemId: donation.id,
  };
}
