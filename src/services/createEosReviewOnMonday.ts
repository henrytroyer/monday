/**
 * createEosReviewOnMonday.ts — Create items on the End of Service Review board.
 */

import {
  canEditApplications,
  resolveEndOfServiceReviewBoardId,
  useMockData,
} from '../config/boards';
import { endOfServiceReviewColumnMap } from '../config/endOfServiceReviewColumnMap';
import { mutations } from '../utils/mondayQueries';
import { tryChangeColumnByTitle } from './mondayColumnWrite';
import { mondayGraphQL as api } from './mondayGraphQL';

export interface EosReviewWriteInput {
  name: string;
  email?: string;
  completedDate?: string;
}

export async function createEosReviewOnMonday(
  input: EosReviewWriteInput,
): Promise<{ id: string; name: string }> {
  if (useMockData()) {
    return {
      id: `mock-eos-review-${Date.now()}`,
      name: input.name.trim() || 'EOS review',
    };
  }

  if (!canEditApplications()) {
    throw new Error('Applications are read-only: cannot create EOS review item.');
  }

  const boardId = resolveEndOfServiceReviewBoardId();
  if (!boardId) {
    throw new Error('End of Service Review board is not configured.');
  }

  const created = await api<{
    create_item: { id: string; name: string };
  }>(mutations.createItem, {
    boardId,
    itemName: input.name.trim() || 'EOS review',
  });

  const itemId = created.create_item.id;
  if (input.email?.trim()) {
    await tryChangeColumnByTitle(
      boardId,
      itemId,
      endOfServiceReviewColumnMap.email,
      input.email.trim(),
    );
  }
  if (
    input.completedDate?.trim() &&
    endOfServiceReviewColumnMap.completedDate.trim()
  ) {
    await tryChangeColumnByTitle(
      boardId,
      itemId,
      endOfServiceReviewColumnMap.completedDate,
      input.completedDate.trim(),
    );
  }

  return { id: itemId, name: created.create_item.name };
}
