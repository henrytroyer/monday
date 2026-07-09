/**
 * QuickBooks income watcher — read-only poll of customer income → Monday sync.
 *
 * Env: QBO_ACCESS_TOKEN, QBO_REALM_ID, MONDAY_API_TOKEN, board IDs (see docs)
 * Run: npm run qbo:watch-income
 *
 * Never POST/PATCH/DELETE to QuickBooks — GET /query only.
 */

import dotenv from 'dotenv';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildQboTxnKey,
  syncIncomeTransaction,
} from './mondayDonorSync.mjs';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STATE_PATH =
  process.env.QBO_INCOME_SYNC_STATE_PATH ||
  path.join(__dirname, '.qbo-income-sync-state.json');

const INTERVAL_MS = Number(process.env.QBO_INCOME_SYNC_INTERVAL_MS || 300_000);
const LOOKBACK_DAYS = Number(process.env.QBO_INCOME_LOOKBACK_DAYS || 7);
const ENABLED = process.env.QBO_INCOME_SYNC_ENABLED !== 'false';
const PAGE_SIZE = 500;

const TOKEN = process.env.QBO_ACCESS_TOKEN;
const REALM_ID = process.env.QBO_REALM_ID;
const BASE = REALM_ID
  ? `https://quickbooks.api.intuit.com/v3/company/${REALM_ID}`
  : '';

/** @type {Map<string, object>} */
const customerCache = new Map();

function log(level, message, extra) {
  const prefix = `[qbo-income-watcher ${new Date().toISOString()}]`;
  if (extra !== undefined) {
    console[level](`${prefix} ${message}`, extra);
  } else {
    console[level](`${prefix} ${message}`);
  }
}

async function loadState() {
  try {
    const raw = await fs.readFile(STATE_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    return {
      lastRunAt: parsed.lastRunAt ?? null,
      processedKeys: new Set(Array.isArray(parsed.processedKeys) ? parsed.processedKeys : []),
    };
  } catch {
    return { lastRunAt: null, processedKeys: new Set() };
  }
}

async function saveState(state) {
  const payload = {
    lastRunAt: state.lastRunAt,
    processedKeys: [...state.processedKeys].slice(-10_000),
  };
  await fs.writeFile(STATE_PATH, JSON.stringify(payload, null, 2));
}

function sinceDateFromState(state) {
  const now = new Date();
  const lookback = new Date(now);
  lookback.setDate(lookback.getDate() - LOOKBACK_DAYS);
  const lookbackStr = lookback.toISOString().slice(0, 10);

  if (!state.lastRunAt) {
    return lookbackStr;
  }

  const lastRun = new Date(state.lastRunAt);
  lastRun.setHours(lastRun.getHours() - 1);
  const overlapStr = lastRun.toISOString().slice(0, 10);
  return overlapStr < lookbackStr ? lookbackStr : overlapStr;
}

async function qboFetch(path) {
  if (!TOKEN || !REALM_ID) {
    throw new Error('Set QBO_ACCESS_TOKEN and QBO_REALM_ID in environment');
  }

  const res = await fetch(`${BASE}${path}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      Accept: 'application/json',
    },
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(text || `QBO ${res.status}`);
  }
  return text ? JSON.parse(text) : {};
}

async function qboQueryAll(entity, whereClause) {
  const results = [];
  let start = 1;

  while (true) {
    const query = encodeURIComponent(
      `select * from ${entity} where ${whereClause} STARTPOSITION ${start} MAXRESULTS ${PAGE_SIZE}`,
    );
    const data = await qboFetch(`/query?query=${query}`);
    const batch = data.QueryResponse?.[entity] ?? [];
    if (!Array.isArray(batch) || batch.length === 0) break;
    results.push(...batch);
    if (batch.length < PAGE_SIZE) break;
    start += PAGE_SIZE;
  }

  return results;
}

function customerEmail(customer) {
  return String(customer?.PrimaryEmailAddr?.Address ?? '').trim();
}

async function fetchCustomer(customerId) {
  const id = String(customerId ?? '').trim();
  if (!id) return null;
  if (customerCache.has(id)) return customerCache.get(id);

  const query = encodeURIComponent(`select * from Customer where Id = '${id}'`);
  const data = await qboFetch(`/query?query=${query}`);
  const customer = data.QueryResponse?.Customer?.[0] ?? null;
  if (customer) customerCache.set(id, customer);
  return customer;
}

function firstLineDescription(lines) {
  const line = (lines ?? []).find(
    (entry) =>
      entry.DetailType === 'SalesItemLineDetail' ||
      entry.DetailType === 'DepositLineDetail' ||
      entry.Description,
  );
  return String(
    line?.Description ??
      line?.SalesItemLineDetail?.ItemRef?.name ??
      line?.DepositLineDetail?.Entity?.name ??
      '',
  ).trim();
}

function extractProgramLabel(lines) {
  const description = firstLineDescription(lines);
  return description || undefined;
}

/**
 * @param {string} type
 * @param {object} raw
 * @param {object|null} customer
 * @returns {import('./qbo-income-types.mjs').NormalizedIncomeTxn|null}
 */
function normalizeTxn(type, raw, customer) {
  const id = String(raw.Id ?? '');
  if (!id) return null;

  const amount = Number(raw.TotalAmt ?? raw.Amount ?? 0);
  if (!Number.isFinite(amount) || amount <= 0) return null;

  const customerId = String(
    raw.CustomerRef?.value ??
      customer?.Id ??
      '',
  ).trim();

  const email = customerEmail(customer);
  const customerName = String(
    raw.CustomerRef?.name ?? customer?.DisplayName ?? '',
  ).trim();

  return {
    type,
    id,
    qboKey: buildQboTxnKey(type, id),
    txnDate: String(raw.TxnDate ?? '').slice(0, 10),
    amount,
    currency: String(raw.CurrencyRef?.value ?? 'USD'),
    description:
      firstLineDescription(raw.Line) ||
      String(raw.PrivateNote ?? raw.PaymentRefNum ?? raw.DocNumber ?? type),
    customerId,
    customerName,
    customerEmail: email,
    programLabel: extractProgramLabel(raw.Line),
  };
}

async function normalizeWithCustomer(type, raw) {
  const customerId = raw.CustomerRef?.value;
  const customer = customerId ? await fetchCustomer(customerId) : null;
  return normalizeTxn(type, raw, customer);
}

async function fetchDepositIncome(sinceDate) {
  const deposits = await qboQueryAll('Deposit', `TxnDate >= '${sinceDate}'`);
  /** @type {import('./qbo-income-types.mjs').NormalizedIncomeTxn[]} */
  const normalized = [];

  for (const deposit of deposits) {
    const headerCustomerId = deposit.CustomerRef?.value;
    if (headerCustomerId) {
      const customer = await fetchCustomer(headerCustomerId);
      const txn = normalizeTxn('Deposit', deposit, customer);
      if (txn) normalized.push(txn);
      continue;
    }

    for (const line of deposit.Line ?? []) {
      const detail = line.DepositLineDetail;
      if (!detail) continue;

      const entity = detail.Entity;
      if (entity?.type === 'Customer' && entity.value) {
        const customer = await fetchCustomer(entity.value);
        const amount = Number(line.Amount ?? 0);
        if (amount <= 0) continue;

        const email = customerEmail(customer);
        normalized.push({
          type: 'Deposit',
          id: `${deposit.Id}-${line.Id ?? line.LineNum ?? normalized.length}`,
          qboKey: buildQboTxnKey(
            'Deposit',
            `${deposit.Id}-${line.Id ?? line.LineNum ?? 'line'}`,
          ),
          txnDate: String(deposit.TxnDate ?? '').slice(0, 10),
          amount,
          currency: String(deposit.CurrencyRef?.value ?? 'USD'),
          description:
            String(line.Description ?? detail.AccountRef?.name ?? 'Deposit line').trim() ||
            'Deposit',
          customerId: String(entity.value),
          customerName: String(entity.name ?? customer?.DisplayName ?? ''),
          customerEmail: email,
          programLabel: String(line.Description ?? '').trim() || undefined,
        });
      }
    }
  }

  return normalized;
}

async function fetchIncomeSince(sinceDate) {
  log('log', `Polling QBO income since ${sinceDate}`);

  const [salesReceipts, payments, invoices, deposits] = await Promise.all([
    qboQueryAll('SalesReceipt', `TxnDate >= '${sinceDate}'`),
    qboQueryAll('Payment', `TxnDate >= '${sinceDate}'`),
    qboQueryAll('Invoice', `TxnDate >= '${sinceDate}'`),
    fetchDepositIncome(sinceDate),
  ]);

  /** @type {import('./qbo-income-types.mjs').NormalizedIncomeTxn[]} */
  const income = [];

  for (const sr of salesReceipts) {
    const txn = await normalizeWithCustomer('SalesReceipt', sr);
    if (txn) income.push(txn);
  }

  for (const pay of payments) {
    const txn = await normalizeWithCustomer('Payment', pay);
    if (txn) income.push(txn);
  }

  for (const inv of invoices) {
    const balance = Number(inv.Balance ?? 0);
    const totalAmt = Number(inv.TotalAmt ?? 0);
    if (balance !== 0 || totalAmt <= 0) continue;
    const txn = await normalizeWithCustomer('Invoice', inv);
    if (txn) income.push(txn);
  }

  income.push(...deposits);

  income.sort((a, b) => {
    if (a.txnDate === b.txnDate) return a.qboKey.localeCompare(b.qboKey);
    return a.txnDate < b.txnDate ? -1 : 1;
  });

  return income;
}

async function runOnce(state) {
  const sinceDate = sinceDateFromState(state);
  const txns = await fetchIncomeSince(sinceDate);

  const summary = {
    scanned: txns.length,
    created: 0,
    duplicate: 0,
    skipped: 0,
    errors: 0,
  };

  for (const txn of txns) {
    if (state.processedKeys.has(txn.qboKey)) {
      summary.duplicate += 1;
      continue;
    }

    try {
      const result = await syncIncomeTransaction(txn);
      state.processedKeys.add(txn.qboKey);

      if (result.status === 'created') {
        summary.created += 1;
        log(
          'log',
          `Synced ${txn.qboKey} → donation ${result.donationItemId}` +
            (result.contactCreated ? ' (new contact)' : ''),
        );
      } else if (result.status === 'skipped') {
        summary.skipped += 1;
        log(
          'warn',
          `Skipped ${txn.qboKey}: ${result.reason} (${txn.customerName || 'unknown'})`,
        );
      } else {
        summary.duplicate += 1;
      }
    } catch (err) {
      summary.errors += 1;
      log('error', `Failed ${txn.qboKey}: ${err.message}`);
    }
  }

  state.lastRunAt = new Date().toISOString();
  await saveState(state);

  log('log', 'Sync complete', summary);
  return summary;
}

async function main() {
  if (!ENABLED) {
    log('log', 'QBO_INCOME_SYNC_ENABLED=false — exiting');
    process.exit(0);
  }

  if (!process.env.MONDAY_API_TOKEN) {
    throw new Error('Set MONDAY_API_TOKEN in environment');
  }

  log('log', `Starting watcher (interval ${INTERVAL_MS}ms, lookback ${LOOKBACK_DAYS}d)`);

  let state = await loadState();

  const runLoop = async () => {
    state = await loadState();
    return runOnce(state);
  };

  try {
    await runLoop();
  } catch (err) {
    log('error', `Run failed: ${err.message}`);
    process.exit(1);
  }

  if (process.argv.includes('--once')) {
    process.exit(0);
  }

  setInterval(async () => {
    try {
      await runLoop();
    } catch (err) {
      log('error', `Run failed: ${err.message}`);
    }
  }, INTERVAL_MS);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
