/**
 * CrmProviders.tsx — Self-contained CRM providers for Admin embed + standalone.
 *
 * Mounted from App at site start so CurrentUser spools before the Dashboard shell.
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
