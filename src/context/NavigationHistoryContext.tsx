import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from 'react';
import {
  goBack as browserGoBack,
  pushLayerHistoryState,
  replaceNavState,
  syncHistoryBack,
  usePopstate,
  type NavPage,
} from '../hooks/useNavigationHistory';

type StackEntry = {
  id: string;
  key: string;
  close: () => void;
};

type NavigationHistoryContextValue = {
  pushLayer: (key: string, close: () => void) => string;
  goBack: () => void;
  dismissLayer: (id: string) => void;
  abandonLayer: (id: string) => void;
};

const NavigationHistoryContext =
  createContext<NavigationHistoryContextValue | null>(null);

let layerSeq = 0;
const stack: StackEntry[] = [];
let rootInitialized = false;

function initHistoryRoot(page: NavPage = 'applications') {
  if (rootInitialized || typeof window === 'undefined') return;
  rootInitialized = true;
  replaceNavState({ page });
}

export function NavigationHistoryProvider({ children }: { children: ReactNode }) {
  const handlingPopRef = useRef(false);

  useEffect(() => {
    initHistoryRoot();
  }, []);

  usePopstate(() => {
    if (stack.length === 0) {
      replaceNavState({ page: 'applications' });
      return;
    }

    handlingPopRef.current = true;
    const entry = stack.pop();
    entry?.close();
    handlingPopRef.current = false;
  });

  const pushLayer = useCallback((key: string, close: () => void) => {
    initHistoryRoot();
    const id = `nav-${++layerSeq}`;
    stack.push({ id, key, close });
    pushLayerHistoryState(id, key, stack.length);
    return id;
  }, []);

  const goBack = useCallback(() => {
    if (stack.length === 0) return;
    browserGoBack();
  }, []);

  const dismissLayer = useCallback((id: string) => {
    if (handlingPopRef.current) return;
    const idx = stack.findIndex((entry) => entry.id === id);
    if (idx < 0) return;
    if (idx !== stack.length - 1) {
      stack.splice(idx, 1);
      return;
    }
    syncHistoryBack();
  }, []);

  const abandonLayer = useCallback((id: string) => {
    const idx = stack.findIndex((entry) => entry.id === id);
    if (idx < 0) return;
    const isTop = idx === stack.length - 1;
    stack.splice(idx, 1);
    if (isTop && !handlingPopRef.current) {
      syncHistoryBack();
    }
  }, []);

  const value = useMemo(
    () => ({ pushLayer, goBack, dismissLayer, abandonLayer }),
    [pushLayer, goBack, dismissLayer, abandonLayer],
  );

  return (
    <NavigationHistoryContext.Provider value={value}>
      {children}
    </NavigationHistoryContext.Provider>
  );
}

export function useNavigationHistory() {
  const ctx = useContext(NavigationHistoryContext);
  if (!ctx) {
    throw new Error(
      'useNavigationHistory must be used within NavigationHistoryProvider',
    );
  }
  return ctx;
}

/**
 * Syncs an open overlay/panel with the browser history stack so swipe-back,
 * Close, backdrop, and Escape all dismiss one layer via goBack().
 */
export function useNavLayer(
  isOpen: boolean,
  onClose: () => void,
  layerKey: string,
): { requestClose: () => void } {
  const { pushLayer, goBack, dismissLayer, abandonLayer } =
    useNavigationHistory();
  const layerIdRef = useRef<string | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!isOpen) return;

    const id = pushLayer(layerKey, () => {
      layerIdRef.current = null;
      onCloseRef.current();
    });
    layerIdRef.current = id;

    return () => {
      if (layerIdRef.current === id) {
        abandonLayer(id);
        layerIdRef.current = null;
      }
    };
  }, [isOpen, layerKey, pushLayer, abandonLayer]);

  useEffect(() => {
    if (!isOpen && layerIdRef.current) {
      const id = layerIdRef.current;
      layerIdRef.current = null;
      dismissLayer(id);
    }
  }, [isOpen, dismissLayer]);

  return useMemo(() => ({ requestClose: goBack }), [goBack]);
}
