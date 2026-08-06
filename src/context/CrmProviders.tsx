/**
 * CrmProviders.tsx — Self-contained CRM providers for Admin embed + standalone.
 *
 * deploy-monday-crm rebuilds hosting with the monday clone but does not always
 * ship i58finance MondayProjectAdmin changes. Dashboard must not require the
 * host to wrap PermissionsProvider.
 */

import type { ReactNode } from 'react';
import { CurrentUserProvider } from './CurrentUserContext';
import { PermissionsProvider } from './PermissionsContext';
import PermissionDeniedToast from '../permissions/PermissionDeniedToast';

export default function CrmProviders({ children }: { children: ReactNode }) {
  return (
    <CurrentUserProvider>
      <PermissionsProvider>
        {children}
        <PermissionDeniedToast />
      </PermissionsProvider>
    </CurrentUserProvider>
  );
}
