/**
 * Main App component for monday.com application.
 * Dashboard self-wraps CrmProviders (also required for Admin embed).
 */

import { useEffect, useState } from 'react';
import PhonePreviewShell from './components/dev/PhonePreviewShell';
import { LayoutProvider } from './context/LayoutContext';
import { NavigationHistoryProvider } from './context/NavigationHistoryContext';
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
    <PhonePreviewShell>
      <LayoutProvider>
        <NavigationHistoryProvider>
          <Dashboard />
        </NavigationHistoryProvider>
      </LayoutProvider>
    </PhonePreviewShell>
  );
}

export default App;
