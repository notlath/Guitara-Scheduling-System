import { useEffect, useState } from "react";
import { pollAccountStatus } from "../../services/auth";
import styles from "./DisabledAccountAlert.module.css";

const DisabledAccountAlert = ({
  accountType = "account",
  errorMessage,
  username,
  onContactSupport,
  onBackToHome,
  onAccountReEnabled,
  showRetryOption = false,
}) => {
  const [isPolling, setIsPolling] = useState(false);
  const [pollingStatus, setPollingStatus] = useState(null);
  const [retryAttempt, setRetryAttempt] = useState(0);

  const getAccountTypeInfo = (type) => {
    const typeMap = {
      therapist: {
        title: "Therapist Account Disabled",
        contact: "your supervisor or administrator",
        email: "supervisor@guitara.com",
      },
      driver: {
        title: "Driver Account Disabled",
        contact: "your supervisor or administrator",
        email: "supervisor@guitara.com",
      },
      operator: {
        title: "Operator Account Disabled",
        contact: "the administrator",
        email: "admin@guitara.com",
      },
      default: {
        title: "Account Disabled",
        contact: "support",
        email: "support@guitara.com",
      },
    };

    return typeMap[type.toLowerCase()] || typeMap.default;
  };

  const accountInfo = getAccountTypeInfo(accountType);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      setIsPolling(false);
    };
  }, []);

  const startPolling = async () => {
    if (!username || isPolling) return;
    
    setIsPolling(true);
    setPollingStatus({ message: "Checking account status...", attempt: 0 });
    
    try {
      const result = await pollAccountStatus(
        username,
        (status) => {
          setPollingStatus(status);
          setRetryAttempt(status.attempt);
        },
        60, // Poll for up to 5 minutes
        5000 // Check every 5 seconds
      );
      
      if (result.success) {
        setPollingStatus({ 
          message: "Account has been re-enabled! You can now log in.", 
          attempt: result.attempts 
        });
        
        // Notify parent component that account is re-enabled
        if (onAccountReEnabled) {
          setTimeout(() => {
            onAccountReEnabled();
          }, 2000); // Give user time to see the message
        }
      } else {
        setPollingStatus({ 
          message: "Account is still disabled. Please contact support for assistance.", 
          attempt: result.attempts 
        });
      }
    } catch (error) {
      console.error("Error polling account status:", error);
      setPollingStatus({ 
        message: "Unable to check account status. Please try logging in manually.", 
        attempt: retryAttempt 
      });
    } finally {
      setIsPolling(false);
    }
  };

  const stopPolling = () => {
    setIsPolling(false);
    setPollingStatus(null);
    setRetryAttempt(0);
  };

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
      window.location.href = "/";
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
                Your {accountType} account has been disabled and you cannot log
                in at this time.
              </p>
            )}
          </div>

          {/* Polling Status Display */}
          {pollingStatus && (
            <div className={styles.pollingStatus}>
              <p className={isPolling ? styles.pollingActive : styles.pollingComplete}>
                {pollingStatus.message}
              </p>
              {isPolling && (
                <div className={styles.pollingProgress}>
                  <span>Checking... (Attempt {pollingStatus.attempt}/60)</span>
                  <div className={styles.loadingSpinner}></div>
                </div>
              )}
            </div>
          )}

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
              Please contact <strong>{accountInfo.contact}</strong> for
              assistance with reactivating your account.
            </p>
            {showRetryOption && username && (
              <p className={styles.retryInfo}>
                If your account has been re-enabled by an administrator, you can check its status automatically.
              </p>
            )}
          </div>

          <div className={styles.actionButtons}>
            {/* Auto-retry button (only show if username provided and retry is enabled) */}
            {showRetryOption && username && (
              <>
                {!isPolling ? (
                  <button
                    className={styles.retryButton}
                    onClick={startPolling}
                    disabled={isPolling}
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
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                      />
                    </svg>
                    Check Account Status
                  </button>
                ) : (
                  <button
                    className={styles.stopButton}
                    onClick={stopPolling}
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
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                    Stop Checking
                  </button>
                )}
              </>
            )}

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