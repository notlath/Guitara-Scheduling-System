import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';

/**
 * Development-only component for quickly switching between user roles
 * Uses real login API to get valid authentication tokens
 */
const UserRoleSwitcher = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isVisible, setIsVisible] = useState(() => {
    // Check localStorage for user preference, default to true in dev
    return localStorage.getItem('dev-role-switcher-hidden') !== 'true';
  });
  const [isMinimized, setIsMinimized] = useState(() => {
    // Check if user prefers minimized view
    return localStorage.getItem('dev-role-switcher-minimized') === 'true';
  });

  // Load testing helpers into console when component mounts
  useEffect(() => {
    if (import.meta.env.DEV) {
      // Dynamically import and setup testing helpers
      import('../../utils/testingHelpers').then(() => {
        console.log('🧪 Console testing helpers loaded! Try: switchToOperator(), switchToTherapist(), etc.');
      }).catch(err => {
        console.warn('Could not load testing helpers:', err);
      });
    }
  }, []);

  const loginAsUser = async (credentials) => {
    setLoading(true);
    setError('');
    
    try {
      // Use the actual login API to get real tokens
      const response = await api.post('/auth/login/', credentials);
      
      if (response.data.message === "2FA code sent") {
        setError(`2FA required for ${credentials.username}. Use regular login flow.`);
        return;
      }
      
      // Store the real user data and token
      localStorage.setItem("user", JSON.stringify(response.data.user));
      localStorage.setItem("knoxToken", response.data.token);
      
      // Reload to apply changes
      window.location.reload();
      
    } catch (err) {
      console.error('Login failed:', err);
      setError(`Login failed: ${err.response?.data?.error || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Test credentials for different roles
  // NOTE: These need to exist in your database or be created
  const testCredentials = {
    operator: {
      username: "operator1", // You may need to create these users in backend
      password: "testpass123"
    },
    therapist: {
      username: "therapist1", 
      password: "testpass123"
    },
    driver: {
      username: "driver1",
      password: "testpass123"
    }
  };

  const logout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("knoxToken");
    window.location.reload();
  };

  const toggleVisibility = () => {
    const newVisibility = !isVisible;
    setIsVisible(newVisibility);
    localStorage.setItem('dev-role-switcher-hidden', !newVisibility ? 'true' : 'false');
  };

  const toggleMinimized = () => {
    const newMinimized = !isMinimized;
    setIsMinimized(newMinimized);
    localStorage.setItem('dev-role-switcher-minimized', newMinimized ? 'true' : 'false');
  };

  // Only show in development (Vite sets import.meta.env.DEV)
  if (import.meta.env.PROD) {
    return null;
  }

  // Show/hide toggle button when hidden
  if (!isVisible) {
    return (
      <div style={{
        position: 'fixed',
        top: '10px',
        right: '10px',
        background: '#333',
        color: 'white',
        border: 'none',
        borderRadius: '50%',
        width: '40px',
        height: '40px',
        zIndex: 9999,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '16px'
      }} onClick={toggleVisibility} title="Show Role Switcher">
        🧪
      </div>
    );
  }

  return (
    <div style={{
      position: 'fixed',
      top: '10px',
      right: '10px', 
      background: '#f0f0f0',
      border: '1px solid #ccc',
      borderRadius: '8px',
      padding: isMinimized ? '5px' : '10px',
      zIndex: 9999,
      fontSize: '12px',
      minWidth: isMinimized ? 'auto' : '200px',
      transition: 'all 0.2s ease'
    }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: isMinimized ? '0' : '5px' 
      }}>
        <div style={{ fontWeight: 'bold', fontSize: isMinimized ? '10px' : '12px' }}>
          🧪 {isMinimized ? '' : 'Test User Switcher'}
        </div>
        <div style={{ display: 'flex', gap: '2px' }}>
          <button 
            onClick={toggleMinimized}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '10px',
              padding: '2px'
            }}
            title={isMinimized ? 'Expand' : 'Minimize'}
          >
            {isMinimized ? '📋' : '➖'}
          </button>
          <button 
            onClick={toggleVisibility}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '10px',
              padding: '2px'
            }}
            title="Hide (click lab icon to show)"
          >
            ✖️
          </button>
        </div>
      </div>
      
      {!isMinimized && (
        <>
          {error && (
            <div style={{ 
              color: 'red', 
              fontSize: '10px', 
              marginBottom: '5px',
              padding: '3px',
              background: '#ffe6e6',
              borderRadius: '3px'
            }}>
              {error}
            </div>
          )}
          
          <div style={{ display: 'flex', gap: '5px', flexDirection: 'column' }}>
            <button 
              onClick={() => loginAsUser(testCredentials.operator)}
              disabled={loading}
              style={{ opacity: loading ? 0.6 : 1 }}
            >
              👨‍💼 {loading ? 'Logging in...' : 'Operator'}
            </button>
            <button 
              onClick={() => loginAsUser(testCredentials.therapist)}
              disabled={loading}
              style={{ opacity: loading ? 0.6 : 1 }}
            >
              🧘‍♀️ {loading ? 'Logging in...' : 'Therapist'}
            </button>
            <button 
              onClick={() => loginAsUser(testCredentials.driver)}
              disabled={loading}
              style={{ opacity: loading ? 0.6 : 1 }}
            >
              🚗 {loading ? 'Logging in...' : 'Driver'}
            </button>
            <button 
              onClick={logout} 
              disabled={loading}
              style={{ 
                background: '#ff6b6b', 
                color: 'white',
                opacity: loading ? 0.6 : 1
              }}
            >
              🚪 Logout
            </button>
          </div>
          
          <div style={{ fontSize: '10px', marginTop: '5px', color: '#666' }}>
            Note: Test users must exist in database
          </div>
        </>
      )}
    </div>
  );
};

export default UserRoleSwitcher;
