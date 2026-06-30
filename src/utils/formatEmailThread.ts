export function emailBodySnippet(body: string, maxLength = 90): string {
  const line =
    body
      .split(/\r?\n/)
      .map((part) => part.trim())
      .find(Boolean) ?? '';

  const collapsed = line.replace(/\s+/g, ' ').trim();
  if (collapsed.length <= maxLength) return collapsed;
  return `${collapsed.slice(0, maxLength - 1).trimEnd()}…`;
}

export function formatEmailListDate(iso: string): string {
  try {
    const date = new Date(iso);
    const now = new Date();
    const startOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );
    const startOfMessageDay = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
    );

    if (startOfMessageDay.getTime() === startOfToday.getTime()) {
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
      });
    }

    if (date.getFullYear() === now.getFullYear()) {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
    }

    return date.toLocaleDateString('en-US', {
      month: 'numeric',
      day: 'numeric',
      year: '2-digit',
    });
  } catch {
    return iso;
  }
}

export function formatEmailDetailDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}
