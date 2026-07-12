import { useMockData } from '../config/boards';
import type { ContactEmailMessage } from '../types/contact';
import { queries } from '../utils/mondayQueries';
import { mondayGraphQL } from './mondayGraphQL';
import {
  parseSuperMailUpdates,
  type MondayEmailUpdateRaw,
} from './parseSuperMailUpdate';
import type { ParseTimelineEmailContext } from './parseTimelineEmail';

interface ItemEmailUpdatesResponse {
  items: Array<{
    id: string;
    updates: MondayEmailUpdateRaw[];
  }> | null;
}

export async function fetchItemSuperMailEmails(
  itemId: string,
  context: Omit<ParseTimelineEmailContext, 'itemId'> & { itemId?: string },
): Promise<ContactEmailMessage[]> {
  if (!itemId || itemId.startsWith('mock-') || useMockData()) return [];

  const data = await mondayGraphQL<ItemEmailUpdatesResponse>(
    queries.getItemEmailUpdates,
    { itemIds: [itemId] },
  );

  const updates = data.items?.[0]?.updates ?? [];
  return parseSuperMailUpdates(updates, {
    ...context,
    contactId: context.contactId,
    itemId,
  });
}
