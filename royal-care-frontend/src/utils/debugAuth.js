// Debug utility to check current authentication state
import { forceLogout, validateTokenAndDebug } from "./authUtils";

export const debugAuth = () => {
  console.log("🔍 Authentication Debug Report:");

  // Check localStorage
  const knoxToken = localStorage.getItem("knoxToken");
  const user = localStorage.getItem("user");

  console.log("📁 LocalStorage:", {
    hasKnoxToken: !!knoxToken,
    tokenLength: knoxToken?.length || 0,
    tokenPreview: knoxToken
      ? `${knoxToken.substring(0, 10)}...${knoxToken.substring(
          knoxToken.length - 10
        )}`
      : "None",
    hasUser: !!user,
    userData: user ? JSON.parse(user) : null,
  });

  // Check if token format is correct
  if (knoxToken) {
    const isValidFormat =
      !knoxToken.startsWith("Token ") && knoxToken.length > 20;
    console.log("🔑 Token Analysis:", {
      format: isValidFormat ? "Valid" : "Invalid",
      startsWithToken: knoxToken.startsWith("Token "),
      length: knoxToken.length,
      recommendation: isValidFormat
        ? "Token looks good"
        : "Token may be malformed",
    });
  }

  // Validate using utility
  const isValid = validateTokenAndDebug();
  console.log("✅ Validation Result:", isValid ? "PASS" : "FAIL");

  // Check WebSocket status
  const wsDisabled = sessionStorage.getItem("wsConnectionDisabled");
  console.log("🔌 WebSocket Status:", {
    disabled: wsDisabled === "true",
    sessionStorage: wsDisabled,
  });

  return {
    hasValidToken: isValid,
    tokenExists: !!knoxToken,
    userExists: !!user,
    wsDisabled: wsDisabled === "true",
  };
};

// Quick fix function for common auth issues
export const quickFixAuth = () => {
  console.log("🔧 Running quick authentication fix...");

  const knoxToken = localStorage.getItem("knoxToken");

  if (!knoxToken) {
    console.log("❌ No token found - redirecting to login");
    forceLogout("No authentication token");
    return false;
  }

  // Fix double Token prefix if present
  if (knoxToken.startsWith("Token ")) {
    const cleanToken = knoxToken.replace("Token ", "");
    console.log("🔧 Fixing double Token prefix");
    localStorage.setItem("knoxToken", cleanToken);
  }

  // Clear WebSocket disabled state to retry connections
  sessionStorage.removeItem("wsConnectionDisabled");
  sessionStorage.removeItem("wsDisabledNotificationShown");

  console.log("✅ Quick fix completed");
  return true;
};

// Test authentication by making a simple API call
export const testAuth = async () => {
  console.log("🧪 Testing authentication...");

  const token = localStorage.getItem("knoxToken");
  if (!token) {
    console.log("❌ No token for testing");
    return false;
  }

  try {
    const response = await fetch("/api/auth/check/", {
      method: "GET",
      headers: {
        Authorization: `Token ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (response.ok) {
      console.log("✅ Authentication test PASSED");
      return true;
    } else {
      console.log("❌ Authentication test FAILED:", response.status);
      return false;
    }
  } catch (error) {
    console.log("❌ Authentication test ERROR:", error.message);
    return false;
  }
};
