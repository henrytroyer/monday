/**
 * Upsert CRM Email Threads / Messages index rows on monday when boards are configured.
 * Best-effort — UI works from hydrated SuperMail/E&A even if sync fails.
 */

import {
  emailMessagesBoardMap,
  emailThreadsBoardMap,
  resolveEmailMessagesBoardId,
  resolveEmailThreadsBoardId,
} from '../config/emailThreadBoardMap';
import { canEditContacts, useMockData } from '../config/boards';
import type { EmailThread } from '../types/emailThread';
import { mondayGraphQL } from './mondayGraphQL';
import { mutations } from '../utils/mondayQueries';

async function resolveColumnId(
  boardId: string,
  title: string,
): Promise<string | null> {
  const data = await mondayGraphQL<{
    boards: Array<{ columns: Array<{ id: string; title: string }> }>;
  }>(
    `query ($ids: [ID!]!) { boards(ids: $ids) { columns { id title } } }`,
    { ids: [boardId] },
  );
  const col = data.boards[0]?.columns.find(
    (c) => c.title.trim().toLowerCase() === title.trim().toLowerCase(),
  );
  return col?.id ?? null;
}

async function findItemByThreadKey(
  boardId: string,
  columnId: string,
  threadKey: string,
): Promise<string | null> {
  try {
    const data = await mondayGraphQL<{
      items_page_by_column_values: {
        items: Array<{ id: string }>;
      };
    }>(
      `query ($boardId: ID!, $columnId: String!, $value: String!) {
        items_page_by_column_values(
          board_id: $boardId
          columns: [{ column_id: $columnId, column_values: [$value] }]
          limit: 1
        ) { items { id } }
      }`,
      { boardId, columnId, value: threadKey },
    );
    return data.items_page_by_column_values?.items?.[0]?.id ?? null;
  } catch {
    return null;
  }
}

async function setTextColumn(
  boardId: string,
  itemId: string,
  columnId: string,
  value: string,
): Promise<void> {
  await mondayGraphQL(mutations.updateSimpleColumnValue, {
    boardId,
    itemId,
    columnId,
    value,
  });
}

/** Persist thread association / index metadata to monday (when writable + configured). */
export async function syncEmailThreadIndexToMonday(
  thread: EmailThread,
): Promise<void> {
  if (useMockData() || !canEditContacts()) return;

  const threadsBoardId = resolveEmailThreadsBoardId();
  if (!threadsBoardId) return;

  try {
    const threadKeyCol = await resolveColumnId(
      threadsBoardId,
      emailThreadsBoardMap.threadKey,
    );
    if (!threadKeyCol) return;

    let itemId = await findItemByThreadKey(
      threadsBoardId,
      threadKeyCol,
      thread.id,
    );

    if (!itemId) {
      const created = await mondayGraphQL<{
        create_item: { id: string };
      }>(mutations.createItem, {
        boardId: threadsBoardId,
        itemName: thread.subject.slice(0, 80) || thread.id,
      });
      itemId = created.create_item.id;
    }

    const pairs: Array<[string, string]> = [
      [emailThreadsBoardMap.threadKey, thread.id],
      [emailThreadsBoardMap.contactId, thread.contactId],
      [emailThreadsBoardMap.applicationId, thread.applicationId ?? ''],
      [emailThreadsBoardMap.termOfServiceId, thread.termOfServiceId ?? ''],
      [emailThreadsBoardMap.normalizedSubject, thread.normalizedSubject],
      [emailThreadsBoardMap.subject, thread.subject],
      [emailThreadsBoardMap.participants, thread.participantEmails.join(', ')],
      [emailThreadsBoardMap.firstMessageAt, thread.firstMessageAt],
      [emailThreadsBoardMap.lastMessageAt, thread.lastMessageAt],
      [emailThreadsBoardMap.messageCount, String(thread.messageCount)],
      [emailThreadsBoardMap.status, thread.status],
      [
        emailThreadsBoardMap.needsAssociationReview,
        thread.needsAssociationReview ? 'true' : 'false',
      ],
    ];

    for (const [title, value] of pairs) {
      const colId = await resolveColumnId(threadsBoardId, title);
      if (!colId) continue;
      await setTextColumn(threadsBoardId, itemId, colId, value);
    }

    const messagesBoardId = resolveEmailMessagesBoardId();
    if (!messagesBoardId) return;

    const messageKeyCol = await resolveColumnId(
      messagesBoardId,
      emailMessagesBoardMap.messageKey,
    );
    if (!messageKeyCol) return;

    for (const message of thread.messages) {
      let msgItemId = await findItemByThreadKey(
        messagesBoardId,
        messageKeyCol,
        message.id,
      );
      if (!msgItemId) {
        const created = await mondayGraphQL<{
          create_item: { id: string };
        }>(mutations.createItem, {
          boardId: messagesBoardId,
          itemName: message.subject.slice(0, 80) || message.id,
        });
        msgItemId = created.create_item.id;
      }

      const msgPairs: Array<[string, string]> = [
        [emailMessagesBoardMap.messageKey, message.id],
        [emailMessagesBoardMap.threadKey, thread.id],
        [emailMessagesBoardMap.contactId, message.contactId],
        [emailMessagesBoardMap.applicationId, message.applicationId ?? ''],
        [emailMessagesBoardMap.termOfServiceId, message.termOfServiceId ?? ''],
        [emailMessagesBoardMap.direction, message.direction],
        [
          emailMessagesBoardMap.sender,
          `${message.senderName} <${message.senderEmail}>`,
        ],
        [
          emailMessagesBoardMap.recipients,
          message.toRecipients.map((r) => r.email).join(', '),
        ],
        [emailMessagesBoardMap.subject, message.subject],
        [emailMessagesBoardMap.sentAt, message.sentAt],
        [emailMessagesBoardMap.mondayUpdateId, message.mondayUpdateId ?? ''],
        [
          emailMessagesBoardMap.mondayTimelineItemId,
          message.mondayTimelineItemId ?? '',
        ],
        [emailMessagesBoardMap.isAutomated, message.isAutomated ? 'true' : 'false'],
        [
          emailMessagesBoardMap.trackingEnabled,
          message.trackingEnabled ? 'true' : 'false',
        ],
      ];

      for (const [title, value] of msgPairs) {
        const colId = await resolveColumnId(messagesBoardId, title);
        if (!colId) continue;
        await setTextColumn(messagesBoardId, msgItemId, colId, value);
      }
    }
  } catch {
    // Index sync is best-effort
  }
}
