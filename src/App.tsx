/**
 * Main App component for monday.com application
 * This serves as the entry point for the monday.com app
 */

import { useEffect, useState } from 'react';
import HelloWorld from './components/HelloWorld';
import OAuthCallback from './pages/OAuthCallback';
import './App.css';

function App() {
  const [isCallback, setIsCallback] = useState(false);

  useEffect(() => {
    // Check if we're on the OAuth callback route
    setIsCallback(window.location.pathname === '/oauth/callback');
  }, []);

  // Show OAuth callback page if on callback route
  if (isCallback) {
    return <OAuthCallback />;
  }

  // Otherwise show main app
  return <HelloWorld />;
}

export default App;
