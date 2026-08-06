/**
 * crmAuditBoard.ts — Append / list CRM audit events on Portal Things.
 */

import {
  PORTAL_ENTITY_TYPE,
  PORTAL_GROUP_AUDIT,
  PORTAL_KIND,
} from '../config/portalThingsMap';
import { canEditPortalThings, useMockData } from '../config/boards';
import type { AuditEventPayload } from '../types/crmAudit';
import {
  createPortalItem,
  listPortalItems,
  resolvePortalBoardId,
} from './portalThingsBoard';

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
