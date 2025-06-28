// WebSocket URL Debug Test for Local Development
console.log("🔍 WebSocket Debug Test Starting...");

// Check environment variables
console.log("📊 Environment Variables:");
console.log("  VITE_WS_BASE_URL:", import.meta.env.VITE_WS_BASE_URL);
console.log("  VITE_API_BASE_URL:", import.meta.env.VITE_API_BASE_URL);
console.log("  PROD:", import.meta.env.PROD);
console.log("  DEV:", import.meta.env.DEV);
console.log("  MODE:", import.meta.env.MODE);

// Test URL construction
const wsUrl = import.meta.env.PROD
  ? "wss://charismatic-appreciation-production.up.railway.app/ws/scheduling/appointments/"
  : import.meta.env.VITE_WS_BASE_URL ||
    "ws://localhost:8000/ws/scheduling/appointments/";

console.log("🔗 Constructed WebSocket URL:", wsUrl);

// Check if URL is correct
if (wsUrl.includes("/ws/scheduling/appointments/")) {
  console.log("✅ WebSocket URL construction is CORRECT");
} else {
  console.log("❌ WebSocket URL construction is INCORRECT");
  console.log("   Expected: ws://localhost:8000/ws/scheduling/appointments/");
  console.log("   Got:", wsUrl);
}

// Test with token
const testToken = "test-token-12345";
const wsUrlWithAuth = `${wsUrl}?token=${encodeURIComponent(testToken)}`;
console.log("🔐 WebSocket URL with auth:", wsUrlWithAuth);

// Export for use in other files
export const debugWebSocketURL = {
  baseUrl: wsUrl,
  withAuth: (token) => `${wsUrl}?token=${encodeURIComponent(token)}`,
  isCorrect: wsUrl.includes("/ws/scheduling/appointments/"),
};

export default debugWebSocketURL;
