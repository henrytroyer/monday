/**
 * import-donors-xls.ts — Import QuickBooks/donor spreadsheet into Contacts.
 *
 * Usage:
 *   npm run import:donors-xls -- --dry-run
 *   npm run import:donors-xls -- --dry-run --limit 50
 *   npm run import:donors-xls -- --apply --limit 10
 *   npm run import:donors-xls -- --apply
 *
 * Match: email → phone+last → exact name → fuzzy/ambiguous → Match Review.
 * Merge: fill gaps only (preferIncoming=false) + union donor tag.
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as XLSXNS from 'xlsx';

const XLSX = (XLSXNS as unknown as { default?: typeof XLSXNS }).default ?? XLSXNS;
import { contactMap } from '../src/config/contactMap.ts';
import { resolveContactsBoardId } from '../src/config/boards.ts';
import {
  matchContact,
  normalizeEmail,
} from '../src/services/contactUpsert/contactMatch.ts';
import {
  upsertContactPerson,
  type ContactUpsertInput,
  type ContactUpsertResult,
} from '../src/services/contactUpsert/contactUpsert.ts';
import {
  mapItemToContactListItem,
  type MondayContactItem,
} from '../src/services/mapMondayToContact.ts';
import { mondayGraphQL } from '../src/services/mondayGraphQL.ts';
import type { ContactListItem } from '../src/types/contact.ts';
import { normalizePersonName } from '../src/utils/personNameMatch.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const DEFAULT_FILE = '/Users/lesvoscoordinator/Downloads/Donors.xls';

const REQUEST_DELAY_MS = 200;
const PAGE_SIZE = 50;
const DEFAULT_CONCURRENCY = 2;
const MAX_UPSERT_RETRIES = 5;

function isRetryableUpsertError(message: string): boolean {
  return /rate limit|complexity|internal server error|timed? ?out|ECONNRESET|ETIMEDOUT|socket hang up|429|503/i.test(
    message,
  );
}

async function upsertWithRetry(
  input: ContactUpsertInput,
  contacts: ContactListItem[],
): Promise<ContactUpsertResult> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= MAX_UPSERT_RETRIES; attempt += 1) {
    try {
      return await upsertContactPerson(input, contacts);
    } catch (err) {
      lastError = err;
      const message = err instanceof Error ? err.message : String(err);
      if (!isRetryableUpsertError(message) || attempt === MAX_UPSERT_RETRIES) {
        throw err instanceof Error ? err : new Error(message);
      }
      const waitMs = 1000 * (attempt + 1);
      console.warn(
        `\n  …retry ${attempt + 1}/${MAX_UPSERT_RETRIES} after: ${message.slice(0, 100)}`,
      );
      await sleep(waitMs);
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error(String(lastError));
}

type DonorRow = {
  rowNumber: number;
  name: string;
  companyName: string;
  street: string;
  city: string;
  state: string;
  country: string;
  zip: string;
  phone: string;
  email: string;
};

type PredictedAction = 'created' | 'updated' | 'queued_review' | 'skipped';

type RowReport = {
  rowNumber: number;
  name: string;
  email: string;
  action: PredictedAction;
  tier?: string;
  contactId?: string;
  message: string;
  candidates?: Array<{ id: string; name: string; email: string; tier: string }>;
};

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function argValue(flag: string): string | undefined {
  const idx = process.argv.indexOf(flag);
  if (idx < 0) return undefined;
  return process.argv[idx + 1];
}

function cellStr(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'number') {
    if (Number.isInteger(value)) return String(value);
    return String(value);
  }
  return String(value).trim();
}

/** File-backed localStorage so Match Review enqueue works in Node. */
function installFileLocalStorage(filePath: string): void {
  let store: Record<string, string> = {};
  try {
    store = JSON.parse(readFileSync(filePath, 'utf8')) as Record<string, string>;
  } catch {
    store = {};
  }
  const persist = () => {
    mkdirSync(dirname(filePath), { recursive: true });
    writeFileSync(filePath, JSON.stringify(store, null, 2));
  };
  const storage = {
    get length() {
      return Object.keys(store).length;
    },
    key(index: number) {
      return Object.keys(store)[index] ?? null;
    },
    getItem(key: string) {
      return store[key] ?? null;
    },
    setItem(key: string, value: string) {
      store[key] = String(value);
      persist();
    },
    removeItem(key: string) {
      delete store[key];
      persist();
    },
    clear() {
      store = {};
      persist();
    },
  };
  (globalThis as unknown as { localStorage: typeof storage }).localStorage =
    storage;
}

function normalizeHeader(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, ' ');
}

function parseDonorsXls(filePath: string): DonorRow[] {
  const workbook = XLSX.read(readFileSync(filePath), {
    type: 'buffer',
    cellDates: true,
  });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw new Error('Spreadsheet has no sheets');
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: '',
    raw: false,
  });

  const out: DonorRow[] = [];
  for (let i = 0; i < rows.length; i += 1) {
    const raw = rows[i]!;
    const byNorm = new Map<string, unknown>();
    for (const [key, value] of Object.entries(raw)) {
      byNorm.set(normalizeHeader(key), value);
    }
    const get = (...aliases: string[]) => {
      for (const alias of aliases) {
        const hit = byNorm.get(normalizeHeader(alias));
        if (hit != null && cellStr(hit)) return cellStr(hit);
      }
      return '';
    };
    const name = get('Name');
    if (!name) continue;
    out.push({
      rowNumber: i + 2,
      name,
      companyName: get('Company name', 'Company'),
      street: get('Street Address', 'Street', 'Address'),
      city: get('City'),
      state: get('State'),
      country: get('Country'),
      zip: get('Zip', 'Zip Code', 'Postal Code'),
      phone: get('Phone'),
      email: get('Email'),
    });
  }
  return out;
}

function toUpsertInput(row: DonorRow): ContactUpsertInput {
  const company = row.companyName.trim();
  const nameNorm = normalizePersonName(row.name);
  const companyNorm = normalizePersonName(company);
  const connectedToLabels =
    company && companyNorm && companyNorm !== nameNorm ? [company] : undefined;

  return {
    name: row.name,
    email: row.email || undefined,
    phone: row.phone || undefined,
    city: row.city || undefined,
    zip: row.zip || undefined,
    address: row.street || undefined,
    tags: ['donor'],
    demographics: {
      address: row.street || undefined,
      city: row.city || undefined,
      state: row.state || undefined,
      zip: row.zip || undefined,
      country: row.country || undefined,
    },
    connectedToLabels,
    source: 'donors-xls-import',
    sourceItemId: `xls-row-${row.rowNumber}`,
    preferIncoming: false,
  };
}

function upsertWorkingList(
  contacts: ContactListItem[],
  contact: ContactListItem,
): void {
  const idx = contacts.findIndex((c) => c.id === contact.id);
  if (idx >= 0) contacts[idx] = contact;
  else contacts.push(contact);
}

async function fetchAllContactsBoard(
  boardId: string,
): Promise<ContactListItem[]> {
  const columnsData = await mondayGraphQL<{
    boards: Array<{ columns: Array<{ id: string; title: string }> }>;
  }>(
    `query ($boardId: [ID!]!) {
      boards(ids: $boardId) {
        columns { id title }
      }
    }`,
    { boardId: [boardId] },
  );
  const columns = columnsData.boards[0]?.columns ?? [];
  const wanted = new Set(
    [
      contactMap.email,
      contactMap.altEmail,
      contactMap.phone,
      contactMap.tags,
      contactMap.type,
      contactMap.address,
      contactMap.city,
      contactMap.state,
      contactMap.zip,
      contactMap.country,
      contactMap.connectedTo,
    ].map((t) => t.trim().toLowerCase()),
  );
  const columnIds = columns
    .filter((c) => wanted.has(c.title.trim().toLowerCase()))
    .map((c) => c.id);

  const contacts: ContactListItem[] = [];
  let cursor: string | null = null;
  let page = 0;
  do {
    page += 1;
    const data = await mondayGraphQL<{
      boards: Array<{
        items_page: {
          cursor: string | null;
          items: MondayContactItem[];
        };
      }>;
    }>(
      `query ($boardId: [ID!]!, $limit: Int!, $cursor: String, $columnIds: [String!]) {
        boards(ids: $boardId) {
          items_page(limit: $limit, cursor: $cursor) {
            cursor
            items {
              id
              name
              created_at
              column_values(ids: $columnIds) {
                id
                text
                type
                value
                column { title }
              }
            }
          }
        }
      }`,
      { boardId: [boardId], limit: PAGE_SIZE, cursor, columnIds },
    );
    const itemsPage = data.boards[0]?.items_page;
    const items = itemsPage?.items ?? [];
    for (const item of items) {
      contacts.push(mapItemToContactListItem(item));
    }
    cursor = itemsPage?.cursor ?? null;
    process.stdout.write(
      `\r  Loaded Contacts page ${page} (${contacts.length} items)…`,
    );
    if (cursor) await sleep(150);
  } while (cursor);
  process.stdout.write('\n');
  return contacts;
}

function predictAction(
  input: ContactUpsertInput,
  contacts: ContactListItem[],
): RowReport {
  if (!input.name.trim()) {
    return {
      rowNumber: Number(input.sourceItemId?.replace('xls-row-', '') || 0),
      name: input.name,
      email: input.email ?? '',
      action: 'skipped',
      message: 'Missing name',
    };
  }
  const match = matchContact(input, contacts);
  const rowNumber = Number(input.sourceItemId?.replace('xls-row-', '') || 0);
  if (match.needsReview) {
    const ranked = [...match.candidates].sort((a, b) => b.score - a.score);
    const best = ranked[0];
    const second = ranked[1];
    const clearWinner =
      match.tier === 'email' &&
      best &&
      !String(best.contact.id).startsWith('compiled:') &&
      (!second || best.score > second.score);
    if (clearWinner && best) {
      return {
        rowNumber,
        name: input.name,
        email: input.email ?? '',
        action: 'updated',
        tier: match.tier,
        contactId: best.contact.id,
        message: `Would update best email match (${best.contact.name})`,
      };
    }
    return {
      rowNumber,
      name: input.name,
      email: input.email ?? '',
      action: 'queued_review',
      tier: match.tier,
      message: `Would queue match review (${match.tier})`,
      candidates: match.candidates.map((c) => ({
        id: c.contact.id,
        name: c.contact.name,
        email: c.contact.email,
        tier: c.tier,
      })),
    };
  }
  if (match.match) {
    return {
      rowNumber,
      name: input.name,
      email: input.email ?? '',
      action: 'updated',
      tier: match.tier,
      contactId: match.match.id,
      message: `Would update via ${match.tier}`,
    };
  }
  return {
    rowNumber,
    name: input.name,
    email: input.email ?? '',
    action: 'created',
    message: 'Would create new contact',
  };
}

async function main(): Promise<void> {
  const apply = process.argv.includes('--apply');
  const live = apply && !process.argv.includes('--dry-run');
  const limitRaw = argValue('--limit');
  const limit = limitRaw ? Number(limitRaw) : undefined;
  const concurrencyRaw = argValue('--concurrency');
  const concurrency = Math.max(
    1,
    Math.min(
      8,
      concurrencyRaw && Number.isFinite(Number(concurrencyRaw))
        ? Number(concurrencyRaw)
        : DEFAULT_CONCURRENCY,
    ),
  );
  const filePath = resolve(argValue('--file') || DEFAULT_FILE);

  process.env.FORCE_DIRECT_MONDAY = 'true';
  process.env.VITE_USE_MOCK_DATA = 'false';
  if (live) {
    process.env.VITE_CONTACTS_WRITABLE = 'true';
    process.env.VITE_MONDAY_READ_ONLY = 'false';
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const tmpDir = resolve(ROOT, 'tmp');
  mkdirSync(tmpDir, { recursive: true });
  const storagePath = resolve(tmpDir, 'donors-import-localStorage.json');
  installFileLocalStorage(storagePath);

  if (!process.env.MONDAY_API_TOKEN?.trim()) {
    throw new Error('MONDAY_API_TOKEN is required in .env');
  }
  const boardId = resolveContactsBoardId();
  if (!boardId) {
    throw new Error('VITE_CONTACTS_BOARD_ID is required in .env');
  }

  console.log(`File: ${filePath}`);
  console.log(`Mode: ${live ? 'APPLY (live writes)' : 'DRY-RUN (no writes)'}`);
  console.log(`Contacts board: ${boardId}`);
  if (live) console.log(`Concurrency: ${concurrency}`);

  const donors = parseDonorsXls(filePath);
  const selected =
    limit && Number.isFinite(limit) && limit > 0
      ? donors.slice(0, limit)
      : donors;
  console.log(
    `Rows: ${selected.length} of ${donors.length}` +
      (limit ? ` (limit ${limit})` : ''),
  );

  console.log('Fetching Contacts board…');
  const contacts = await fetchAllContactsBoard(boardId);
  console.log(`Matching against ${contacts.length} Contacts items`);

  const reports: RowReport[] = [];
  const counts = {
    created: 0,
    updated: 0,
    queued_review: 0,
    skipped: 0,
    errors: 0,
  };

  let processed = 0;
  const printProgress = () => {
    process.stdout.write(
      `\r  Processed ${processed}/${selected.length}` +
        `  create=${counts.created} update=${counts.updated}` +
        ` review=${counts.queued_review} skip=${counts.skipped}` +
        ` err=${counts.errors}   `,
    );
  };

  if (!live) {
    for (let i = 0; i < selected.length; i += 1) {
      const row = selected[i]!;
      const input = toUpsertInput(row);
      const predicted = predictAction(input, contacts);
      reports.push(predicted);
      counts[predicted.action] += 1;
      if (predicted.action === 'created') {
        contacts.push({
          id: `dry-create-${row.rowNumber}`,
          name: input.name,
          email: normalizeEmail(input.email) || '—',
          phone: input.phone,
          tags: ['donor'],
          demographics: input.demographics,
          createdAt: new Date().toISOString(),
        });
      } else if (
        predicted.action === 'updated' &&
        predicted.contactId &&
        !predicted.contactId.startsWith('dry-create-')
      ) {
        const existing = contacts.find((c) => c.id === predicted.contactId);
        if (existing) {
          upsertWorkingList(contacts, {
            ...existing,
            tags: [...new Set([...existing.tags, 'donor' as const])],
            phone: existing.phone || input.phone,
            demographics: {
              ...existing.demographics,
              address:
                existing.demographics?.address || input.demographics?.address,
              city: existing.demographics?.city || input.demographics?.city,
              state: existing.demographics?.state || input.demographics?.state,
              zip: existing.demographics?.zip || input.demographics?.zip,
              country:
                existing.demographics?.country || input.demographics?.country,
            },
          });
        }
      }
      processed += 1;
      if (processed % 50 === 0 || processed === selected.length) printProgress();
    }
  } else {
    let cursor = 0;
    let listLock: Promise<void> = Promise.resolve();
    const withListLock = async <T>(fn: () => Promise<T> | T): Promise<T> => {
      const prev = listLock;
      let release!: () => void;
      listLock = new Promise<void>((resolveLock) => {
        release = resolveLock;
      });
      await prev;
      try {
        return await fn();
      } finally {
        release();
      }
    };

    const worker = async () => {
      while (true) {
        const i = cursor;
        cursor += 1;
        if (i >= selected.length) return;
        const row = selected[i]!;
        const input = toUpsertInput(row);
        try {
          // Snapshot list under lock, then write outside lock for concurrency.
          const snapshot = await withListLock(() => [...contacts]);
          const result: ContactUpsertResult = await upsertWithRetry(
            input,
            snapshot,
          );
          await withListLock(() => {
            counts[result.action] += 1;
            reports.push({
              rowNumber: row.rowNumber,
              name: row.name,
              email: row.email,
              action: result.action,
              contactId: result.contact?.id,
              message: result.message,
            });
            if (result.contact) upsertWorkingList(contacts, result.contact);
          });
        } catch (err) {
          await withListLock(() => {
            counts.errors += 1;
            reports.push({
              rowNumber: row.rowNumber,
              name: row.name,
              email: row.email,
              action: 'skipped',
              message: err instanceof Error ? err.message : String(err),
            });
          });
        }
        processed += 1;
        if (processed % 25 === 0 || processed === selected.length) {
          printProgress();
        }
        await sleep(REQUEST_DELAY_MS);
      }
    };

    await Promise.all(
      Array.from({ length: concurrency }, () => worker()),
    );
  }
  process.stdout.write('\n');

  const reportPath = resolve(
    tmpDir,
    `donors-import-report-${live ? 'apply' : 'dry'}-${stamp}.json`,
  );
  const summary = {
    mode: live ? 'apply' : 'dry-run',
    filePath,
    boardId,
    totalRows: selected.length,
    counts,
    sampleCreated: reports.filter((r) => r.action === 'created').slice(0, 15),
    sampleUpdated: reports.filter((r) => r.action === 'updated').slice(0, 15),
    sampleReview: reports
      .filter((r) => r.action === 'queued_review')
      .slice(0, 25),
    sampleErrors: reports
      .filter((r) => r.message && r.action === 'skipped')
      .slice(0, 25),
    rows: reports,
  };
  writeFileSync(reportPath, JSON.stringify(summary, null, 2));

  console.log('\nSummary');
  console.log(`  created:       ${counts.created}`);
  console.log(`  updated:       ${counts.updated}`);
  console.log(`  queued_review: ${counts.queued_review}`);
  console.log(`  skipped:       ${counts.skipped}`);
  console.log(`  errors:        ${counts.errors}`);
  console.log(`Report: ${reportPath}`);
  if (live && counts.queued_review > 0) {
    console.log(
      `Match Review items also in file-backed storage: ${storagePath}`,
    );
    console.log(
      '(Browser Match Review inbox uses localStorage — import review JSON manually if needed.)',
    );
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
