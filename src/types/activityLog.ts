import type { PageId } from '../components/layout/AppSidebar';

export type CrmActivityCategory =
  | 'created'
  | 'updated'
  | 'deleted'
  | 'moved'
  | 'comment'
  | 'email'
  | 'other';

export type CrmActivityEntityType =
  | 'contact'
  | 'application'
  | 'donation'
  | 'recruitment'
  | 'board';

export type CrmActivityUndoKind =
  | 'restore_column'
  | 'move_group'
  | 'delete_item'
  | 'none';

export interface CrmActivityNavigateTo {
  page: PageId;
  focusId?: string;
}

export interface CrmActivityUndo {
  kind: CrmActivityUndoKind;
  /** Column to restore (restore_column). */
  columnId?: string;
  columnType?: string;
  columnTitle?: string;
  /** Raw previous_value from monday activity log — written back on undo. */
  previousValueRaw?: unknown;
  /** Group to move the item back to (move_group). */
  sourceGroupId?: string;
  sourceGroupName?: string;
}

export interface CrmActivityEvent {
  id: string;
  occurredAt: string;
  actorUserId?: string;
  actorName: string;
  category: CrmActivityCategory;
  boardId?: string;
  boardName?: string;
  entityType?: CrmActivityEntityType;
  entityId?: string;
  entityName?: string;
  summary: string;
  detail?: string;
  navigateTo?: CrmActivityNavigateTo;
  /** True when History can offer an Undo control. */
  undoable?: boolean;
  undo?: CrmActivityUndo;
  /** True when a monday.com automation / system actor made the change. */
  isAutomation?: boolean;
}

export interface MondayActivityLogRaw {
  id: string;
  event: string;
  entity: string;
  user_id: string;
  created_at: string;
  data?: string | null;
}

export interface HistoryFilterState {
  searchQuery: string;
  actorUserId: string | null;
  boardId: string | null;
  category: CrmActivityCategory | null;
  fromDate: string;
  toDate: string;
}

export function defaultHistoryFilters(): HistoryFilterState {
  const to = new Date();
  const from = new Date(to);
  from.setDate(from.getDate() - 30);

  return {
    searchQuery: '',
    actorUserId: null,
    boardId: null,
    category: null,
    fromDate: from.toISOString().slice(0, 10),
    toDate: to.toISOString().slice(0, 10),
  };
}
