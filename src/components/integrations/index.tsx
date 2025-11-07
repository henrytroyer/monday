/**
 * Integration Component
 * This is a starter template for building integrations on monday.com
 * Integrations can connect external services and automate workflows
 */

import { useEffect, useState } from 'react';
import mondaySdk from 'monday-sdk-js';
import type { MondayContext, MondayResponse } from '../../types/monday';

const monday = mondaySdk();

const IntegrationComponent: React.FC = () => {
  const [context, setContext] = useState<MondayContext | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    monday.setApiVersion('2023-10');

    monday.listen('context', (res: MondayResponse<MondayContext>) => {
      setContext(res.data);
    });

    // Check if integration is already connected
    checkConnection();
  }, []);

  const checkConnection = async () => {
    try {
      // Example: Check OAuth token
      // Note: OAuth implementation depends on your integration type
      // For now, check if we have a stored token in settings
      const token = await monday.get('oauth_token');
      setIsConnected(!!token);
    } catch (error) {
      console.error('Error checking connection:', error);
      setIsConnected(false);
    }
  };

  const handleConnect = async () => {
    // Example: Initiate OAuth flow
    // This would typically redirect to external service for authorization
    console.log('Initiating OAuth connection...');
    // Implementation depends on the external service you're integrating with
  };

  const handleDisconnect = async () => {
    // Example: Clear OAuth token
    console.log('Disconnecting integration...');
    setIsConnected(false);
  };

  return (
    <div style={{ padding: '20px' }}>
      <h2>Integration Component</h2>
      <p>Build your custom integration here.</p>
      
      <div style={{ marginTop: '20px' }}>
        <p>Status: {isConnected ? 'Connected' : 'Not Connected'}</p>
        {!isConnected ? (
          <button
            onClick={handleConnect}
            style={{
              padding: '10px 20px',
              backgroundColor: '#0073ea',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Connect Integration
          </button>
        ) : (
          <button
            onClick={handleDisconnect}
            style={{
              padding: '10px 20px',
              backgroundColor: '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Disconnect
          </button>
        )}
      </div>

      {context && (
        <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#f5f5f5', borderRadius: '8px' }}>
          <h3>Integration Context:</h3>
          <pre style={{ fontSize: '12px', overflow: 'auto' }}>
            {JSON.stringify(context, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};

export default IntegrationComponent;

