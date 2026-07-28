import type {
  EmailHistorySummary,
  EmailThread,
} from '../types/emailThread';

export function buildEmailHistorySummary(
  threads: EmailThread[],
): EmailHistorySummary {
  let totalSent = 0;
  let totalReceived = 0;
  let awaitingReply = 0;
  let deliveryFailures = 0;
  let lastEmailAt: string | null = null;

  for (const thread of threads) {
    for (const message of thread.messages) {
      if (message.direction === 'outbound') totalSent += 1;
      else totalReceived += 1;

      if (
        message.deliveryStatus === 'failed' ||
        message.deliveryStatus === 'bounced' ||
        message.deliveryStatus === 'rejected'
      ) {
        deliveryFailures += 1;
      }

      if (
        !lastEmailAt ||
        new Date(message.sentAt).getTime() > new Date(lastEmailAt).getTime()
      ) {
        lastEmailAt = message.sentAt;
      }
    }

    const last = [...thread.messages].sort(
      (a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime(),
    )[0];
    if (last?.direction === 'inbound') {
      awaitingReply += 1;
    }
  }

  return {
    totalThreads: threads.length,
    totalSent,
    totalReceived,
    lastEmailAt,
    awaitingReply,
    deliveryFailures,
  };
}
