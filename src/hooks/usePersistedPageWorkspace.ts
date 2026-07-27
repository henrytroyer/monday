import { useEffect, useRef } from 'react';
import type { PageId } from '../components/layout/AppSidebar';
import {
  persistPageWorkspace,
  readWorkspaceState,
} from '../services/crmNavigationStorage';

interface UsePersistedPageWorkspaceOptions<T> {
  page: PageId;
  loading: boolean;
  selectedId: string | undefined;
  detailOpen: boolean;
  findItem: (id: string) => T | undefined;
  onRestore: (item: T, detailOpen: boolean) => void;
}

/** Restore and persist list/detail workspace across browser refresh. */
export function usePersistedPageWorkspace<T>({
  page,
  loading,
  selectedId,
  detailOpen,
  findItem,
  onRestore,
}: UsePersistedPageWorkspaceOptions<T>): void {
  const restoreItemIdRef = useRef(readWorkspaceState(page)?.itemId);
  const restoreDetailOpenRef = useRef(
    readWorkspaceState(page)?.detailOpen ?? false,
  );
  const restoredRef = useRef(false);

  useEffect(() => {
    const itemId = restoreItemIdRef.current;
    if (!itemId || loading || restoredRef.current || selectedId) return;

    const match = findItem(itemId);
    if (!match) return;

    onRestore(match, restoreDetailOpenRef.current);
    restoredRef.current = true;
    restoreItemIdRef.current = undefined;
  }, [page, loading, selectedId, findItem, onRestore]);

  useEffect(() => {
    persistPageWorkspace(page, {
      itemId: selectedId,
      detailOpen: detailOpen && Boolean(selectedId),
    });
  }, [page, selectedId, detailOpen]);
}
