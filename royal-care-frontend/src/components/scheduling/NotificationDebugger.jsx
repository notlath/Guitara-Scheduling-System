import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchNotifications } from '../../features/scheduling/schedulingSlice';

/**
 * Debug component to test notification fetching and display issues
 * This component helps diagnose why notifications might not be showing for all user roles
 */
const NotificationDebugger = () => {
  const [debugInfo, setDebugInfo] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const dispatch = useDispatch();
  
  const { user } = useSelector((state) => state.auth);
  const { notifications, unreadNotificationCount, loading, error } = useSelector((state) => state.scheduling);

  const runDiagnostics = async () => {
    setIsLoading(true);
    console.log("🔍 Running notification diagnostics...");
    
    const info = {
      timestamp: new Date().toISOString(),
      currentUser: user ? {
        id: user.id,
        username: user.username,
        role: user.role,
        email: user.email
      } : null,
      authentication: {
        hasToken: !!localStorage.getItem("knoxToken"),
        tokenLength: localStorage.getItem("knoxToken")?.length || 0
      },
      notificationState: {
        count: notifications?.length || 0,
        unreadCount: unreadNotificationCount,
        loading,
        error,
        hasNotifications: Array.isArray(notifications),
        sampleNotifications: notifications?.slice(0, 3)?.map(n => ({
          id: n.id,
          message: n.message?.substring(0, 50) + "...",
          isRead: n.is_read,
          type: n.notification_type,
          createdAt: n.created_at
        })) || []
      }
    };

    // Try to fetch notifications and see what happens
    try {
      console.log("📡 Fetching notifications...");
      const result = await dispatch(fetchNotifications());
      
      info.fetchResult = {
        type: result.type,
        success: result.type === 'scheduling/fetchNotifications/fulfilled',
        payload: result.payload,
        error: result.error
      };
      
      if (result.type === 'scheduling/fetchNotifications/fulfilled') {
        console.log("✅ Fetch successful", result.payload);
      } else {
        console.error("❌ Fetch failed", result.payload);
      }
    } catch (error) {
      console.error("❌ Fetch exception", error);
      info.fetchResult = {
        exception: error.message,
        success: false
      };
    }

    setDebugInfo(info);
    setIsLoading(false);
  };

  return (
    <div style={{ 
      padding: '20px', 
      margin: '20px', 
      border: '2px solid #ddd', 
      borderRadius: '8px',
      backgroundColor: '#f9f9f9',
      fontFamily: 'monospace'
    }}>
      <h3>🔧 Notification System Debugger</h3>
      
      <button 
        onClick={runDiagnostics} 
        disabled={isLoading}
        style={{
          padding: '10px 20px',
          backgroundColor: '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: isLoading ? 'not-allowed' : 'pointer',
          opacity: isLoading ? 0.6 : 1
        }}
      >
        {isLoading ? 'Running Diagnostics...' : 'Run Diagnostics'}
      </button>

      {debugInfo && (
        <div style={{ marginTop: '20px' }}>
          <h4>🔍 Diagnostic Results ({debugInfo.timestamp})</h4>
          
          <div style={{ marginBottom: '15px' }}>
            <strong>👤 Current User:</strong>
            <pre style={{ backgroundColor: '#fff', padding: '10px', borderRadius: '4px' }}>
              {JSON.stringify(debugInfo.currentUser, null, 2)}
            </pre>
          </div>

          <div style={{ marginBottom: '15px' }}>
            <strong>🔐 Authentication:</strong>
            <pre style={{ backgroundColor: '#fff', padding: '10px', borderRadius: '4px' }}>
              {JSON.stringify(debugInfo.authentication, null, 2)}
            </pre>
          </div>

          <div style={{ marginBottom: '15px' }}>
            <strong>📊 Notification State:</strong>
            <pre style={{ backgroundColor: '#fff', padding: '10px', borderRadius: '4px' }}>
              {JSON.stringify(debugInfo.notificationState, null, 2)}
            </pre>
          </div>

          <div style={{ marginBottom: '15px' }}>
            <strong>📡 Fetch Result:</strong>
            <pre style={{ backgroundColor: '#fff', padding: '10px', borderRadius: '4px' }}>
              {JSON.stringify(debugInfo.fetchResult, null, 2)}
            </pre>
          </div>

          <div style={{ marginTop: '15px', padding: '10px', backgroundColor: '#e9ecef', borderRadius: '4px' }}>
            <strong>💡 Diagnosis:</strong>
            <ul style={{ marginTop: '10px' }}>
              {!debugInfo.currentUser && <li style={{ color: 'red' }}>❌ No current user - authentication issue</li>}
              {!debugInfo.authentication.hasToken && <li style={{ color: 'red' }}>❌ No authentication token</li>}
              {debugInfo.authentication.hasToken && debugInfo.authentication.tokenLength < 20 && 
                <li style={{ color: 'orange' }}>⚠️ Suspicious token length: {debugInfo.authentication.tokenLength}</li>}
              {debugInfo.fetchResult?.success === false && <li style={{ color: 'red' }}>❌ Fetch failed - check network/API</li>}
              {debugInfo.notificationState.count === 0 && debugInfo.fetchResult?.success && 
                <li style={{ color: 'orange' }}>⚠️ No notifications found - possible role/data issue</li>}
              {debugInfo.notificationState.count > 0 && <li style={{ color: 'green' }}>✅ Notifications found: {debugInfo.notificationState.count}</li>}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationDebugger;
