/**
 * crmRbacBoard.ts — Load/save CRM RBAC state on Portal Things.
 */

import {
  PORTAL_CONFIG_ITEM,
  PORTAL_ENTITY_TYPE,
  PORTAL_GROUP_AUDIT,
  PORTAL_GROUP_OPERATORS,
  PORTAL_KIND,
} from '../config/portalThingsMap';
import { DEFAULT_ROLE_PERMISSIONS } from '../permissions/defaults';
import { PERMISSION_CATALOG } from '../permissions/permissionKeys';
import { sanitizeSectionVisibilityOverrides } from '../permissions/resolveSectionPermission';
import { CRM_ROLE_META, CRM_ROLES, normalizeCrmRoles } from '../permissions/roles';
import type {
  AuditEventPayload,
  CrmOperatorRecord,
  RolePermissionsPayload,
} from '../permissions/types';
import { canEditPortalThings, useMockData } from '../config/boards';
import {
  getCrmPermissionsRuntime,
  requireCrmPermission,
} from '../permissions/crmPermissionsRuntime';
import {
  createPortalItem,
  findPortalItemByEntityId,
  findPortalItemByName,
  listPortalItems,
  resolvePortalBoardId,
  updatePortalItemPayload,
} from './portalThingsBoard';
import { setOperatorProfileOverlay } from './crmOperatorProfile';

const BOOTSTRAP_DEVS = [
  { email: 'henry@i58global.org', displayName: 'Henry' },
  { email: 'lesvos@i58global.org', displayName: 'Lesvos' },
] as const;

/** Monday Project allowlist — seeded as BASIC (except DEV bootstrap above). */
const ALLOWLIST_BASIC_OPERATORS = [
  { email: 'shane@i58global.org', displayName: 'Shane' },
  { email: 'bweiler@i58global.org', displayName: 'B Weiler' },
  { email: 'info@i58global.org', displayName: 'Info' },
  { email: 'nbyler@i58global.org', displayName: 'N Byler' },
] as const;

function defaultRolePermissionsPayload(): RolePermissionsPayload {
  return {
    version: 1,
    roles: CRM_ROLES.map((name) => ({
      name,
      displayName: CRM_ROLE_META[name].displayName,
      description: CRM_ROLE_META[name].description,
      system: true as const,
    })),
    permissions: PERMISSION_CATALOG,
    rolePermissions: { ...DEFAULT_ROLE_PERMISSIONS },
    sectionVisibilityOverrides: {},
    updatedAt: new Date().toISOString(),
  };
}

function normalizeRolePermissionsPayload(
  parsed: RolePermissionsPayload,
): RolePermissionsPayload {
  return {
    ...parsed,
    rolePermissions: {
      ...parsed.rolePermissions,
      DEV: [...DEFAULT_ROLE_PERMISSIONS.DEV],
    },
    sectionVisibilityOverrides: sanitizeSectionVisibilityOverrides(
      parsed.sectionVisibilityOverrides,
    ),
  };
}

export async function loadRolePermissionsPayload(): Promise<RolePermissionsPayload> {
  if (useMockData()) return defaultRolePermissionsPayload();
  const boardId = await resolvePortalBoardId();
  if (!boardId) return defaultRolePermissionsPayload();

  const item =
    (await findPortalItemByName(PORTAL_CONFIG_ITEM.rolePermissions)) ??
    (await findPortalItemByEntityId(
      PORTAL_KIND.rolePermissions,
      PORTAL_KIND.rolePermissions,
    ));

  if (!item?.payloadJson) return defaultRolePermissionsPayload();
  try {
    const parsed = JSON.parse(item.payloadJson) as RolePermissionsPayload;
    if (!parsed?.rolePermissions || !parsed.permissions) {
      return defaultRolePermissionsPayload();
    }
    return normalizeRolePermissionsPayload(parsed);
  } catch {
    return defaultRolePermissionsPayload();
  }
}

export async function saveRolePermissionsPayload(
  payload: RolePermissionsPayload,
): Promise<void> {
  requireCrmPermission('settings.permissions.manage');
  if (useMockData() || !canEditPortalThings()) {
    throw new Error('Portal Things is not writable.');
  }
  const next: RolePermissionsPayload = {
    ...payload,
    version: 1,
    rolePermissions: {
      ...payload.rolePermissions,
      DEV: [...DEFAULT_ROLE_PERMISSIONS.DEV],
    },
    sectionVisibilityOverrides: sanitizeSectionVisibilityOverrides(
      payload.sectionVisibilityOverrides,
    ),
    updatedAt: new Date().toISOString(),
  };
  const existing = await findPortalItemByName(PORTAL_CONFIG_ITEM.rolePermissions);
  const json = JSON.stringify(next);
  if (existing) {
    await updatePortalItemPayload(existing.id, json, {
      name: PORTAL_CONFIG_ITEM.rolePermissions,
    });
    return;
  }
  await createPortalItem({
    name: PORTAL_CONFIG_ITEM.rolePermissions,
    groupTitle: 'Config',
    kind: PORTAL_KIND.rolePermissions,
    entityType: PORTAL_ENTITY_TYPE.config,
    entityId: PORTAL_KIND.rolePermissions,
    payloadJson: json,
  });
}

function parseOperator(item: {
  id: string;
  name: string;
  email?: string;
  entityId?: string;
  payloadJson?: string;
}): CrmOperatorRecord | null {
  try {
    if (item.payloadJson) {
      const parsed = JSON.parse(item.payloadJson) as CrmOperatorRecord;
      const email = (parsed.email || item.email || item.entityId || '')
        .trim()
        .toLowerCase();
      if (!email) return null;
      return {
        email,
        displayName: parsed.displayName || item.name || email,
        roles: normalizeCrmRoles(parsed.roles),
        status: parsed.status === 'inactive' ? 'inactive' : 'active',
        photoUrl: parsed.photoUrl,
        createdAt: parsed.createdAt,
        updatedAt: parsed.updatedAt,
      };
    }
  } catch {
    // fall through
  }
  const email = (item.email || item.entityId || '').trim().toLowerCase();
  if (!email) return null;
  return {
    email,
    displayName: item.name || email,
    roles: ['BASIC'],
    status: 'active',
  };
}

export async function listOperators(): Promise<CrmOperatorRecord[]> {
  if (useMockData()) {
    return [
      ...BOOTSTRAP_DEVS.map((d) => ({
        email: d.email,
        displayName: d.displayName,
        roles: normalizeCrmRoles(['BASIC', 'DEV']),
        status: 'active' as const,
      })),
      ...ALLOWLIST_BASIC_OPERATORS.map((d) => ({
        email: d.email,
        displayName: d.displayName,
        roles: normalizeCrmRoles(['BASIC']),
        status: 'active' as const,
      })),
    ].sort((a, b) => a.email.localeCompare(b.email));
  }
  const items = await listPortalItems({
    groupTitle: PORTAL_GROUP_OPERATORS,
    kind: PORTAL_KIND.operator,
  });
  const out: CrmOperatorRecord[] = [];
  for (const item of items) {
    const op = parseOperator(item);
    if (op) out.push(op);
  }
  return out.sort((a, b) => a.email.localeCompare(b.email));
}

export async function getOperatorByEmail(
  email: string,
): Promise<CrmOperatorRecord | null> {
  const target = email.trim().toLowerCase();
  if (!target) return null;
  const all = await listOperators();
  return all.find((o) => o.email === target) ?? null;
}

export async function upsertOperator(
  operator: CrmOperatorRecord,
  options?: { skipPermissionCheck?: boolean; isCreate?: boolean },
): Promise<CrmOperatorRecord> {
  if (!options?.skipPermissionCheck) {
    requireCrmPermission(
      options?.isCreate ? 'users.create' : 'users.edit',
    );
  }
  if (useMockData()) return operator;
  if (!canEditPortalThings()) {
    throw new Error('Portal Things is not writable.');
  }
  const email = operator.email.trim().toLowerCase();
  if (!email.includes('@')) {
    throw new Error('A valid email address is required.');
  }
  const record: CrmOperatorRecord = {
    ...operator,
    email,
    roles: normalizeCrmRoles(operator.roles),
    status: operator.status === 'inactive' ? 'inactive' : 'active',
    updatedAt: new Date().toISOString(),
    createdAt: operator.createdAt || new Date().toISOString(),
  };
  const existing = await findPortalItemByEntityId(email, PORTAL_KIND.operator);
  if (options?.isCreate && existing) {
    throw new Error('An operator with this email already exists.');
  }
  const payloadJson = JSON.stringify(record);
  if (existing) {
    await updatePortalItemPayload(existing.id, payloadJson, {
      name: record.displayName || email,
      email,
    });
  } else {
    if (!options?.skipPermissionCheck && !options?.isCreate) {
      // Updates that create a missing item still need create rights.
      requireCrmPermission('users.create');
    }
    await createPortalItem({
      name: record.displayName || email,
      groupTitle: PORTAL_GROUP_OPERATORS,
      kind: PORTAL_KIND.operator,
      entityType: PORTAL_ENTITY_TYPE.operator,
      entityId: email,
      payloadJson,
      email,
    });
  }
  return record;
}

/** Update the signed-in operator's display name / avatar (self-service). */
export async function updateOwnOperatorProfile(input: {
  displayName: string;
  photoUrl?: string | null;
}): Promise<CrmOperatorRecord> {
  requireCrmPermission('contacts.profile.self_edit');
  const email = getCrmPermissionsRuntime().email?.trim().toLowerCase();
  if (!email) {
    throw new Error('No signed-in operator email.');
  }

  const existing = await getOperatorByEmail(email);
  const displayName =
    input.displayName.trim() ||
    existing?.displayName ||
    email.split('@')[0] ||
    email;
  const photoUrl =
    input.photoUrl === null
      ? undefined
      : input.photoUrl?.trim() || existing?.photoUrl;

  const record: CrmOperatorRecord = {
    email,
    displayName,
    photoUrl,
    roles: existing?.roles ?? ['BASIC'],
    status: existing?.status ?? 'active',
    createdAt: existing?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  setOperatorProfileOverlay({
    email,
    displayName: record.displayName,
    photoUrl: record.photoUrl,
  });

  if (useMockData() || !canEditPortalThings()) {
    return record;
  }

  return upsertOperator(record, { skipPermissionCheck: true });
}

/** Invite / provision a new CRM operator on Portal Things. */
export async function inviteOperator(input: {
  email: string;
  displayName: string;
  roles: string[];
}): Promise<CrmOperatorRecord> {
  const email = input.email.trim().toLowerCase();
  const displayName =
    input.displayName.trim() || email.split('@')[0] || email;
  return upsertOperator(
    {
      email,
      displayName,
      roles: normalizeCrmRoles(input.roles),
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    { isCreate: true },
  );
}

/** Ensure bootstrap DEV operators exist; auto-provision BASIC for unknown emails. */
export async function ensureOperatorForEmail(
  email: string,
  displayName?: string,
): Promise<CrmOperatorRecord> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) {
    return {
      email: 'unknown',
      displayName: displayName || 'Coordinator',
      roles: ['BASIC'],
      status: 'active',
    };
  }

  const existing = await getOperatorByEmail(normalized);
  if (existing) return existing;

  const bootstrap = BOOTSTRAP_DEVS.find((d) => d.email === normalized);
  const initial: CrmOperatorRecord = {
    email: normalized,
    displayName: displayName || bootstrap?.displayName || normalized.split('@')[0],
    roles: bootstrap ? ['BASIC', 'DEV'] : ['BASIC'],
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  if (useMockData() || !canEditPortalThings()) return initial;
  return upsertOperator(initial, { skipPermissionCheck: true });
}

export async function listActiveDevEmails(): Promise<string[]> {
  const ops = await listOperators();
  return ops
    .filter((o) => o.status === 'active' && o.roles.includes('DEV'))
    .map((o) => o.email);
}

export async function appendAuditEvent(
  event: Omit<AuditEventPayload, 'timestamp'> & { timestamp?: string },
): Promise<void> {
  if (useMockData() || !canEditPortalThings()) return;
  const boardId = await resolvePortalBoardId();
  if (!boardId) return;

  const payload: AuditEventPayload = {
    ...event,
    timestamp: event.timestamp || new Date().toISOString(),
  };
  const name = `${payload.action} · ${payload.targetEmail || payload.targetId || 'system'} · ${payload.timestamp.slice(0, 19)}`;
  try {
    await createPortalItem({
      name: name.slice(0, 120),
      groupTitle: PORTAL_GROUP_AUDIT,
      kind: PORTAL_KIND.auditEvent,
      entityType: PORTAL_ENTITY_TYPE.audit,
      entityId: `${payload.action}-${payload.timestamp}-${Math.random().toString(36).slice(2, 8)}`,
      payloadJson: JSON.stringify(payload),
      email: payload.actorEmail,
    });
  } catch (err) {
    console.warn(
      'CRM audit append failed:',
      err instanceof Error ? err.message : err,
    );
  }
}

export async function listAuditEvents(limit = 200): Promise<AuditEventPayload[]> {
  if (useMockData()) return [];
  const items = await listPortalItems({
    groupTitle: PORTAL_GROUP_AUDIT,
    kind: PORTAL_KIND.auditEvent,
  });
  const events: AuditEventPayload[] = [];
  for (const item of items) {
    try {
      if (!item.payloadJson) continue;
      events.push(JSON.parse(item.payloadJson) as AuditEventPayload);
    } catch {
      // skip
    }
  }
  return events
    .sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1))
    .slice(0, limit);
}

export { BOOTSTRAP_DEVS };
