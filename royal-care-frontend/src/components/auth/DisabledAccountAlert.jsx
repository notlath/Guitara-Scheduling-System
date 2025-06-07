import React from 'react';
import styles from './DisabledAccountAlert.module.css';

const DisabledAccountAlert = ({ 
  accountType = 'account', 
  errorMessage, 
  onContactSupport,
  onBackToHome 
}) => {
  const getAccountTypeInfo = (type) => {
    const typeMap = {
      therapist: {
        title: 'Therapist Account Disabled',
        contact: 'your supervisor or administrator',
        email: 'supervisor@guitara.com'
      },
      driver: {
        title: 'Driver Account Disabled',
        contact: 'your supervisor or administrator',
        email: 'supervisor@guitara.com'
      },
      operator: {
        title: 'Operator Account Disabled',
        contact: 'the administrator',
        email: 'admin@guitara.com'
      },
      default: {
        title: 'Account Disabled',
        contact: 'support',
        email: 'support@guitara.com'
      }
    };
    
    return typeMap[type.toLowerCase()] || typeMap.default;
  };

  const accountInfo = getAccountTypeInfo(accountType);

  const handleContactSupport = () => {
    if (onContactSupport) {
      onContactSupport();
    } else {
      window.location.href = `mailto:${accountInfo.email}?subject=Account Access Issue&body=Hello, I am unable to access my ${accountType} account. Please assist me with reactivating my account.`;
    }
  };

  const handleBackToHome = () => {
    if (onBackToHome) {
      onBackToHome();
    } else {
      window.location.href = '/';
    }
  };

  return (
    <div className={styles.alertContainer}>
      <div className={styles.alertCard}>
        <div className={styles.alertIcon}>
          <svg 
            className={styles.warningIcon} 
            fill="currentColor" 
            viewBox="0 0 20 20"
          >
            <path 
              fillRule="evenodd" 
              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" 
              clipRule="evenodd" 
            />
          </svg>
        </div>
        
        <div className={styles.alertContent}>
          <h3 className={styles.alertTitle}>{accountInfo.title}</h3>
          
          <div className={styles.alertMessage}>
            {errorMessage ? (
              <p>{errorMessage}</p>
            ) : (
              <p>
                Your {accountType} account has been disabled and you cannot log in at this time.
              </p>
            )}
          </div>

          <div className={styles.reasonsList}>
            <p className={styles.reasonsTitle}>This may be due to:</p>
            <ul>
              <li>Administrative action</li>
              <li>Security policy violations</li>
              <li>Account maintenance</li>
              <li>Temporary suspension</li>
            </ul>
          </div>

          <div className={styles.contactInfo}>
            <p>
              Please contact <strong>{accountInfo.contact}</strong> for assistance with reactivating your account.
            </p>
          </div>

          <div className={styles.actionButtons}>
            <button 
              className={styles.primaryButton}
              onClick={handleContactSupport}
            >
              <svg 
                className={styles.buttonIcon} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" 
                />
              </svg>
              Contact Support
            </button>
            
            <button 
              className={styles.secondaryButton}
              onClick={handleBackToHome}
            >
              <svg 
                className={styles.buttonIcon} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M10 19l-7-7m0 0l7-7m-7 7h18" 
                />
              </svg>
              Back to Home
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DisabledAccountAlert;
