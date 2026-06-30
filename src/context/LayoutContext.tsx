import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

interface LayoutContextValue {
  detailMode: boolean;
  setDetailMode: (active: boolean) => void;
  sidebarOpen: boolean;
  openSidebar: () => void;
  closeSidebar: () => void;
}

const LayoutContext = createContext<LayoutContextValue | null>(null);

export function LayoutProvider({ children }: { children: ReactNode }) {
  const [detailMode, setDetailModeState] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const setDetailMode = useCallback((active: boolean) => {
    setDetailModeState(active);
    if (!active) setSidebarOpen(false);
  }, []);

  const openSidebar = useCallback(() => setSidebarOpen(true), []);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  const value = useMemo(
    () => ({
      detailMode,
      setDetailMode,
      sidebarOpen,
      openSidebar,
      closeSidebar,
    }),
    [detailMode, setDetailMode, sidebarOpen, openSidebar, closeSidebar],
  );

  return (
    <LayoutContext.Provider value={value}>{children}</LayoutContext.Provider>
  );
}

export function useLayout() {
  const ctx = useContext(LayoutContext);
  if (!ctx) {
    throw new Error('useLayout must be used within LayoutProvider');
  }
  return ctx;
}
