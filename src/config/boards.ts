import type { MondayContext } from '../types/monday';

export function useMockData(): boolean {
  return import.meta.env.VITE_USE_MOCK_DATA === 'true';
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

export function resolveContactsBoardId(): string | null {
  if (useMockData()) return null;

  const envBoardId = import.meta.env.VITE_CONTACTS_BOARD_ID;
  if (envBoardId) return String(envBoardId);

  return null;
}

export function contactsBoardName(): string {
  return import.meta.env.VITE_CONTACTS_BOARD_NAME || 'Contacts Test';
}
