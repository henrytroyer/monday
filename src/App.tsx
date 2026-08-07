/**
 * Main App component for monday.com application.
 * CrmProviders mount at site start so identity spools before the shell.
 */

import { useEffect, useState } from 'react';
import { LayoutProvider } from './context/LayoutContext';
import { NavigationHistoryProvider } from './context/NavigationHistoryContext';
import CrmProviders from './context/CrmProviders';
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
      <NavigationHistoryProvider>
        <CrmProviders>
          <Dashboard />
        </CrmProviders>
      </NavigationHistoryProvider>
    </LayoutProvider>
  );
}

export default App;
