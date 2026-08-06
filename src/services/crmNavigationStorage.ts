import type { PageId } from '../constants/navItems';
import type { LongtermViewMode } from '../types/longtermVolunteer';

const STORAGE_KEY = 'crm-navigation-state';

const VALID_PAGES = new Set<PageId>([
  'contacts',
  'applications',
  'recruitment',
  'longterm-applications',
  'email-templates',
  'email-campaigns',
  'history',
  'users',
  'user-settings',
  'roles-permissions',
  'audit-log',
  'forms',
  'automations',
]);

export interface CrmPageWorkspaceState {
  itemId?: string;
  detailOpen?: boolean;
}

export interface CrmNavigationState {
  activePage: PageId;
  longtermViewMode?: LongtermViewMode;
  workspaces: Partial<Record<PageId, CrmPageWorkspaceState>>;
}

function normalizePageId(value: string): PageId | null {
  const migrated =
    value === 'email' || value === 'email-control'
      ? 'email-templates'
      : value;
  return isPageId(migrated) ? migrated : null;
}

function isPageId(value: string): value is PageId {
  return VALID_PAGES.has(value as PageId);
}

function migrateWorkspaces(
  workspaces: CrmNavigationState['workspaces'] | undefined,
): CrmNavigationState['workspaces'] {
  if (!workspaces) return {};
  const raw = workspaces as Record<string, CrmPageWorkspaceState | undefined>;
  const next: CrmNavigationState['workspaces'] = { ...workspaces };
  if (raw.email && !raw['email-templates']) {
    next['email-templates'] = raw.email;
  }
  return next;
}

export function readCrmNavigationState(): CrmNavigationState | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CrmNavigationState;
    const activePage = normalizePageId(parsed.activePage);
    if (!activePage) return null;
    return {
      activePage,
      longtermViewMode: parsed.longtermViewMode,
      workspaces: migrateWorkspaces(parsed.workspaces),
    };
  } catch {
    return null;
  }
}

export function writeCrmNavigationState(state: CrmNavigationState): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // sessionStorage may be unavailable or full
  }
}

export function patchCrmNavigationState(
  patch: Partial<CrmNavigationState> & {
    workspacePage?: PageId;
    workspace?: CrmPageWorkspaceState | null;
  },
): void {
  const current = readCrmNavigationState() ?? {
    activePage: 'applications' as PageId,
    workspaces: {},
  };
  const { workspacePage, workspace, ...rest } = patch;
  const next: CrmNavigationState = {
    ...current,
    ...rest,
    workspaces: { ...current.workspaces },
  };
  if (workspacePage !== undefined) {
    if (workspace) {
      next.workspaces[workspacePage] = workspace;
    } else {
      delete next.workspaces[workspacePage];
    }
  }
  writeCrmNavigationState(next);
}

export function getInitialActivePage(): PageId {
  const saved = readCrmNavigationState()?.activePage;
  if (saved) return saved;
  try {
    const preferred = localStorage.getItem('crm-user-default-landing-v1');
    if (preferred && isPageId(preferred)) return preferred;
  } catch {
    // ignore
  }
  return 'contacts';
}

export function getInitialMountedPages(): Set<PageId> {
  const activePage = getInitialActivePage();
  const initial = new Set<PageId>([activePage]);
  const saved = readCrmNavigationState();
  if (!saved) return initial;

  for (const [page, workspace] of Object.entries(saved.workspaces)) {
    const normalized =
      page === 'email' || page === 'email-control'
        ? 'email-templates'
        : page;
    if (isPageId(normalized) && workspace?.detailOpen) {
      initial.add(normalized);
    }
  }
  return initial;
}

export function readWorkspaceState(
  page: PageId,
): CrmPageWorkspaceState | undefined {
  return readCrmNavigationState()?.workspaces?.[page];
}

export function persistPageWorkspace(
  page: PageId,
  workspace: CrmPageWorkspaceState,
): void {
  patchCrmNavigationState({ workspacePage: page, workspace });
}
