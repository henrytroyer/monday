/**
 * Hello World component demonstrating monday.com SDK integration
 * This component listens for context events and displays monday.com data
 */

import { useMondayContext } from '../hooks/useMondayContext';
import { getSettings } from '../utils/mondayHelpers';
import { useEffect } from 'react';
import '../App.css';

interface HelloWorldProps {
  // Add props as needed for future customization
}

const HelloWorld: React.FC<HelloWorldProps> = () => {
  const { context, isLoading, error } = useMondayContext();

  useEffect(() => {
    // Load settings (for future use)
    getSettings().then(() => {
      // Settings loaded, can be used as needed
    });
  }, []);

  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p className="loading-text">Loading monday.com context...</p>
        <p className="loading-subtext">
          If this takes too long, the app will continue without context.
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <p><strong>Error:</strong> {error}</p>
      </div>
    );
  }

  return (
    <div className="app">
      <div className="main-header">
        <h1 className="main-title">Hello monday.com!</h1>
        <p className="main-subtitle">
          Welcome to your monday.com app built with React and TypeScript.
        </p>
      </div>
      
      {context ? (
        <div className="context-card">
          <div className="context-header">
            <h2 className="context-title">Context Data</h2>
          </div>
          <div className="context-data">
            <pre>{JSON.stringify(context, null, 2)}</pre>
          </div>
        </div>
      ) : (
        <div className="warning-card">
          <p className="warning-text">
            <strong>Note:</strong> Running without monday.com context. This is normal when testing standalone. 
            Context will be available when the app runs inside monday.com.
          </p>
        </div>
      )}

      <div className="info-card">
        <h3 className="info-title">Next Steps</h3>
        <ul className="info-list">
          <li>Build dashboard widgets in <code>src/components/dashboard-widgets/</code></li>
          <li>Create custom forms in <code>src/components/forms/</code></li>
          <li>Develop integrations in <code>src/components/integrations/</code></li>
          <li>Use the monday.com GraphQL API for data operations</li>
        </ul>
      </div>
    </div>
  );
};

export default HelloWorld;

