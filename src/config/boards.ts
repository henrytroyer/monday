import type { MondayContext } from '../types/monday';

export function useMockData(): boolean {
  return import.meta.env.VITE_USE_MOCK_DATA === 'true';
}

export function isMondayReadOnly(): boolean {
  return import.meta.env.VITE_MONDAY_READ_ONLY === 'true';
}

/** Live contact profile + tag writes (independent of Applications-board read-only guard). */
export function canEditContacts(): boolean {
  if (useMockData()) return true;
  if (import.meta.env.VITE_CONTACTS_WRITABLE === 'true') return true;
  return !isMondayReadOnly();
}

/** Application status + column writes (future; off while polishing read-only view). */
export function canEditApplications(): boolean {
  if (useMockData()) return true;
  if (import.meta.env.VITE_APPLICATIONS_WRITABLE === 'true') return true;
  return !isMondayReadOnly();
}

/** Term-note writes on Applications items while status changes stay read-only. */
export function canAddApplicationNotes(): boolean {
  if (useMockData()) return true;
  if (import.meta.env.VITE_APPLICATION_NOTES_WRITABLE === 'true') return true;
  return !isMondayReadOnly();
}

export function useMondayApiProxy(): boolean {
  return Boolean(import.meta.env.VITE_MONDAY_API_PROXY_URL?.trim());
}

export function hasStandaloneBoardConfig(): boolean {
  return Boolean(
    import.meta.env.VITE_CONTACTS_BOARD_ID ||
      import.meta.env.VITE_APPLICATIONS_BOARD_ID,
  );
}

export function isStandaloneMondayMode(): boolean {
  return useMondayApiProxy() && hasStandaloneBoardConfig();
}

export function resolveBoardId(context: MondayContext | null): string | null {
  if (useMockData()) return null;

  if (context?.boardId != null) {
    return String(context.boardId);
  }

  if (context?.boardIds && context.boardIds.length > 0) {
    return String(context.boardIds[0]);
  }

  const envBoardId = import.meta.env.VITE_APPLICATIONS_BOARD_ID;
  if (envBoardId) return envBoardId;

  return null;
}

export function resolveContactsBoardId(
  context: MondayContext | null = null,
): string | null {
  if (useMockData()) return null;

  if (context?.boardId != null) {
    return String(context.boardId);
  }

  if (context?.boardIds && context.boardIds.length > 0) {
    return String(context.boardIds[0]);
  }

  const envBoardId = import.meta.env.VITE_CONTACTS_BOARD_ID;
  if (envBoardId) return String(envBoardId);

  return null;
}

export function resolveApplicationsBoardId(
  context: MondayContext | null = null,
): string | null {
  if (useMockData()) return null;

  const envBoardId = import.meta.env.VITE_APPLICATIONS_BOARD_ID;
  if (envBoardId) return String(envBoardId);

  return resolveBoardId(context);
}

export function resolveDonationsBoardId(
  _context: MondayContext | null = null,
): string | null {
  if (useMockData()) return null;

  const envBoardId = import.meta.env.VITE_DONATIONS_BOARD_ID;
  if (envBoardId?.trim()) return String(envBoardId.trim());

  return null;
}

export function resolveServiceEndedBoardId(
  _context: MondayContext | null = null,
): string | null {
  if (useMockData()) return null;

  const envBoardId = import.meta.env.VITE_SERVICE_ENDED_BOARD_ID;
  if (envBoardId?.trim()) return String(envBoardId.trim());

  return null;
}

export function resolveEndOfServiceReviewBoardId(
  _context: MondayContext | null = null,
): string | null {
  if (useMockData()) return null;

  const envBoardId = import.meta.env.VITE_EOS_REVIEW_BOARD_ID;
  if (envBoardId?.trim()) return String(envBoardId.trim());

  return null;
}

export function contactsBoardName(): string {
  return import.meta.env.VITE_CONTACTS_BOARD_NAME || 'Contacts Test';
}

export type MondayBoardRole = 'contacts' | 'applications' | 'other';

export function resolveMonitoredBoardIds(): string[] {
  const explicit = String(import.meta.env.VITE_MONDAY_BOARD_IDS ?? '').trim();
  if (explicit) {
    const ids = explicit
      .split(',')
      .map((id) => id.trim())
      .filter((id) => id.length > 0);
    return [...new Set(ids)];
  }

  const ids: string[] = [];
  const contactsId = import.meta.env.VITE_CONTACTS_BOARD_ID;
  const applicationsId = import.meta.env.VITE_APPLICATIONS_BOARD_ID;
  const donationsId = import.meta.env.VITE_DONATIONS_BOARD_ID;
  const serviceEndedId = import.meta.env.VITE_SERVICE_ENDED_BOARD_ID;
  const eosReviewId = import.meta.env.VITE_EOS_REVIEW_BOARD_ID;
  if (contactsId) ids.push(String(contactsId));
  if (applicationsId) ids.push(String(applicationsId));
  if (donationsId) ids.push(String(donationsId));
  if (serviceEndedId) ids.push(String(serviceEndedId));
  if (eosReviewId) ids.push(String(eosReviewId));
  return [...new Set(ids)];
}

export function resolveBoardRole(boardId: string): MondayBoardRole {
  const contactsId = import.meta.env.VITE_CONTACTS_BOARD_ID;
  const applicationsId = import.meta.env.VITE_APPLICATIONS_BOARD_ID;
  if (contactsId && String(boardId) === String(contactsId)) return 'contacts';
  if (applicationsId && String(boardId) === String(applicationsId)) {
    return 'applications';
  }
  return 'other';
}

export function isMondayWatchEnabled(): boolean {
  if (useMockData()) return false;
  return import.meta.env.VITE_MONDAY_WATCH_ENABLED === 'true';
}

export function mondayWatchIntervalMs(): number {
  const raw = import.meta.env.VITE_MONDAY_WATCH_INTERVAL_MS;
  const parsed = raw ? Number(raw) : 60_000;
  return Number.isFinite(parsed) && parsed >= 15_000 ? parsed : 60_000;
}
