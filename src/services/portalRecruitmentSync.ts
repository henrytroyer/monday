/**
 * portalRecruitmentSync.ts — Persist recruitment prospects on Portal Things.
 */

import { canEditPortalThings, useMockData } from '../config/boards';
import {
  PORTAL_ENTITY_TYPE,
  PORTAL_GROUP_RECRUITMENT,
  PORTAL_KIND,
} from '../config/portalThingsMap';
import type { RecruitmentProspect } from '../types/recruitment';
import {
  createPortalItem,
  deletePortalItem,
  findPortalItemByEntityId,
  listPortalItems,
  resolvePortalBoardId,
  updatePortalItemPayload,
} from './portalThingsBoard';

interface ProspectPayload {
  prospect: RecruitmentProspect;
}

export async function listProspectsFromPortal(): Promise<RecruitmentProspect[]> {
  if (useMockData()) return [];
  const boardId = await resolvePortalBoardId();
  if (!boardId) return [];

  const items = await listPortalItems({
    groupTitle: PORTAL_GROUP_RECRUITMENT,
    kind: PORTAL_KIND.prospect,
  });

  const prospects: RecruitmentProspect[] = [];
  for (const item of items) {
    try {
      if (item.payloadJson) {
        const parsed = JSON.parse(item.payloadJson) as ProspectPayload;
        if (parsed?.prospect?.id) {
          prospects.push(parsed.prospect);
          continue;
        }
      }
      // Fallback from columns
      prospects.push({
        id: item.entityId || item.id,
        name: item.name,
        email: item.email ?? '',
        phone: item.phone ?? '',
        assignedUserId: null,
        assignedUserName: item.assignedTo ?? null,
        sourceContactId: item.sourceContactId ?? null,
        priorServiceTerms: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    } catch {
      // skip bad rows
    }
  }
  return prospects;
}

export async function upsertProspectOnPortal(
  prospect: RecruitmentProspect,
): Promise<void> {
  if (useMockData() || !canEditPortalThings()) return;
  const boardId = await resolvePortalBoardId();
  if (!boardId) return;

  const payloadJson = JSON.stringify({ prospect } satisfies ProspectPayload);
  const existing = await findPortalItemByEntityId(
    prospect.id,
    PORTAL_KIND.prospect,
  );

  try {
    if (existing) {
      await updatePortalItemPayload(existing.id, payloadJson, {
        name: prospect.name,
        email: prospect.email,
        phone: prospect.phone,
        assignedTo: prospect.assignedUserName ?? undefined,
        sourceContactId: prospect.sourceContactId ?? undefined,
        linkedContactId: prospect.sourceContactId ?? undefined,
      });
    } else {
      await createPortalItem({
        name: prospect.name.trim() || prospect.id,
        groupTitle: PORTAL_GROUP_RECRUITMENT,
        kind: PORTAL_KIND.prospect,
        entityType: PORTAL_ENTITY_TYPE.prospect,
        entityId: prospect.id,
        payloadJson,
        email: prospect.email,
        phone: prospect.phone,
        assignedTo: prospect.assignedUserName ?? undefined,
        sourceContactId: prospect.sourceContactId ?? undefined,
        linkedContactId: prospect.sourceContactId ?? undefined,
      });
    }
  } catch (err) {
    console.warn(
      'Portal Things recruitment sync failed:',
      err instanceof Error ? err.message : err,
    );
  }
}

export async function deleteProspectOnPortal(prospectId: string): Promise<void> {
  if (useMockData() || !canEditPortalThings()) return;
  const boardId = await resolvePortalBoardId();
  if (!boardId) return;

  try {
    const existing = await findPortalItemByEntityId(
      prospectId,
      PORTAL_KIND.prospect,
    );
    if (existing) await deletePortalItem(existing.id);
  } catch (err) {
    console.warn(
      'Portal Things prospect delete failed:',
      err instanceof Error ? err.message : err,
    );
  }
}
