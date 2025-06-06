/**
 * Utility to fix authentication and WebSocket issues
 */

import { enableWebSocketConnections } from "../services/webSocketService";

// Function to check and log current authentication state
export const checkAuthState = () => {
  console.log("=== Authentication State Check ===");

  const token = localStorage.getItem("knoxToken");
  const user = localStorage.getItem("user");

  console.log("Raw token from localStorage:", token);
  console.log("User data:", user);

  if (!token) {
    console.error("❌ No authentication token found");
    return false;
  }

  // Check token format
  let cleanToken = token;
  if (token.startsWith("Token ")) {
    cleanToken = token.split(" ")[1];
    console.log("✅ Token has correct prefix format");
  } else {
    console.log('⚠️ Token without "Token " prefix, raw token:', cleanToken);
  }

  if (!cleanToken || cleanToken.length < 10) {
    console.error("❌ Invalid token format or too short");
    return false;
  }

  console.log("✅ Token appears valid (length:", cleanToken.length, ")");
  return true;
};

// Function to test API connection with current token
export const testApiConnection = async () => {
  console.log("=== Testing API Connection ===");

  try {
    const token = localStorage.getItem("knoxToken");
    if (!token) {
      console.error("❌ No token available for API test");
      return false;
    }

    const response = await fetch(
      "http://localhost:8000/api/scheduling/appointments/",
      {
        method: "GET",
        headers: {
          Authorization: token.startsWith("Token ") ? token : `Token ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    console.log("API Response status:", response.status);

    if (response.status === 401) {
      console.error("❌ API returned 401 - Authentication failed");
      const responseText = await response.text();
      console.error("Response:", responseText);
      return false;
    }

    if (response.ok) {
      console.log("✅ API connection successful");
      return true;
    } else {
      console.error("❌ API error:", response.status, response.statusText);
      return false;
    }
  } catch (error) {
    console.error("❌ API connection failed:", error);
    return false;
  }
};

// Function to reset and re-enable WebSocket connections
export const resetWebSocketConnections = () => {
  console.log("=== Resetting WebSocket Connections ===");

  // Clear any disabled state
  try {
    sessionStorage.removeItem("wsConnectionDisabled");
    console.log("✅ Cleared WebSocket disabled state");
  } catch (error) {
    console.log("⚠️ Could not clear WebSocket disabled state:", error);
  }

  // Re-enable WebSocket connections
  enableWebSocketConnections();
  console.log("✅ WebSocket connections re-enabled");
};

// Function to test login with test credentials
export const testLogin = async (
  username = "testuser",
  password = "testpass123"
) => {
  console.log("=== Testing Login ===");

  try {
    const response = await fetch("http://localhost:8000/api/auth/login/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username: username,
        password: password,
      }),
    });

    console.log("Login response status:", response.status);

    if (response.ok) {
      const data = await response.json();
      console.log("✅ Login successful!");
      console.log("Response data:", data);

      if (data.token) {
        // Store the token
        localStorage.setItem("knoxToken", data.token);
        if (data.user) {
          localStorage.setItem("user", JSON.stringify(data.user));
        }
        console.log("✅ Token stored in localStorage");
        return true;
      } else {
        console.error("❌ No token in response");
        return false;
      }
    } else {
      const errorData = await response.text();
      console.error("❌ Login failed:", response.status, errorData);
      return false;
    }
  } catch (error) {
    console.error("❌ Login request failed:", error);
    return false;
  }
};

// Function to perform a complete authentication and connection reset
export const fullAuthReset = async () => {
  console.log("=== Full Authentication Reset ===");

  const hasValidToken = checkAuthState();
  if (!hasValidToken) {
    console.error(
      "❌ Cannot proceed without valid token - please log in again"
    );
    return false;
  }

  const apiWorks = await testApiConnection();
  if (!apiWorks) {
    console.error("❌ API connection failed - token may be expired");
    return false;
  }

  resetWebSocketConnections();

  console.log("✅ Full authentication reset completed successfully");
  return true;
};

// Function to force logout and clear all auth data
export const forceLogout = () => {
  console.log("=== Force Logout ===");

  try {
    localStorage.removeItem("knoxToken");
    localStorage.removeItem("user");
    sessionStorage.clear();
    console.log("✅ All authentication data cleared");

    // Reload the page to trigger redirect to login
    window.location.reload();
  } catch (error) {
    console.error("❌ Error during logout:", error);
  }
};

// Export a single function to run all diagnostics
export const runAuthDiagnostics = async () => {
  console.log("\n🔍 Running complete authentication diagnostics...\n");

  const hasValidToken = checkAuthState();
  const apiWorks = await testApiConnection();

  console.log("\n📊 Diagnostics Summary:");
  console.log("Token valid:", hasValidToken ? "✅" : "❌");
  console.log("API connection:", apiWorks ? "✅" : "❌");

  if (hasValidToken && apiWorks) {
    resetWebSocketConnections();
    console.log("WebSocket reset: ✅");
    console.log("\n🎉 All systems operational!");
    return true;
  } else {
    console.log(
      "\n⚠️ Issues detected. Run fullAuthReset() or forceLogout() as needed."
    );
    return false;
  }
};

// Function to run on page load for automatic testing
export const autoTestOnLoad = async () => {
  console.log("🚀 Auto-testing authentication on page load...");

  // Wait a bit for the page to fully load
  setTimeout(async () => {
    const hasToken = localStorage.getItem("knoxToken");

    if (!hasToken) {
      console.log("📝 No token found, attempting automatic login...");
      const loginSuccess = await testLogin();

      if (loginSuccess) {
        console.log("✅ Automatic login successful!");
        // Test API after successful login
        await testApiConnection();
        resetWebSocketConnections();
      } else {
        console.log("❌ Automatic login failed");
      }
    } else {
      console.log("🔍 Token found, running diagnostics...");
      await runAuthDiagnostics();
    }
  }, 1000);
};

// Auto-run when script loads
if (typeof window !== "undefined") {
  autoTestOnLoad();
}

// Make functions available globally for easy debugging
if (typeof window !== "undefined") {
  window.authDebug = {
    checkAuthState,
    testApiConnection,
    resetWebSocketConnections,
    fullAuthReset,
    forceLogout,
    runAuthDiagnostics,
    testLogin,
  };

  console.log("🛠️ Auth debugging tools available at window.authDebug");
  console.log("💡 Quick commands:");
  console.log("- authDebug.testLogin() - test login with default credentials");
  console.log("- authDebug.runAuthDiagnostics() - full auth check");
  console.log("- authDebug.forceLogout() - clear all auth data");
}
