/**
 * crmRbacAcl.mjs — Thin Monday CRM mutation ACL for the local API proxy.
 *
 * Uses Portal Things Operators payload roles (not i58finance Admin roles).
 * Full permission matrix is enforced in the CRM UI/services; this blocks
 * BASIC-only / inactive operators from GraphQL mutations and file uploads.
 */

const WRITE_ROLES = new Set([
  'HR',
  'FINANCE',
  'COMMUNICATIONS',
  'ADMIN',
  'DEV',
]);

const BOOTSTRAP_DEVS = new Set([
  'henry@i58global.org',
  'lesvos@i58global.org',
]);

let cache = {
  expiresAt: 0,
  byEmail: new Map(),
};

function stripGraphqlComments(query) {
  return String(query || '')
    .replace(/#[^\n\r]*/g, ' ')
    .replace(/"""[\s\S]*?"""/g, ' ')
    .replace(/"([^"\\]|\\.)*"/g, ' ');
}

export function isGraphqlMutation(query) {
  return /\bmutation\b/i.test(stripGraphqlComments(query));
}

function normalizeEmail(email) {
  return String(email || '')
    .trim()
    .toLowerCase();
}

function parseRolesFromPayload(payloadJson) {
  try {
    const parsed = JSON.parse(payloadJson);
    const roles = Array.isArray(parsed?.roles) ? parsed.roles : [];
    return roles.map((r) => String(r).trim().toUpperCase());
  } catch {
    return ['BASIC'];
  }
}

function operatorMayWrite(record) {
  if (!record) return false;
  if (record.status === 'inactive') return false;
  return (record.roles || []).some((r) => WRITE_ROLES.has(r));
}

/**
 * @param {(query: string, variables?: Record<string, unknown>) => Promise<any>} mondayGraphql
 * @param {string | undefined} boardId
 * @param {string | undefined} email
 */
export async function assertOperatorMayMutate(
  mondayGraphql,
  boardId,
  email,
) {
  const normalized = normalizeEmail(email);
  if (!normalized) {
    // Local proxy without operator header: allow (token holder is typically DEV).
    return;
  }
  if (BOOTSTRAP_DEVS.has(normalized)) return;

  if (!boardId) {
    // Without Portal Things board id, skip server ACL (UI still enforces).
    return;
  }

  const roles = await loadOperatorRoles(mondayGraphql, boardId, normalized);
  if (!operatorMayWrite(roles)) {
    const err = new Error(
      'Permission denied. Reach out to the developer.',
    );
    err.statusCode = 403;
    err.code = 'CRM_PERMISSION_DENIED';
    throw err;
  }
}

async function loadOperatorRoles(mondayGraphql, boardId, email) {
  const now = Date.now();
  if (cache.expiresAt > now && cache.byEmail.has(email)) {
    return cache.byEmail.get(email);
  }

  const data = await mondayGraphql(
    `query ($ids: [ID!]!) {
      boards(ids: $ids) {
        groups { id title }
        items_page(limit: 500) {
          items {
            id
            name
            group { id title }
            column_values {
              id
              text
              value
              column { title }
            }
          }
        }
      }
    }`,
    { ids: [boardId] },
  );

  const board = data?.data?.boards?.[0] ?? data?.boards?.[0];
  const items = board?.items_page?.items ?? [];
  const byEmail = new Map();

  for (const item of items) {
    const groupTitle = String(item.group?.title || '').trim().toLowerCase();
    if (groupTitle !== 'operators') continue;
    const cols = item.column_values || [];
    const emailCol = cols.find(
      (c) => String(c.column?.title || '').trim().toLowerCase() === 'email',
    );
    const payloadCol = cols.find(
      (c) =>
        String(c.column?.title || '').trim().toLowerCase() === 'payload json',
    );
    const kindCol = cols.find(
      (c) => String(c.column?.title || '').trim().toLowerCase() === 'kind',
    );
    const kind = String(kindCol?.text || '').trim().toLowerCase();
    if (kind && kind !== 'operator') continue;

    const payloadRoles = payloadCol?.text
      ? parseRolesFromPayload(payloadCol.text)
      : parseRolesFromPayload(payloadCol?.value || '{}');
    // Payload may be in `value` as JSON-encoded string
    let roles = payloadRoles;
    let status = 'active';
    try {
      const raw = payloadCol?.text || payloadCol?.value;
      if (raw) {
        const parsed =
          typeof raw === 'string' && raw.trim().startsWith('{')
            ? JSON.parse(raw)
            : JSON.parse(JSON.parse(raw));
        if (Array.isArray(parsed?.roles)) {
          roles = parsed.roles.map((r) => String(r).trim().toUpperCase());
        }
        if (parsed?.status === 'inactive') status = 'inactive';
      }
    } catch {
      // keep roles from earlier parse
    }

    const itemEmail = normalizeEmail(
      emailCol?.text || item.name || '',
    );
    if (!itemEmail) continue;
    byEmail.set(itemEmail, { email: itemEmail, roles, status });
  }

  cache = { expiresAt: now + 60_000, byEmail };

  return (
    byEmail.get(email) || {
      email,
      roles: ['BASIC'],
      status: 'active',
    }
  );
}

export function permissionDeniedBody() {
  return {
    error: 'Permission denied. Reach out to the developer.',
    code: 'CRM_PERMISSION_DENIED',
  };
}
