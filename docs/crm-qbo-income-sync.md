# QuickBooks income sync (read-only QBO → Monday)

The **QBO income watcher** polls QuickBooks Online for customer income and mirrors each transaction on your **Monday Donations** board, linked to the matching **Contact**. It never writes to QuickBooks.

## Flow

1. `npm run qbo:watch-income` polls QBO (GET `/query` only).
2. For each income transaction, resolve the QBO Customer email.
3. Find a Contact on the Contacts board by email — or create one with the **Donor** tag.
4. Create a Donation item (deduped by `QBO:{TxnType}:{TxnId}`).
5. Append the donation to the Contact’s `link_to_donations` board relation.
6. The portal reads gifts from the Monday Donations board (no live QBO fetch when sync is enabled).

## Transaction types

| QBO entity | Included when |
|------------|----------------|
| `SalesReceipt` | Always (direct gifts/sales) |
| `Payment` | Always |
| `Invoice` | `Balance = 0` and `TotalAmt > 0` (paid) |
| `Deposit` | Line has a Customer entity (best-effort) |

Transactions without a customer email are skipped and logged for manual review.

## Setup

### 1. Server environment

Add to `.env` (server-side — not exposed to the Vite client):

```bash
QBO_ACCESS_TOKEN=...
QBO_REALM_ID=...
MONDAY_API_TOKEN=...

QBO_INCOME_SYNC_ENABLED=true
QBO_INCOME_SYNC_INTERVAL_MS=300000
QBO_INCOME_LOOKBACK_DAYS=7

CONTACTS_BOARD_ID=2463183745
DONATIONS_BOARD_ID=2473175689
CONTACT_COL_DONATIONS_LINK_ID=link_to_donations
```

Board IDs can also use the `VITE_` variants already in your CRM `.env`.

### 2. Portal (disable live QBO merge)

When the watcher is active, enable Monday-only donation reads in the portal:

```bash
VITE_QBO_INCOME_SYNC_ENABLED=true
VITE_DONATIONS_BOARD_ID=2473175689
VITE_CONTACT_COL_DONATIONS_LINK_ID=link_to_donations
```

### 3. Run the watcher

```bash
npm run qbo:watch-income
```

One-shot catch-up (no interval loop):

```bash
npm run qbo:sync-income-once
```

Cursor state is stored in `server/.qbo-income-sync-state.json` (gitignored).

## Dedupe rules

1. **Primary:** `QBO:{TxnType}:{TxnId}` in Donation **Details** (or optional `VITE_DONATION_COL_QBO_TXN_ID` column).
2. **Secondary:** same donor email + amount + date within 24 hours.
3. **Contacts:** lookup by email before create — never duplicate contacts for the same email.

## QuickBooks safety

- The watcher uses **GET only** — no POST, PATCH, or DELETE to QBO.
- Application invoice create/edit via `npm run quickbooks:proxy` is unchanged and unrelated to income sync.
- OAuth token refresh is manual for v1 — rotate `QBO_ACCESS_TOKEN` when it expires.

## Verification

1. Run `npm run qbo:sync-income-once` with a valid QBO token.
2. Confirm a Donations board row for a known donor.
3. Confirm `link_to_donations` on the Contact item.
4. New donor (no contact): Contacts item created with Donor tag.
5. Open contact in portal → Donations panel shows the synced gift.
6. Check watcher logs — no QBO write calls.

## Out of scope (v1)

- Auto void/delete in Monday when QBO txn is voided
- Mailchimp sync for auto-created donors
- OAuth token refresh automation

See also [crm-contacts.md](./crm-contacts.md) (Donations section).
