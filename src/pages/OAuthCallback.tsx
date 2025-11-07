/**
 * OAuth Callback Page
 * Handles OAuth redirects from monday.com
 * Accessible at: /oauth/callback
 */

import { useEffect, useState } from 'react';
import '../App.css';

const OAuthCallback: React.FC = () => {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    // Get URL parameters
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const error = params.get('error');
    const errorDescription = params.get('error_description');

    if (error) {
      setStatus('error');
      setMessage(errorDescription || `OAuth error: ${error}`);
      return;
    }

    if (code) {
      // Authorization code received
      console.log('Authorization code received:', code);
      setStatus('success');
      setMessage('Authorization successful! You can close this window.');
      
      // For client-side apps, monday.com SDK handles tokens automatically
      // You can store the code if needed for server-side token exchange
      
      // Optional: Send code to parent window if opened in popup
      if (window.opener) {
        window.opener.postMessage({ type: 'oauth_success', code }, '*');
        window.close();
      }
    } else {
      setStatus('error');
      setMessage('No authorization code received');
    }
  }, []);

  return (
    <div className="app">
      <div className="card" style={{ maxWidth: '500px', margin: 'var(--spacing-2xl) auto', textAlign: 'center' }}>
        {status === 'loading' && (
          <>
            <div className="loading-spinner" style={{ margin: '0 auto var(--spacing-md)' }}></div>
            <h2 className="context-title">Processing authorization...</h2>
            <p className="loading-subtext">Please wait...</p>
          </>
        )}
        
        {status === 'success' && (
          <>
            <div style={{ 
              width: '64px', 
              height: '64px', 
              borderRadius: '50%', 
              backgroundColor: 'var(--success-light)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto var(--spacing-lg)',
              fontSize: '32px'
            }}>
              ✓
            </div>
            <h2 style={{ color: 'var(--success)', marginBottom: 'var(--spacing-md)' }}>
              Authorization Successful!
            </h2>
            <p className="main-subtitle">{message}</p>
            <p style={{ marginTop: 'var(--spacing-lg)', fontSize: 'var(--font-size-sm)', color: 'var(--monday-gray-500)' }}>
              You can close this window and return to monday.com
            </p>
          </>
        )}
        
        {status === 'error' && (
          <>
            <div style={{ 
              width: '64px', 
              height: '64px', 
              borderRadius: '50%', 
              backgroundColor: 'var(--error-light)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto var(--spacing-lg)',
              fontSize: '32px',
              color: 'var(--error)'
            }}>
              ✗
            </div>
            <h2 style={{ color: 'var(--error)', marginBottom: 'var(--spacing-md)' }}>
              Authorization Failed
            </h2>
            <p className="error-container" style={{ marginBottom: 'var(--spacing-lg)' }}>{message}</p>
            <button
              onClick={() => window.close()}
              className="button button-primary"
            >
              Close
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default OAuthCallback;

