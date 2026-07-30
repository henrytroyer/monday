/**
 * portalOnboardingSync.ts — Persist onboarding pipelines on Portal Things.
 * localStorage remains a cache; Monday Payload JSON is SoT when the board is configured.
 */

import { canEditPortalThings, useMockData } from '../config/boards';
import {
  PORTAL_ENTITY_TYPE,
  PORTAL_GROUP_ONBOARDING,
  PORTAL_KIND,
} from '../config/portalThingsMap';
import type { OnboardingPipeline } from '../types/volunteer';
import {
  createPortalItem,
  findPortalItemByEntityId,
  resolvePortalBoardId,
  updatePortalItemPayload,
} from './portalThingsBoard';
import {
  loadPipeline as loadLocalPipeline,
  savePipeline as saveLocalPipeline,
} from './onboardingPipelineStorage';

function isLongtermVolunteerId(_volunteerId: string, hint?: boolean): boolean {
  return Boolean(hint);
}

export async function loadPipelineFromPortal(
  volunteerId: string,
): Promise<OnboardingPipeline | null> {
  if (useMockData()) return loadLocalPipeline(volunteerId) ?? null;

  const boardId = await resolvePortalBoardId();
  if (!boardId) return loadLocalPipeline(volunteerId) ?? null;

  try {
    const item = await findPortalItemByEntityId(
      volunteerId,
      PORTAL_KIND.onboarding,
    );
    if (!item?.payloadJson) return loadLocalPipeline(volunteerId) ?? null;
    const parsed = JSON.parse(item.payloadJson) as OnboardingPipeline;
    if (!parsed?.volunteerId || !Array.isArray(parsed.steps)) {
      return loadLocalPipeline(volunteerId) ?? null;
    }
    // Mirror into local cache for offline UI (do not echo back to Monday)
    saveLocalPipeline(parsed, { skipPortalSync: true });
    return parsed;
  } catch {
    return loadLocalPipeline(volunteerId) ?? null;
  }
}

export async function savePipelineToPortal(
  pipeline: OnboardingPipeline,
  options?: {
    actorName?: string;
    volunteerName?: string;
    longterm?: boolean;
  },
): Promise<OnboardingPipeline> {
  // Local cache is already written by savePipeline(); this only syncs Monday.
  if (useMockData() || !canEditPortalThings()) return pipeline;
  const boardId = await resolvePortalBoardId();
  if (!boardId) return pipeline;

  const payloadJson = JSON.stringify(pipeline);
  const name =
    options?.volunteerName?.trim() ||
    `Onboarding ${pipeline.volunteerId}`;
  const entityType = isLongtermVolunteerId(
    pipeline.volunteerId,
    options?.longterm,
  )
    ? PORTAL_ENTITY_TYPE.longtermApplication
    : PORTAL_ENTITY_TYPE.application;

  try {
    const existing = await findPortalItemByEntityId(
      pipeline.volunteerId,
      PORTAL_KIND.onboarding,
    );
    if (existing) {
      await updatePortalItemPayload(existing.id, payloadJson, {
        name,
        linkedApplicationId: pipeline.volunteerId,
      });
    } else {
      await createPortalItem({
        name,
        groupTitle: PORTAL_GROUP_ONBOARDING,
        kind: PORTAL_KIND.onboarding,
        entityType,
        entityId: pipeline.volunteerId,
        payloadJson,
        linkedApplicationId: pipeline.volunteerId,
      });
    }
  } catch (err) {
    console.warn(
      'Portal Things onboarding sync failed:',
      err instanceof Error ? err.message : err,
    );
  }

  return pipeline;
}
