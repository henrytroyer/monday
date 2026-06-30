/**
 * Browser History API layer for two-finger swipe-back navigation.
 * Mirrors open popup/panel depth into history.pushState and restores on popstate.
 */
import { useEffect, useRef } from 'react';

export type NavPage =
  | 'applications'
  | 'contacts'
  | 'email-templates'
  | 'forms'
  | 'automations';

export type NavOverlay =
  | 'form-application'
  | 'form-pastor'
  | 'invoice'
  | 'email'
  | 'file-preview'
  | 'background-password';

/** Serializable navigation stack snapshot (deepest open layer last). */
export type NavStack = {
  page: NavPage;
  applicationId?: string;
  contactId?: string;
  termId?: string;
  overlay?: NavOverlay;
};

export const NAV_HISTORY_STATE_KEY = 'crm-nav';

export type NavHistoryState = {
  [NAV_HISTORY_STATE_KEY]: true;
  stack: NavStack;
};

export type NavLayerHistoryState = {
  crmLayer: {
    id: string;
    key: string;
    depth: number;
  };
};

export function isNavHistoryState(state: unknown): state is NavHistoryState {
  return (
    typeof state === 'object' &&
    state !== null &&
    (state as NavHistoryState)[NAV_HISTORY_STATE_KEY] === true
  );
}

export function isNavLayerHistoryState(
  state: unknown,
): state is NavLayerHistoryState {
  return (
    typeof state === 'object' &&
    state !== null &&
    typeof (state as NavLayerHistoryState).crmLayer === 'object'
  );
}

export function getNavStackFromState(state: unknown): NavStack | null {
  if (!isNavHistoryState(state)) return null;
  return state.stack;
}

/** Skip the next popstate after a programmatic history.back() used only to sync the URL stack. */
const ignoreNextPopRef = { current: false };

const popstateListeners = new Set<(event: PopStateEvent) => void>();

let popstateListenerInstalled = false;

function ensurePopstateListener() {
  if (popstateListenerInstalled || typeof window === 'undefined') return;
  popstateListenerInstalled = true;
  window.addEventListener('popstate', (event) => {
    if (ignoreNextPopRef.current) {
      ignoreNextPopRef.current = false;
      return;
    }
    for (const listener of popstateListeners) {
      listener(event);
    }
  });
}

export function pushNavState(stack: NavStack, url?: string) {
  if (typeof window === 'undefined') return;
  ensurePopstateListener();
  const histState: NavHistoryState = { [NAV_HISTORY_STATE_KEY]: true, stack };
  history.pushState(histState, '', url ?? window.location.pathname);
}

export function replaceNavState(stack: NavStack, url?: string) {
  if (typeof window === 'undefined') return;
  ensurePopstateListener();
  const histState: NavHistoryState = { [NAV_HISTORY_STATE_KEY]: true, stack };
  history.replaceState(histState, '', url ?? window.location.pathname);
}

/** User-initiated back (Close, backdrop, Escape, swipe). popstate must run. */
export function goBack() {
  if (typeof window === 'undefined') return;
  history.back();
}

/** Sync browser history after React already dismissed a layer (unmount / cleanup). */
export function syncHistoryBack() {
  if (typeof window === 'undefined') return;
  ignoreNextPopRef.current = true;
  history.back();
}

export function pushLayerHistoryState(id: string, key: string, depth: number) {
  if (typeof window === 'undefined') return;
  ensurePopstateListener();
  const histState: NavLayerHistoryState = {
    crmLayer: { id, key, depth },
  };
  history.pushState(histState, '', window.location.pathname);
}

/**
 * Single global popstate subscription. Mount once in NavigationHistoryProvider.
 */
export function usePopstate(onPop: (event: PopStateEvent) => void) {
  const onPopRef = useRef(onPop);
  onPopRef.current = onPop;

  useEffect(() => {
    ensurePopstateListener();
    const handler = (event: PopStateEvent) => {
      onPopRef.current(event);
    };
    popstateListeners.add(handler);
    return () => {
      popstateListeners.delete(handler);
    };
  }, []);
}
