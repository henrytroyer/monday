/**
 * createServiceEndedOnMonday.ts — Create items on the Current Service Ended board.
 */

import {
  canEditApplications,
  resolveServiceEndedBoardId,
  useMockData,
} from '../config/boards';
import { serviceEndedColumnMap } from '../config/serviceEndedColumnMap';
import { mutations } from '../utils/mondayQueries';
import { tryChangeColumnByTitle } from './mondayColumnWrite';
import { mondayGraphQL as api } from './mondayGraphQL';

export interface ServiceEndedWriteInput {
  name: string;
  email?: string;
  phone?: string;
  location?: string;
  locationPreference?: string;
  notes?: string;
}

export async function createServiceEndedOnMonday(
  input: ServiceEndedWriteInput,
): Promise<{ id: string; name: string }> {
  if (useMockData()) {
    return {
      id: `mock-service-ended-${Date.now()}`,
      name: input.name.trim() || 'Service ended',
    };
  }

  if (!canEditApplications()) {
    throw new Error('Applications are read-only: cannot create service-ended item.');
  }

  const boardId = resolveServiceEndedBoardId();
  if (!boardId) {
    throw new Error('Service Ended board is not configured.');
  }

  const created = await api<{
    create_item: { id: string; name: string };
  }>(mutations.createItem, {
    boardId,
    itemName: input.name.trim() || 'Service ended',
  });

  const itemId = created.create_item.id;
  const writes: Array<[string, string | undefined]> = [
    [serviceEndedColumnMap.email, input.email],
    [serviceEndedColumnMap.phone, input.phone],
    [serviceEndedColumnMap.location, input.location],
    [serviceEndedColumnMap.locationPreference, input.locationPreference],
    [serviceEndedColumnMap.notes, input.notes],
  ];

  for (const [title, value] of writes) {
    if (value === undefined || value === '') continue;
    await tryChangeColumnByTitle(boardId, itemId, title, value, {
      createLabelsIfMissing: true,
    });
  }

  return { id: itemId, name: created.create_item.name };
}
