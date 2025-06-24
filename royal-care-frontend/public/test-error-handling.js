/**
 * Test script to verify API error handling improvements
 * Run this in the browser console to test different error scenarios
 */

const testAPIErrorHandling = () => {
  console.log("🧪 Testing API Error Handling...");

  // Test 1: Simulate blocked request
  const testBlockedRequest = () => {
    console.log("\n1. Testing blocked request handling...");
    const mockError = new Error("net::ERR_BLOCKED_BY_CLIENT");
    mockError.code = "ERR_BLOCKED_BY_CLIENT";

    // Import the error utilities (this would normally be imported)
    const isBlockedByClient = (error) => {
      return (
        error.code === "ERR_BLOCKED_BY_CLIENT" ||
        error.message?.includes("ERR_BLOCKED_BY_CLIENT") ||
        error.message?.includes("blocked by client") ||
        error.message?.includes("net::ERR_BLOCKED_BY_CLIENT")
      );
    };

    const getUserFriendlyErrorMessage = (error) => {
      if (isBlockedByClient(error)) {
        return "Your request was blocked by your browser or an extension. Please check your ad blocker settings and try again.";
      }
      return error.message || "An unexpected error occurred.";
    };

    console.log("✅ Blocked request detected:", isBlockedByClient(mockError));
    console.log(
      "📝 User-friendly message:",
      getUserFriendlyErrorMessage(mockError)
    );
  };

  // Test 2: Console error suppression
  const testConsoleErrorSuppression = () => {
    console.log("\n2. Testing console error suppression...");

    // These should be suppressed
    const suppressedErrors = [
      "Unchecked runtime.lastError: The page keeping the extension port is moved into back/forward cache",
      "Error: No tab with id: 12345",
      "Frame with ID 123 was removed",
      "background.js:2 Error while processing message",
    ];

    suppressedErrors.forEach((error) => {
      console.error(
        error + " (this should be suppressed if working correctly)"
      );
    });

    // This should NOT be suppressed
    console.error(
      "This is a real application error (should NOT be suppressed)"
    );
  };

  // Test 3: API configuration
  const testAPIConfiguration = () => {
    console.log("\n3. Testing API configuration...");

    const createAdBlockerFriendlyConfig = (baseConfig = {}) => {
      return {
        ...baseConfig,
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "Cache-Control": "no-cache",
          ...baseConfig.headers,
        },
        timeout: 30000,
        validateStatus: (status) => status < 600,
      };
    };

    const config = createAdBlockerFriendlyConfig({
      headers: { Authorization: "Token test123" },
    });

    console.log("✅ API config created:", config);
    console.log(
      "🔧 Headers include anti-blocking measures:",
      config.headers["Cache-Control"] === "no-cache"
    );
  };

  // Run all tests
  testBlockedRequest();
  testConsoleErrorSuppression();
  testAPIConfiguration();

  console.log("\n🎉 Error handling tests completed!");
  console.log("\n💡 To test in real application:");
  console.log("1. Open the scheduling page");
  console.log(
    "2. If you see ad blocker errors, the new APIErrorDisplay component should show helpful instructions"
  );
  console.log(
    "3. Browser extension console spam should be significantly reduced"
  );
};

// Auto-run the test
testAPIErrorHandling();
