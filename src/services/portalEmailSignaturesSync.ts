/**
 * portalEmailSignaturesSync.ts — Shared email signatures on Portal Things Config.
 */

import { canEditPortalThings, useMockData } from '../config/boards';
import type { EmailSignature } from '../types/emailCompose';
import {
  ensureEmailSignaturesOnPortal,
  resolvePortalBoardId,
  updatePortalItemPayload,
  findPortalItemByName,
} from './portalThingsBoard';
import { PORTAL_CONFIG_ITEM } from '../config/portalThingsMap';
import {
  listEmailSignatures as listLocal,
  replaceEmailSignatures,
} from '../utils/emailSignatures';

export async function syncEmailSignaturesFromPortal(): Promise<EmailSignature[]> {
  if (useMockData()) return listLocal();
  const boardId = await resolvePortalBoardId();
  if (!boardId) return listLocal();

  try {
    const item =
      (await findPortalItemByName(PORTAL_CONFIG_ITEM.emailSignatures)) ??
      null;
    if (!item?.payloadJson) return listLocal();
    const parsed = JSON.parse(item.payloadJson) as {
      signatures?: EmailSignature[];
    };
    if (!Array.isArray(parsed.signatures)) return listLocal();
    return replaceEmailSignatures(parsed.signatures);
  } catch {
    return listLocal();
  }
}

export async function persistEmailSignaturesToPortal(
  signatures: EmailSignature[],
): Promise<void> {
  if (useMockData() || !canEditPortalThings()) return;
  const boardId = await resolvePortalBoardId();
  if (!boardId) return;

  try {
    const itemId = await ensureEmailSignaturesOnPortal();
    if (!itemId) return;
    await updatePortalItemPayload(
      itemId,
      JSON.stringify({ signatures }),
    );
  } catch (err) {
    console.warn(
      'Portal Things email signatures sync failed:',
      err instanceof Error ? err.message : err,
    );
  }
}
