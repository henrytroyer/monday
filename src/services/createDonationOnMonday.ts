/**
 * createDonationOnMonday.ts — Create donation items on the Donations board.
 */

import {
  canEditDonations,
  resolveDonationsBoardId,
  useMockData,
} from '../config/boards';
import { donationMap } from '../config/donationMap';
import { mutations } from '../utils/mondayQueries';
import { changeColumnByTitle } from './mondayColumnWrite';
import { mondayGraphQL as api } from './mondayGraphQL';

export interface DonationWriteInput {
  donorName: string;
  donorEmail?: string;
  amount?: string;
  date?: string;
  program?: string;
  designation?: string;
  details?: string;
}

export async function createDonationOnMonday(
  input: DonationWriteInput,
): Promise<{ id: string; name: string }> {
  if (useMockData()) {
    return {
      id: `mock-donation-${Date.now()}`,
      name: input.donorName.trim() || 'Donation',
    };
  }

  if (!canEditDonations()) {
    throw new Error('Donations are read-only: cannot create donation.');
  }

  const boardId = resolveDonationsBoardId();
  if (!boardId) {
    throw new Error('Donations board is not configured.');
  }

  const created = await api<{
    create_item: { id: string; name: string };
  }>(mutations.createItem, {
    boardId,
    itemName: input.donorName.trim() || 'Donation',
  });

  const itemId = created.create_item.id;
  const writes: Array<[string, string | undefined]> = [
    [donationMap.donorEmail, input.donorEmail],
    [donationMap.amount, input.amount],
    [donationMap.date, input.date],
    [donationMap.program, input.program],
    [donationMap.designation, input.designation],
    [donationMap.details, input.details],
    [donationMap.donorName, input.donorName],
  ];

  for (const [title, value] of writes) {
    if (!value?.trim()) continue;
    await changeColumnByTitle(boardId, itemId, title, value.trim()).catch(
      () => undefined,
    );
  }

  return { id: itemId, name: created.create_item.name };
}
