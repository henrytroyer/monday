const SENT_KEY = 'crm-lt-ref-sent';
const REVIEW_KEY = 'crm-lt-ref-review';

function sentStorageKey(applicationId: string, slotIndex: number): string {
  return `${SENT_KEY}:${applicationId}:${slotIndex}`;
}

function reviewStorageKey(applicationId: string, slotIndex: number): string {
  return `${REVIEW_KEY}:${applicationId}:${slotIndex}`;
}

export function readReferenceEmailSentAt(
  applicationId: string,
  slotIndex: number,
): string | undefined {
  try {
    return localStorage.getItem(sentStorageKey(applicationId, slotIndex)) ?? undefined;
  } catch {
    return undefined;
  }
}

export function writeReferenceEmailSentAt(
  applicationId: string,
  slotIndex: number,
  sentAt: string,
): void {
  try {
    localStorage.setItem(sentStorageKey(applicationId, slotIndex), sentAt);
  } catch {
    // ignore quota errors
  }
}

export function readReferenceReviewStatus(
  applicationId: string,
  slotIndex: number,
): 'approved' | 'needs_review' | undefined {
  try {
    const raw = localStorage.getItem(reviewStorageKey(applicationId, slotIndex));
    if (raw === 'approved' || raw === 'needs_review') return raw;
    return undefined;
  } catch {
    return undefined;
  }
}

export function writeReferenceReviewStatus(
  applicationId: string,
  slotIndex: number,
  status: 'approved' | 'needs_review',
): void {
  try {
    localStorage.setItem(reviewStorageKey(applicationId, slotIndex), status);
  } catch {
    // ignore
  }
}

export function clearReferenceReviewStatus(
  applicationId: string,
  slotIndex: number,
): void {
  try {
    localStorage.removeItem(reviewStorageKey(applicationId, slotIndex));
  } catch {
    // ignore
  }
}

export function formatSentTimestamp(date = new Date()): string {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}
