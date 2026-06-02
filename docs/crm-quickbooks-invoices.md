# QuickBooks invoices (Invoice Paid step)

The **Invoice Paid** onboarding step can link to a QuickBooks Online invoice. Click the row to open live invoice data and edit line items.

## monday.com setup

Add a column on your Applications board:

| Default title | Purpose |
|---------------|---------|
| QuickBooks Invoice ID | QBO invoice id (numeric string from QuickBooks) |

Map a different title with `VITE_COL_QUICKBOOKS_INVOICE_ID` in `.env`.

The **Invoice Paid** status column still reflects your monday workflow; the modal shows **live** balance and paid state from QuickBooks on Refresh.

## Local development

1. Create a [QuickBooks Online](https://developer.intuit.com/) app and obtain OAuth tokens for your company.
2. Run the proxy (keeps secrets off the browser):

```bash
export QBO_ACCESS_TOKEN=your_token
export QBO_REALM_ID=your_realm_id
npm run quickbooks:proxy
```

3. In `.env`:

```bash
VITE_QUICKBOOKS_PROXY_URL=/api/quickbooks
```

(`vite.config.ts` proxies `/api/quickbooks` → `http://localhost:4041` in dev.)

4. Mock mode (`VITE_USE_MOCK_DATA=true`): use invoice ids like `mock-invoice-1042` (open) or `mock-invoice-1042-paid` (paid).

## Features

- **Invoice Paid row** — always clickable: opens existing invoice or **create** flow when no QuickBooks Invoice ID is set
- **Refresh** — reload invoice from QuickBooks (balance, paid status, lines)
- **View in QuickBooks** — opens that invoice directly (`https://app.qbo.intuit.com/app/invoice?txnId=…`)
- **Add line item** — append rows, then **Save to QuickBooks** (new lines omit QBO line `Id` so QuickBooks creates them)
- **Create invoice** — build lines in the modal, **Create invoice** (finds or creates a QBO customer by volunteer name); writes the new id to the monday **QuickBooks Invoice ID** column when live

## Production Board View

Deploy the proxy (e.g. small Node service, Cloud Run, Railway) and set `VITE_QUICKBOOKS_PROXY_URL` to its public URL in your built app environment. Do not put `QBO_ACCESS_TOKEN` in the Vite client bundle.

## Token refresh

The proxy uses a static access token for now. Phase 2: OAuth refresh token rotation in the proxy process.
