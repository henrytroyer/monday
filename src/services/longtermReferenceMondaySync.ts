/**
 * longtermReferenceMondaySync.ts — Persist LT reference sent/review to Monday updates.
 * monday.com is SoT; localStorage remains a cache only.
 */

import { canEditLongtermReferences, useMockData } from '../config/boards';
import { mutations } from '../utils/mondayQueries';
import { mondayGraphQL as api } from './mondayGraphQL';
import { invalidateLongtermReferenceSlots } from './sessionDetailCache';
import {
  clearReferenceReviewStatus,
  writeReferenceEmailSentAt,
  writeReferenceReviewStatus,
} from './longtermReferenceStorage';

const MARKER = 'CRM_LT_REF_V1';

export function encodeLtRefSentUpdate(slotIndex: number, sentAt: string): string {
  return `${MARKER}|sent|${slotIndex}|${sentAt}`;
}

export function encodeLtRefReviewUpdate(
  slotIndex: number,
  reviewStatus: 'approved' | 'needs_review' | 'cleared',
): string {
  return `${MARKER}|review|${slotIndex}|${reviewStatus}`;
}

export function parseLtRefMarkersFromUpdates(
  updateBodies: string[],
): {
  sentAtBySlot: Map<number, string>;
  reviewBySlot: Map<number, 'approved' | 'needs_review'>;
} {
  const sentAtBySlot = new Map<number, string>();
  const reviewBySlot = new Map<number, 'approved' | 'needs_review'>();

  for (const body of updateBodies) {
    const text = body.trim();
    if (!text.startsWith(MARKER)) continue;
    const parts = text.split('|');
    if (parts.length < 4) continue;
    const kind = parts[1];
    const slotIndex = Number.parseInt(parts[2] ?? '', 10);
    if (!Number.isFinite(slotIndex)) continue;
    if (kind === 'sent') {
      sentAtBySlot.set(slotIndex, parts.slice(3).join('|'));
    } else if (kind === 'review') {
      const status = parts[3];
      if (status === 'cleared') {
        reviewBySlot.delete(slotIndex);
      } else if (status === 'approved' || status === 'needs_review') {
        reviewBySlot.set(slotIndex, status);
      }
    }
  }

  return { sentAtBySlot, reviewBySlot };
}

async function createLtRefUpdate(itemId: string, body: string): Promise<void> {
  if (useMockData()) return;
  if (!canEditLongtermReferences()) {
    throw new Error('Long-term references are read-only: cannot update Monday.');
  }
  await api(mutations.createUpdate, { itemId, body });
  invalidateLongtermReferenceSlots(itemId);
}

export async function persistReferenceEmailSentToMonday(
  applicationId: string,
  slotIndex: number,
  sentAt: string,
): Promise<void> {
  writeReferenceEmailSentAt(applicationId, slotIndex, sentAt);
  await createLtRefUpdate(
    applicationId,
    encodeLtRefSentUpdate(slotIndex, sentAt),
  );
}

export async function persistReferenceReviewToMonday(
  applicationId: string,
  slotIndex: number,
  reviewStatus: 'approved' | 'needs_review',
): Promise<void> {
  writeReferenceReviewStatus(applicationId, slotIndex, reviewStatus);
  await createLtRefUpdate(
    applicationId,
    encodeLtRefReviewUpdate(slotIndex, reviewStatus),
  );
}

export async function persistClearReferenceReviewToMonday(
  applicationId: string,
  slotIndex: number,
): Promise<void> {
  clearReferenceReviewStatus(applicationId, slotIndex);
  await createLtRefUpdate(
    applicationId,
    encodeLtRefReviewUpdate(slotIndex, 'cleared'),
  );
}
