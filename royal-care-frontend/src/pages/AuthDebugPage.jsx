import React, { useEffect, useState } from 'react';
import { getToken, debugTokenStatus } from '../../utils/tokenManager';

const AuthDebugPage = () => {
  const [debugInfo, setDebugInfo] = useState({});

  useEffect(() => {
    const token = getToken();
    const hasToken = !!token;
    
    const debugData = {
      hasToken,
      tokenPreview: token ? token.substring(0, 20) + '...' : 'No token',
      localStorage: {
        knoxToken: localStorage.getItem('knoxToken'),
        token: localStorage.getItem('token'),
        authToken: localStorage.getItem('authToken'),
        user: localStorage.getItem('user'),
      },
      sessionStorage: {
        token: sessionStorage.getItem('token'),
      }
    };
    
    setDebugInfo(debugData);
    
    // Call debug function
    debugTokenStatus();
  }, []);

  const testApiCall = async () => {
    const token = getToken();
    console.log('Testing API call with token:', token ? token.substring(0, 20) + '...' : 'NO TOKEN');
    
    try {
      const response = await fetch('http://localhost:8000/api/system-logs/?log_type=auth&page=1&page_size=5', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('API Response Status:', response.status);
      const data = await response.json();
      console.log('API Response Data:', data);
      
      alert(`API Response: ${response.status} - ${JSON.stringify(data)}`);
    } catch (error) {
      console.error('API Error:', error);
      alert(`API Error: ${error.message}`);
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>Authentication Debug Page</h1>
      
      <h2>Token Information</h2>
      <pre>{JSON.stringify(debugInfo, null, 2)}</pre>
      
      <h2>Actions</h2>
      <button onClick={testApiCall} style={{ padding: '10px', margin: '5px' }}>
        Test Logs API Call
      </button>
      
      <button onClick={() => window.location.href = '/logs'} style={{ padding: '10px', margin: '5px' }}>
        Go to Logs Page
      </button>
      
      <button onClick={() => window.location.href = '/login'} style={{ padding: '10px', margin: '5px' }}>
        Go to Login Page
      </button>
    </div>
  );
};

export default AuthDebugPage;
