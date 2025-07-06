import { useEmailVerificationCheck } from "../../hooks/useEmailVerificationCheck";

/**
 * Wrapper component that handles email verification checks
 * Must be used inside Router context
 */
const EmailVerificationWrapper = ({ children }) => {
  // This hook will handle redirecting unverified users to /verify-email
  // It's safe to use here since this component is inside BrowserRouter
  try {
    useEmailVerificationCheck();
  } catch (error) {
    // If the hook fails (e.g., not in Router context), just log and continue
    console.warn("Email verification check failed:", error);
  }

  return children;
};

export default EmailVerificationWrapper;
