import React, { useState } from 'react';
import DisabledAccountAlert from '../auth/DisabledAccountAlert';

const DisabledAccountDemo = () => {
  const [showAlert, setShowAlert] = useState(false);
  const [accountType, setAccountType] = useState('therapist');

  const testScenarios = [
    { type: 'therapist', message: 'Your therapist account is currently inactive. Please contact your supervisor for assistance.' },
    { type: 'driver', message: 'Your driver account is currently inactive. Please contact your supervisor for assistance.' },
    { type: 'operator', message: 'Your operator account is currently inactive. Please contact your administrator for assistance.' },
    { type: 'account', message: 'Your account has been disabled. Please contact support for assistance.' }
  ];

  const handleTestScenario = (scenario) => {
    setAccountType(scenario.type);
    setShowAlert(true);
  };

  const handleContactSupport = () => {
    console.log('Contact support clicked for:', accountType);
    alert(`Contacting support for ${accountType} account`);
  };

  const handleBackToHome = () => {
    setShowAlert(false);
  };

  return (
    <div style={{ padding: '2rem', backgroundColor: '#f5f5f5', minHeight: '100vh' }}>
      <h2>Disabled Account Alert Demo</h2>
      <p>Test different disabled account scenarios:</p>
      
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
        {testScenarios.map((scenario, index) => (
          <button
            key={index}
            onClick={() => handleTestScenario(scenario)}
            style={{
              padding: '0.5rem 1rem',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              textTransform: 'capitalize'
            }}
          >
            Test {scenario.type} Disabled
          </button>
        ))}
      </div>

      {showAlert && (
        <DisabledAccountAlert
          accountType={accountType}
          errorMessage={testScenarios.find(s => s.type === accountType)?.message}
          onContactSupport={handleContactSupport}
          onBackToHome={handleBackToHome}
        />
      )}
      
      <div style={{ marginTop: '2rem', padding: '1rem', backgroundColor: 'white', borderRadius: '8px' }}>
        <h3>Implementation Features:</h3>
        <ul>
          <li>✅ Enhanced auth service with specific error handling</li>
          <li>✅ Beautiful disabled account alert modal</li>
          <li>✅ Role-specific messaging (Therapist, Driver, Operator)</li>
          <li>✅ Contact support integration with pre-filled emails</li>
          <li>✅ Responsive design with animations</li>
          <li>✅ Error handling utilities for reusability</li>
          <li>✅ Clear user guidance and next steps</li>
        </ul>
      </div>
    </div>
  );
};

export default DisabledAccountDemo;
