import type { MondayContext } from '../types/monday';
import { getMondayProxyBaseOverride } from '../services/mondayProxyAuth';

/** Vite env with process.env fallback for Node scripts (tsx). */
function viteEnv(key: string): string | undefined {
  try {
    const fromMeta = (
      import.meta as ImportMeta & { env?: Record<string, string | undefined> }
    ).env?.[key];
    if (fromMeta != null && String(fromMeta).length > 0) return String(fromMeta);
  } catch {
    // ignore
  }
  try {
    const fromProcess = process.env?.[key];
    if (fromProcess != null && String(fromProcess).length > 0) {
      return String(fromProcess);
    }
  } catch {
    // ignore
  }
  return undefined;
}

export function useMockData(): boolean {
  return viteEnv('VITE_USE_MOCK_DATA') === 'true';
}

export function isMondayReadOnly(): boolean {
  return viteEnv('VITE_MONDAY_READ_ONLY') === 'true';
}

/** Live contact profile + tag writes (independent of Applications-board read-only guard). */
export function canEditContacts(): boolean {
  if (useMockData()) return true;
  if (!crmRoleAllowsWrite()) return false;
  if (viteEnv('VITE_CONTACTS_WRITABLE') === 'true') return true;
  return !isMondayReadOnly();
}

/** Application status + column writes. */
export function canEditApplications(): boolean {
  if (useMockData()) return true;
  if (!crmRoleAllowsWrite()) return false;
  if (viteEnv('VITE_APPLICATIONS_WRITABLE') === 'true') return true;
  return !isMondayReadOnly();
}

/** Term-note writes on Applications items while status changes stay read-only. */
export function canAddApplicationNotes(): boolean {
  if (useMockData()) return true;
  if (!crmRoleAllowsWrite()) return false;
  if (viteEnv('VITE_APPLICATION_NOTES_WRITABLE') === 'true') return true;
  return !isMondayReadOnly();
}

export function useMondayApiProxy(): boolean {
  return Boolean(
    getMondayProxyBaseOverride() ||
      viteEnv('VITE_MONDAY_API_PROXY_URL')?.trim(),
  );
}

export function hasStandaloneBoardConfig(): boolean {
  return Boolean(
    viteEnv('VITE_CONTACTS_BOARD_ID') ||
      viteEnv('VITE_APPLICATIONS_BOARD_ID'),
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

  const envBoardId = viteEnv('VITE_APPLICATIONS_BOARD_ID');
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

  const envBoardId = viteEnv('VITE_CONTACTS_BOARD_ID');
  if (envBoardId) return String(envBoardId);

  return null;
}

export function resolveApplicationsBoardId(
  context: MondayContext | null = null,
): string | null {
  if (useMockData()) return null;

  const envBoardId = viteEnv('VITE_APPLICATIONS_BOARD_ID');
  if (envBoardId) return String(envBoardId);

  return resolveBoardId(context);
}

export function resolveDonationsBoardId(
  _context: MondayContext | null = null,
): string | null {
  if (useMockData()) return null;

  const envBoardId = viteEnv('VITE_DONATIONS_BOARD_ID');
  if (envBoardId?.trim()) return String(envBoardId.trim());

  return null;
}

export function resolveServiceEndedBoardId(
  _context: MondayContext | null = null,
): string | null {
  if (useMockData()) return null;

  const envBoardId = viteEnv('VITE_SERVICE_ENDED_BOARD_ID');
  if (envBoardId?.trim()) return String(envBoardId.trim());

  return null;
}

export function resolveEndOfServiceReviewBoardId(
  _context: MondayContext | null = null,
): string | null {
  if (useMockData()) return null;

  const envBoardId = viteEnv('VITE_EOS_REVIEW_BOARD_ID');
  if (envBoardId?.trim()) return String(envBoardId.trim());

  return null;
}

export function resolveLongtermApplicationsBoardId(
  _context: MondayContext | null = null,
): string | null {
  if (useMockData()) return null;

  const envBoardId = viteEnv('VITE_LONGTERM_APPLICATIONS_BOARD_ID');
  if (envBoardId?.trim()) return String(envBoardId.trim());

  return null;
}

export function resolveLongtermReferencesBoardId(): string | null {
  if (useMockData()) return null;

  const envBoardId = viteEnv('VITE_LONGTERM_REFERENCES_BOARD_ID');
  if (envBoardId?.trim()) return String(envBoardId.trim());

  return null;
}

export function resolveEmailTemplatesBoardId(): string | null {
  if (useMockData()) return null;

  const envBoardId = viteEnv('VITE_EMAIL_TEMPLATES_BOARD_ID');
  if (envBoardId?.trim()) return String(envBoardId.trim());

  return null;
}

/** Email template writes on the Email Templates board. */
export function canEditEmailTemplates(): boolean {
  if (useMockData()) return true;
  if (!crmRoleIsAdmin()) return false;
  if (viteEnv('VITE_EMAIL_TEMPLATES_WRITABLE') === 'true') return true;
  return !isMondayReadOnly();
}

/** Reference sent/review writes while applications board stay read-only. */
export function canEditLongtermReferences(): boolean {
  if (useMockData()) return true;
  if (!crmRoleAllowsWrite()) return false;
  if (viteEnv('VITE_LONGTERM_REFERENCES_WRITABLE') === 'true') return true;
  return !isMondayReadOnly();
}

/** Donations board create/update. */
export function canEditDonations(): boolean {
  if (useMockData()) return true;
  if (!crmRoleIsAdmin()) return false;
  if (viteEnv('VITE_DONATIONS_WRITABLE') === 'true') return true;
  return !isMondayReadOnly();
}

/** Safeguarding board / certificate link writes. */
export function canEditSafeguarding(): boolean {
  if (useMockData()) return true;
  if (!crmRoleAllowsWrite()) return false;
  if (viteEnv('VITE_SAFEGUARDING_WRITABLE') === 'true') return true;
  return !isMondayReadOnly();
}

/** Portal Things board (CRM infrastructure: onboarding, recruitment, signatures). */
export function resolvePortalThingsBoardId(): string | null {
  if (useMockData()) return null;
  const envBoardId = viteEnv('VITE_PORTAL_THINGS_BOARD_ID');
  if (envBoardId?.trim()) return String(envBoardId.trim());
  return null;
}

export function canEditPortalThings(): boolean {
  if (useMockData()) return true;
  if (!crmRoleAllowsWrite()) return false;
  if (viteEnv('VITE_PORTAL_THINGS_WRITABLE') === 'true') return true;
  return !isMondayReadOnly();
}

export type CrmRole = 'viewer' | 'coordinator' | 'admin';

/** Soft CRM role from env (password-gated Admin still applies). Default admin. */
export function resolveCrmRole(): CrmRole {
  const raw = String(viteEnv('VITE_CRM_ROLE') ?? 'admin')
    .trim()
    .toLowerCase();
  if (raw === 'viewer' || raw === 'coordinator' || raw === 'admin') return raw;
  return 'admin';
}

/** Any non-viewer role may write coordinator-scoped boards. */
function crmRoleAllowsWrite(): boolean {
  return resolveCrmRole() !== 'viewer';
}

/** Admin-only writes (donations ingest, email template CRUD). */
export function crmRoleIsAdmin(): boolean {
  return resolveCrmRole() === 'admin' || useMockData();
}

export function contactsBoardName(): string {
  return viteEnv('VITE_CONTACTS_BOARD_NAME') || 'Contacts Test';
}

export type MondayBoardRole = 'contacts' | 'applications' | 'other';

export function resolveMonitoredBoardIds(): string[] {
  const explicit = String(viteEnv('VITE_MONDAY_BOARD_IDS') ?? '').trim();
  if (explicit) {
    const ids = explicit
      .split(',')
      .map((id) => id.trim())
      .filter((id) => id.length > 0);
    return [...new Set(ids)];
  }

  const ids: string[] = [];
  const contactsId = viteEnv('VITE_CONTACTS_BOARD_ID');
  const applicationsId = viteEnv('VITE_APPLICATIONS_BOARD_ID');
  const donationsId = viteEnv('VITE_DONATIONS_BOARD_ID');
  const serviceEndedId = viteEnv('VITE_SERVICE_ENDED_BOARD_ID');
  const eosReviewId = viteEnv('VITE_EOS_REVIEW_BOARD_ID');
  const longtermAppsId = viteEnv('VITE_LONGTERM_APPLICATIONS_BOARD_ID');
  const longtermRefsId = viteEnv('VITE_LONGTERM_REFERENCES_BOARD_ID');
  const portalThingsId = viteEnv('VITE_PORTAL_THINGS_BOARD_ID');
  if (contactsId) ids.push(String(contactsId));
  if (applicationsId) ids.push(String(applicationsId));
  if (donationsId) ids.push(String(donationsId));
  if (serviceEndedId) ids.push(String(serviceEndedId));
  if (eosReviewId) ids.push(String(eosReviewId));
  if (longtermAppsId) ids.push(String(longtermAppsId));
  if (longtermRefsId) ids.push(String(longtermRefsId));
  if (portalThingsId) ids.push(String(portalThingsId));
  return [...new Set(ids)];
}

export function resolveBoardRole(boardId: string): MondayBoardRole {
  const contactsId = viteEnv('VITE_CONTACTS_BOARD_ID');
  const applicationsId = viteEnv('VITE_APPLICATIONS_BOARD_ID');
  if (contactsId && String(boardId) === String(contactsId)) return 'contacts';
  if (applicationsId && String(boardId) === String(applicationsId)) {
    return 'applications';
  }
  return 'other';
}

export function isMondayWatchEnabled(): boolean {
  if (useMockData()) return false;
  return viteEnv('VITE_MONDAY_WATCH_ENABLED') === 'true';
}

export function mondayWatchIntervalMs(): number {
  const raw = viteEnv('VITE_MONDAY_WATCH_INTERVAL_MS');
  const parsed = raw ? Number(raw) : 60_000;
  return Number.isFinite(parsed) && parsed >= 15_000 ? parsed : 60_000;
}
