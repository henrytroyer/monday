/**
 * Days staff choose when sending a message.
 * Blank means no reply is expected, so the message is never flagged.
 * `0` flags it as soon as it is sent.
 */
export function parseAlertAfterDays(value: string): number | undefined {
  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) return undefined;
  const days = Number(trimmed);
  if (!Number.isSafeInteger(days)) return undefined;
  return days;
}
