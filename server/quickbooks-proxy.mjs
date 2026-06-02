/**
 * QuickBooks Online API proxy — keeps OAuth tokens server-side.
 *
 * Env: QBO_ACCESS_TOKEN, QBO_REALM_ID, PORT (default 4041)
 * Run: npm run quickbooks:proxy
 *
 * CRM: VITE_QUICKBOOKS_PROXY_URL=http://localhost:4041
 */

import http from 'node:http';
import { URL } from 'node:url';

const PORT = Number(process.env.PORT || 4041);
const TOKEN = process.env.QBO_ACCESS_TOKEN;
const REALM_ID = process.env.QBO_REALM_ID;
const BASE = REALM_ID
  ? `https://quickbooks.api.intuit.com/v3/company/${REALM_ID}`
  : '';

function sendJson(res, status, data) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  res.end(JSON.stringify(data));
}

async function readJsonBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString() || '{}');
}

async function qboFetch(path, options = {}) {
  if (!TOKEN || !REALM_ID) {
    throw new Error('Set QBO_ACCESS_TOKEN and QBO_REALM_ID in environment');
  }
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(text || `QBO ${res.status}`);
  }
  return text ? JSON.parse(text) : {};
}

function quickbooksInvoiceUrl(invoiceId) {
  return `https://app.qbo.intuit.com/app/invoice?txnId=${encodeURIComponent(invoiceId)}`;
}

function isNewLineId(id) {
  const value = String(id ?? '');
  return value.startsWith('new-') || !/^\d+$/.test(value);
}

function buildSalesLine(line, index) {
  const quantity = Number(line.quantity ?? 1);
  const unitPrice = Number(line.unitPrice ?? 0);
  const amount = Math.round(quantity * unitPrice * 100) / 100;
  const row = {
    LineNum: index + 1,
    Description: String(line.description ?? 'Line item'),
    Amount: amount,
    DetailType: 'SalesItemLineDetail',
    SalesItemLineDetail: {
      Qty: quantity,
      UnitPrice: unitPrice,
    },
  };
  if (!isNewLineId(line.id)) {
    row.Id = String(line.id);
  }
  return row;
}

function mapInvoice(raw) {
  const inv = raw.Invoice ?? raw;
  const lines = (inv.Line ?? []).filter(
    (l) => l.DetailType === 'SalesItemLineDetail',
  );
  const lineItems = lines.map((line, index) => {
    const detail = line.SalesItemLineDetail ?? {};
    const qty = Number(detail.Qty ?? 1);
    const unitPrice = Number(detail.UnitPrice ?? 0);
    return {
      id: String(line.Id ?? index + 1),
      lineNum: Number(line.LineNum ?? index + 1),
      description: String(
        line.Description ?? detail.ItemRef?.name ?? 'Line item',
      ),
      quantity: qty,
      unitPrice: unitPrice,
      amount: Number(line.Amount ?? qty * unitPrice),
    };
  });
  const balance = Number(inv.Balance ?? 0);
  const totalAmt = Number(inv.TotalAmt ?? 0);
  const id = String(inv.Id);
  return {
    id,
    docNumber: String(inv.DocNumber ?? inv.Id),
    customerName: String(inv.CustomerRef?.name ?? 'Customer'),
    txnDate: String(inv.TxnDate ?? ''),
    dueDate: String(inv.DueDate ?? ''),
    totalAmt,
    balance,
    currency: String(inv.CurrencyRef?.value ?? 'USD'),
    isPaid: balance === 0 && totalAmt > 0,
    statusLabel:
      balance === 0 && totalAmt > 0
        ? 'Paid in full'
        : balance > 0
          ? 'Open — balance due'
          : 'Draft / no balance',
    lineItems,
    quickbooksUrl: quickbooksInvoiceUrl(id),
  };
}

async function findOrCreateCustomer(displayName) {
  const name = String(displayName ?? 'Customer').trim() || 'Customer';
  const escaped = name.replace(/'/g, "\\'");
  const query = encodeURIComponent(
    `select * from Customer where DisplayName='${escaped}'`,
  );
  const data = await qboFetch(`/query?query=${query}`);
  const existing = data.QueryResponse?.Customer?.[0];
  if (existing?.Id) {
    return String(existing.Id);
  }

  const created = await qboFetch('/customer', {
    method: 'POST',
    body: JSON.stringify({ DisplayName: name }),
  });
  const customer = created.Customer ?? created;
  return String(customer.Id);
}

async function handleGetInvoice(invoiceId) {
  const data = await qboFetch(`/invoice/${invoiceId}`);
  return mapInvoice(data);
}

async function handlePatchLineItems(invoiceId, lineItems) {
  const current = await qboFetch(`/invoice/${invoiceId}`);
  const inv = current.Invoice ?? current;
  const syncToken = inv.SyncToken;
  const newLines = (lineItems ?? []).map((line, index) =>
    buildSalesLine(line, index),
  );
  const payload = {
    Id: inv.Id,
    SyncToken: syncToken,
    sparse: true,
    Line: newLines,
  };
  const updated = await qboFetch(`/invoice?operation=update`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return mapInvoice(updated);
}

function mapFinancialRecords(invoices, payments) {
  const records = [];

  for (const inv of invoices) {
    const id = String(inv.Id);
    const balance = Number(inv.Balance ?? 0);
    const totalAmt = Number(inv.TotalAmt ?? 0);
    const line = (inv.Line ?? []).find(
      (l) => l.DetailType === 'SalesItemLineDetail',
    );
    records.push({
      id: `inv-${id}`,
      kind: 'invoice',
      date: String(inv.TxnDate ?? ''),
      amount: totalAmt,
      currency: String(inv.CurrencyRef?.value ?? 'USD'),
      description: String(
        line?.Description ?? inv.CustomerMemo?.value ?? `Invoice #${inv.DocNumber ?? id}`,
      ),
      quickbooksInvoiceId: id,
      quickbooksUrl: quickbooksInvoiceUrl(id),
      projectLabel: String(line?.Description ?? inv.PrivateNote ?? '').trim() || undefined,
      isPaid: balance === 0 && totalAmt > 0,
    });
  }

  for (const pay of payments) {
    const id = String(pay.Id);
    records.push({
      id: `pay-${id}`,
      kind: 'payment',
      date: String(pay.TxnDate ?? ''),
      amount: Number(pay.TotalAmt ?? 0),
      currency: String(pay.CurrencyRef?.value ?? 'USD'),
      description: String(pay.PrivateNote ?? pay.PaymentRefNum ?? 'Payment'),
      isPaid: true,
    });
  }

  records.sort((a, b) => (a.date < b.date ? 1 : -1));
  return records;
}

async function findCustomerByEmail(email) {
  const escaped = String(email).replace(/'/g, "\\'");
  const query = encodeURIComponent(
    `select * from Customer where PrimaryEmailAddr = '${escaped}'`,
  );
  let data = await qboFetch(`/query?query=${query}`);
  let customer = data.QueryResponse?.Customer?.[0];
  if (customer?.Id) return customer;

  const query2 = encodeURIComponent(
    `select * from Customer where DisplayName LIKE '%${escaped.split('@')[0]}%'`,
  );
  data = await qboFetch(`/query?query=${query2}`);
  customer = data.QueryResponse?.Customer?.[0];
  return customer ?? null;
}

async function fetchCustomerFinancials(customerId) {
  const invQuery = encodeURIComponent(
    `select * from Invoice where CustomerRef = '${customerId}'`,
  );
  const payQuery = encodeURIComponent(
    `select * from Payment where CustomerRef = '${customerId}'`,
  );
  const invData = await qboFetch(`/query?query=${invQuery}`);
  const payData = await qboFetch(`/query?query=${payQuery}`);
  const invoices = invData.QueryResponse?.Invoice ?? [];
  const payments = payData.QueryResponse?.Payment ?? [];
  return mapFinancialRecords(invoices, payments);
}

async function handleCreateInvoice(body) {
  const customerName = String(body.customerName ?? 'Customer').trim();
  const lineItems = body.lineItems ?? [];
  const customerId = await findOrCreateCustomer(customerName);
  const lines = (
    lineItems.length > 0
      ? lineItems
      : [{ description: 'Program fee', quantity: 1, unitPrice: 0 }]
  ).map((line, index) => buildSalesLine({ ...line, id: `new-${index}` }, index));

  const payload = {
    CustomerRef: { value: customerId },
    Line: lines,
  };

  const created = await qboFetch('/invoice', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return mapInvoice(created);
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    sendJson(res, 204, {});
    return;
  }

  try {
    const url = new URL(req.url, `http://localhost:${PORT}`);

    if (
      req.method === 'GET' &&
      url.pathname === '/customers/by-email/financials'
    ) {
      const email = url.searchParams.get('email');
      if (!email) {
        sendJson(res, 400, { error: 'email query param required' });
        return;
      }
      const customer = await findCustomerByEmail(email);
      if (!customer?.Id) {
        sendJson(res, 200, []);
        return;
      }
      const records = await fetchCustomerFinancials(String(customer.Id));
      sendJson(res, 200, records);
      return;
    }

    const customerFinancialsMatch = url.pathname.match(
      /^\/customers\/([^/]+)\/financials$/,
    );
    if (req.method === 'GET' && customerFinancialsMatch) {
      const customerId = decodeURIComponent(customerFinancialsMatch[1]);
      const records = await fetchCustomerFinancials(customerId);
      sendJson(res, 200, records);
      return;
    }

    if (req.method === 'POST' && url.pathname === '/invoices') {
      const body = await readJsonBody(req);
      const invoice = await handleCreateInvoice(body);
      sendJson(res, 201, invoice);
      return;
    }

    const match = url.pathname.match(/^\/invoices\/([^/]+)(\/line-items)?$/);
    if (!match) {
      sendJson(res, 404, { error: 'Not found' });
      return;
    }

    const invoiceId = decodeURIComponent(match[1]);
    const isLineItems = Boolean(match[2]);

    if (req.method === 'GET' && !isLineItems) {
      const invoice = await handleGetInvoice(invoiceId);
      sendJson(res, 200, invoice);
      return;
    }

    if (req.method === 'PATCH' && isLineItems) {
      const body = await readJsonBody(req);
      const invoice = await handlePatchLineItems(invoiceId, body.lineItems ?? []);
      sendJson(res, 200, invoice);
      return;
    }

    sendJson(res, 405, { error: 'Method not allowed' });
  } catch (err) {
    sendJson(res, 500, {
      error: err instanceof Error ? err.message : 'Server error',
    });
  }
});

server.listen(PORT, () => {
  console.log(`QuickBooks proxy http://localhost:${PORT}`);
  if (!TOKEN || !REALM_ID) {
    console.warn('Warning: QBO_ACCESS_TOKEN and QBO_REALM_ID not set');
  }
});
