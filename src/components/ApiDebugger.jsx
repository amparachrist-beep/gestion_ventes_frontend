import { useState } from 'react';
import { debugAPI } from '../api';

export default function ApiDebugger() {
  const [results, setResults] = useState({});
  const [currentUrl, setCurrentUrl] = useState('');
  const [loading, setLoading] = useState(false);

  const urlsToTest = [
    '/profil/me/',
    '/profils/me/',
    '/auth/profil/me/',
    '/api/profil/me/',
    '/token/',
    '/auth/token/',
    '/reports/sales/',
    '/reports/sales/weekly/',
    '/reports/sales/?period=weekly',
    '/stats/sales/',
    '/stats/sales/?period=weekly',
    '/depenses/stats_weekly/',
    '/abonnement/current/',
    '/abonnements/current/',
  ];

  const testUrl = async (url) => {
    setLoading(true);
    setCurrentUrl(url);
    try {
      const response = await debugAPI.testUrl(url);
      setResults(prev => ({
        ...prev,
        [url]: {
          status: response.status,
          success: true,
          data: response.data
        }
      }));
    } catch (error) {
      setResults(prev => ({
        ...prev,
        [url]: {
          status: error.response?.status || 'Network Error',
          success: false,
          error: error.message,
          data: error.response?.data
        }
      }));
    } finally {
      setLoading(false);
    }
  };

  const testAllUrls = async () => {
    for (const url of urlsToTest) {
      await testUrl(url);
      // Petit délai pour ne pas surcharger le serveur
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>API Debugger</h1>

      <div style={{ marginBottom: '20px' }}>
        <button
          onClick={testAllUrls}
          disabled={loading}
          style={{ padding: '10px', background: '#4CAF50', color: 'white', border: 'none', borderRadius: '4px' }}
        >
          {loading ? 'Testing...' : 'Test All URLs'}
        </button>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h3>URLs to Test:</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
          {urlsToTest.map(url => (
            <button
              key={url}
              onClick={() => testUrl(url)}
              disabled={loading}
              style={{
                padding: '5px 10px',
                background: results[url]?.success ? '#4CAF50' : '#f44336',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                fontSize: '12px'
              }}
            >
              {url}
            </button>
          ))}
        </div>
      </div>

      {currentUrl && (
        <div style={{ marginBottom: '20px' }}>
          <h3>Current Test: {currentUrl}</h3>
          {loading ? (
            <p>Loading...</p>
          ) : (
            <div style={{
              padding: '10px',
              background: results[currentUrl]?.success ? '#e8f5e9' : '#ffebee',
              borderRadius: '4px'
            }}>
              <p><strong>Status:</strong> {results[currentUrl]?.status}</p>
              <p><strong>Success:</strong> {results[currentUrl]?.success ? 'Yes' : 'No'}</p>
              {!results[currentUrl]?.success && (
                <p><strong>Error:</strong> {results[currentUrl]?.error}</p>
              )}
              {results[currentUrl]?.data && (
                <details>
                  <summary>Response Data</summary>
                  <pre>{JSON.stringify(results[currentUrl].data, null, 2)}</pre>
                </details>
              )}
            </div>
          )}
        </div>
      )}

      <div>
        <h3>All Results:</h3>
        <pre style={{
          background: '#f5f5f5',
          padding: '10px',
          borderRadius: '4px',
          overflow: 'auto',
          maxHeight: '400px'
        }}>
          {JSON.stringify(results, null, 2)}
        </pre>
      </div>
    </div>
  );
}