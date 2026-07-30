/**
 * useRefetchOnWindowFocus.ts — Pull Monday → CRM when the tab regains focus.
 * Part of the bidirectional sync contract (see docs/crm-bidirectional-sync.md).
 */

import { useEffect, useRef } from 'react';

/**
 * Call `refetch` when the browser tab becomes visible again (and on window focus).
 * Debounced so focus+visibility don't double-fire.
 */
export function useRefetchOnWindowFocus(
  refetch: () => void,
  enabled = true,
): void {
  const refetchRef = useRef(refetch);
  refetchRef.current = refetch;
  const lastAt = useRef(0);

  useEffect(() => {
    if (!enabled) return;

    const run = () => {
      const now = Date.now();
      if (now - lastAt.current < 800) return;
      lastAt.current = now;
      refetchRef.current();
    };

    const onVisibility = () => {
      if (document.visibilityState === 'visible') run();
    };

    window.addEventListener('focus', run);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('focus', run);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [enabled]);
}
