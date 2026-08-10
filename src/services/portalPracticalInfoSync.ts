/**
 * portalPracticalInfoSync.ts — Persist on-field practical info on Portal Things.
 * localStorage remains a cache; Monday Payload JSON is SoT when the board is configured.
 */

import { canEditPortalThings, useMockData } from '../config/boards';
import {
  PORTAL_CONFIG_ITEM,
  PORTAL_ENTITY_TYPE,
  PORTAL_GROUP_FIELD_OPS,
  PORTAL_GROUP_ONBOARDING,
  PORTAL_KIND,
} from '../config/portalThingsMap';
import type {
  LongtermPracticalInfo,
  PortalSettingsPayload,
} from '../types/longtermPracticalInfo';
import {
  emptyPracticalInfo,
  isPresetHousing,
  mergeHousingOptions,
  normalizeCustomHousingLabel,
  normalizeCustomHousingOptions,
  parsePortalSettingsPayload,
  parsePracticalInfo,
} from '../utils/longtermPracticalInfo';
import {
  loadCustomHousingOptionsLocal,
  loadPracticalInfo,
  saveCustomHousingOptionsLocal,
  savePracticalInfoLocal,
} from './longtermPracticalInfoStorage';
import {
  createPortalItem,
  ensurePortalConfigItem,
  findPortalItemByEntityId,
  findPortalItemByName,
  resolvePortalBoardId,
  resolvePortalGroupId,
  updatePortalItemPayload,
} from './portalThingsBoard';

async function resolvePracticalInfoGroupTitle(): Promise<string> {
  const fieldOpsId = await resolvePortalGroupId(PORTAL_GROUP_FIELD_OPS);
  if (fieldOpsId) return PORTAL_GROUP_FIELD_OPS;
  return PORTAL_GROUP_ONBOARDING;
}

export async function loadPracticalInfoFromPortal(
  volunteerId: string,
): Promise<LongtermPracticalInfo> {
  const local = loadPracticalInfo(volunteerId);

  if (useMockData()) {
    return local ?? emptyPracticalInfo(volunteerId);
  }

  const boardId = await resolvePortalBoardId();
  if (!boardId) {
    return local ?? emptyPracticalInfo(volunteerId);
  }

  try {
    const item = await findPortalItemByEntityId(
      volunteerId,
      PORTAL_KIND.practicalInfo,
    );
    if (!item?.payloadJson) {
      return local ?? emptyPracticalInfo(volunteerId);
    }
    const parsed = parsePracticalInfo(
      JSON.parse(item.payloadJson) as unknown,
      volunteerId,
    );
    if (!parsed) {
      return local ?? emptyPracticalInfo(volunteerId);
    }
    savePracticalInfoLocal(parsed);
    return parsed;
  } catch {
    return local ?? emptyPracticalInfo(volunteerId);
  }
}

export async function savePracticalInfoToPortal(
  info: LongtermPracticalInfo,
  options?: { volunteerName?: string },
): Promise<LongtermPracticalInfo> {
  const next: LongtermPracticalInfo = {
    ...info,
    updatedAt: new Date().toISOString(),
  };
  savePracticalInfoLocal(next);

  if (useMockData() || !canEditPortalThings()) return next;
  const boardId = await resolvePortalBoardId();
  if (!boardId) return next;

  const payloadJson = JSON.stringify(next);
  const name =
    options?.volunteerName?.trim() ||
    `Practical info ${next.volunteerId}`;

  try {
    const existing = await findPortalItemByEntityId(
      next.volunteerId,
      PORTAL_KIND.practicalInfo,
    );
    if (existing) {
      await updatePortalItemPayload(existing.id, payloadJson, {
        name,
        linkedApplicationId: next.volunteerId,
      });
    } else {
      const groupTitle = await resolvePracticalInfoGroupTitle();
      await createPortalItem({
        name,
        groupTitle,
        kind: PORTAL_KIND.practicalInfo,
        entityType: PORTAL_ENTITY_TYPE.longtermApplication,
        entityId: next.volunteerId,
        payloadJson,
        linkedApplicationId: next.volunteerId,
      });
    }
  } catch (err) {
    console.warn(
      'Portal Things practical info sync failed:',
      err instanceof Error ? err.message : err,
    );
  }

  return next;
}

async function ensurePortalSettingsItemId(): Promise<string | null> {
  return ensurePortalConfigItem(
    PORTAL_CONFIG_ITEM.portalSettings,
    PORTAL_KIND.settings,
  );
}

export async function loadHousingOptionsFromPortal(): Promise<string[]> {
  const localCustom = loadCustomHousingOptionsLocal();

  if (useMockData()) {
    return mergeHousingOptions(localCustom);
  }

  const boardId = await resolvePortalBoardId();
  if (!boardId) {
    return mergeHousingOptions(localCustom);
  }

  try {
    const item =
      (await findPortalItemByName(PORTAL_CONFIG_ITEM.portalSettings)) ?? null;
    if (!item?.payloadJson) {
      return mergeHousingOptions(localCustom);
    }
    const settings = parsePortalSettingsPayload(
      JSON.parse(item.payloadJson) as unknown,
    );
    const custom = settings.longtermHousingOptions ?? [];
    saveCustomHousingOptionsLocal(custom);
    return mergeHousingOptions(custom);
  } catch {
    return mergeHousingOptions(localCustom);
  }
}

/** Persist a new custom housing label (no-op if preset or duplicate). */
export async function addCustomHousingOption(
  label: string,
): Promise<string[]> {
  const normalized = normalizeCustomHousingLabel(label);
  if (!normalized) {
    throw new Error('Housing location name is required.');
  }
  if (isPresetHousing(normalized)) {
    return loadHousingOptionsFromPortal();
  }

  const current = loadCustomHousingOptionsLocal();
  const exists = current.some(
    (o) => o.toLowerCase() === normalized.toLowerCase(),
  );
  const nextCustom = exists ? current : [...current, normalized];
  saveCustomHousingOptionsLocal(nextCustom);

  if (useMockData() || !canEditPortalThings()) {
    return mergeHousingOptions(nextCustom);
  }

  const boardId = await resolvePortalBoardId();
  if (!boardId) {
    return mergeHousingOptions(nextCustom);
  }

  try {
    const itemId = await ensurePortalSettingsItemId();
    if (!itemId) return mergeHousingOptions(nextCustom);

    const existing =
      (await findPortalItemByName(PORTAL_CONFIG_ITEM.portalSettings)) ?? null;
    let rawPayload: Record<string, unknown> = {};
    if (existing?.payloadJson) {
      try {
        const parsed = JSON.parse(existing.payloadJson) as unknown;
        if (parsed && typeof parsed === 'object') {
          rawPayload = { ...(parsed as Record<string, unknown>) };
        }
      } catch {
        rawPayload = {};
      }
    }

    const settings = parsePortalSettingsPayload(rawPayload);
    const mergedCustom = normalizeCustomHousingOptions([
      ...(settings.longtermHousingOptions ?? []),
      ...nextCustom,
    ]);

    const nextPayload: PortalSettingsPayload & Record<string, unknown> = {
      ...rawPayload,
      longtermHousingOptions: mergedCustom,
    };

    await updatePortalItemPayload(itemId, JSON.stringify(nextPayload));
    saveCustomHousingOptionsLocal(mergedCustom);
    return mergeHousingOptions(mergedCustom);
  } catch (err) {
    console.warn(
      'Portal Things housing options sync failed:',
      err instanceof Error ? err.message : err,
    );
    return mergeHousingOptions(nextCustom);
  }
}
