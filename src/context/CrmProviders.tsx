/**
 * CrmProviders.tsx — Self-contained CRM providers for Admin embed + standalone.
 *
 * Mounted from Dashboard (not only App) so Admin → Monday Project, which imports
 * Dashboard without App.tsx, still gets a real CurrentUserProvider.
 */

import type { ReactNode } from 'react';
import { useWorkFocus } from '../hooks/useWorkFocus';
import { CurrentUserProvider } from './CurrentUserContext';

/** Keeps work-focus cache warm for cold-start landing page seeding. */
function WorkFocusSync() {
  useWorkFocus();
  return null;
}

export default function CrmProviders({ children }: { children: ReactNode }) {
  return (
    <CurrentUserProvider>
      <WorkFocusSync />
      {children}
    </CurrentUserProvider>
  );
}
