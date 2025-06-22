import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { login } from "../features/auth/authSlice";
import { debugTokenStatus, getToken, setToken } from "../utils/tokenManager";

/**
 * LoginWrapper Component
 *
 * This component handles synchronization of authentication state across tabs and
 * ensures consistent token handling by:
 *
 * 1. Listening for storage events to detect login/logout in other tabs
 * 2. Ensuring token consistency across multiple tabs
 * 3. Helping with token migration
 * 4. Providing user feedback on token status
 */
const LoginWrapper = ({ children }) => {
  const dispatch = useDispatch();

  useEffect(() => {
    // Check for token inconsistencies on component mount
    const tokenStatus = debugTokenStatus();

    if (tokenStatus.hasKnoxToken && !tokenStatus.areTokensConsistent) {
      console.log("🔄 Fixing token inconsistencies across storage keys");
      // If we have the main token but others are inconsistent, fix them
      const token = getToken();
      if (token) {
        setToken(token);
      }
    }

    // Listen for changes in another tab
    const handleStorageChange = (e) => {
      // Only react to relevant storage keys
      if (
        e.key === "knoxToken" ||
        e.key === "token" ||
        e.key === "authToken" ||
        e.key === "user"
      ) {
        console.log(`🔄 Storage change detected in key: ${e.key}`);

        // If token was added in another tab
        if (e.newValue && !e.oldValue) {
          console.log("👤 User logged in from another tab");

          // Ensure token consistency
          const token = getToken();
          if (token) {
            setToken(token);
          }

          // Try to get user data
          try {
            const userData = localStorage.getItem("user");
            if (userData) {
              const user = JSON.parse(userData);
              dispatch(login(user));
            }
          } catch (err) {
            console.error("Error parsing user data from storage", err);
          }
        }

        // If token was removed in another tab
        if (e.oldValue && !e.newValue && e.key.includes("Token")) {
          console.log("👋 User logged out from another tab");
          // We don't forcefully log out this tab, just ensure tokens are consistent
          // This allows different user sessions in different tabs
          debugTokenStatus();
        }
      }
    };

    // Add storage event listener
    window.addEventListener("storage", handleStorageChange);

    // Cleanup
    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [dispatch]);

  return children;
};

export default LoginWrapper;
