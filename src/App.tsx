/**
 * Main App component for monday.com application
 */

import { useEffect, useState } from 'react';
import { CurrentUserProvider } from './context/CurrentUserContext';
import { LayoutProvider } from './context/LayoutContext';
import { NavigationHistoryProvider } from './context/NavigationHistoryContext';
import { PermissionsProvider } from './context/PermissionsContext';
import PermissionDeniedToast from './permissions/PermissionDeniedToast';
import Dashboard from './pages/Dashboard';
import OAuthCallback from './pages/OAuthCallback';

function App() {
  const [isCallback, setIsCallback] = useState(false);

  useEffect(() => {
    setIsCallback(window.location.pathname === '/oauth/callback');
  }, []);

  if (isCallback) {
    return <OAuthCallback />;
  }

  return (
    <LayoutProvider>
      <CurrentUserProvider>
        <PermissionsProvider>
          <NavigationHistoryProvider>
            <Dashboard />
            <PermissionDeniedToast />
          </NavigationHistoryProvider>
        </PermissionsProvider>
      </CurrentUserProvider>
    </LayoutProvider>
  );
}

export default App;
