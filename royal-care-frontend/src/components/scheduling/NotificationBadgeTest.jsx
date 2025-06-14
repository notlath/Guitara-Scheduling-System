import React from 'react';
import { MdNotifications } from 'react-icons/md';

/**
 * Test component to verify notification badge styling
 * This shows how the notification button should look with different badge counts
 */
const NotificationBadgeTest = () => {
  const testCases = [
    { count: 0, label: 'No notifications' },
    { count: 1, label: 'Single notification' },
    { count: 5, label: 'Multiple notifications' },
    { count: 12, label: 'Double digit' },
    { count: 99, label: 'High count' },
  ];

  return (
    <div style={{ 
      padding: '20px', 
      backgroundColor: '#f8f9fa',
      fontFamily: '"Plus Jakarta Sans", sans-serif' 
    }}>
      <h2>Notification Badge Test</h2>
      <p>Testing notification badge appearance with different counts</p>
      
      <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', marginTop: '20px' }}>
        {testCases.map(({ count, label }) => (
          <div key={count} style={{ textAlign: 'center' }}>
            <div style={{ marginBottom: '10px' }}>
              <button
                className="notification-button"
                style={{
                  padding: '12px',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minWidth: '50px',
                  minHeight: '50px',
                }}
                title={`Notifications (${count})`}
              >
                <MdNotifications size={20} />
                {count > 0 && (
                  <span className="notification-badge">
                    {count}
                  </span>
                )}
              </button>
            </div>
            <div style={{ fontSize: '12px', color: '#666' }}>
              {label}<br />
              ({count})
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: '30px', padding: '15px', backgroundColor: 'white', borderRadius: '8px' }}>
        <h3>Expected Behavior:</h3>
        <ul style={{ textAlign: 'left', margin: 0 }}>
          <li>Badge should only appear when count {'>'}  0</li>
          <li>Badge should have red/orange gradient background</li>
          <li>Badge should pulse with animation</li>
          <li>Badge should be positioned at top-right of button</li>
          <li>Numbers should be white and bold</li>
          <li>Badge should have subtle shadow</li>
        </ul>
      </div>
    </div>
  );
};

export default NotificationBadgeTest;
