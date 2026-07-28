/**
 * Column titles for CRM Email Threads / Messages monday boards.
 */

export const emailThreadsBoardMap = {
  boardName: 'CRM Email Threads',
  contactId: 'Contact ID',
  applicationId: 'Application ID',
  termOfServiceId: 'Term of Service ID',
  providerThreadId: 'Provider Thread ID',
  normalizedSubject: 'Normalized Subject',
  subject: 'Subject',
  participants: 'Participants',
  firstMessageAt: 'First Message At',
  lastMessageAt: 'Last Message At',
  messageCount: 'Message Count',
  status: 'Status',
  needsAssociationReview: 'Needs Association Review',
  threadKey: 'Thread Key',
} as const;

export const emailMessagesBoardMap = {
  boardName: 'CRM Email Messages',
  threadKey: 'Thread Key',
  contactId: 'Contact ID',
  applicationId: 'Application ID',
  termOfServiceId: 'Term of Service ID',
  direction: 'Direction',
  sender: 'Sender',
  recipients: 'Recipients',
  subject: 'Subject',
  sentAt: 'Sent At',
  mondayUpdateId: 'Monday Update ID',
  mondayTimelineItemId: 'Monday Timeline Item ID',
  isAutomated: 'Is Automated',
  trackingEnabled: 'Tracking Enabled',
  messageKey: 'Message Key',
} as const;

export function resolveEmailThreadsBoardId(): string | null {
  const id = import.meta.env.VITE_EMAIL_THREADS_BOARD_ID?.trim();
  return id || null;
}

export function resolveEmailMessagesBoardId(): string | null {
  const id = import.meta.env.VITE_EMAIL_MESSAGES_BOARD_ID?.trim();
  return id || null;
}
