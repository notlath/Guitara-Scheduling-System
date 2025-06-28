// Test WebSocket URL construction in development mode
console.log("🔍 Environment Debug:");
console.log("VITE_WS_BASE_URL:", import.meta.env.VITE_WS_BASE_URL);
console.log("PROD:", import.meta.env.PROD);
console.log("MODE:", import.meta.env.MODE);

const token = "test-token";
const wsUrl = import.meta.env.PROD
  ? "wss://charismatic-appreciation-production.up.railway.app/ws/scheduling/appointments/"
  : import.meta.env.VITE_WS_BASE_URL ||
    "ws://localhost:8000/ws/scheduling/appointments/";

console.log("🔗 Constructed WebSocket URL:", wsUrl);
console.log("🔗 WebSocket URL with token:", `${wsUrl}?token=${token}`);

// Test if the environment variable is being read correctly
if (import.meta.env.VITE_WS_BASE_URL) {
  console.log("✅ VITE_WS_BASE_URL is defined");
} else {
  console.log("❌ VITE_WS_BASE_URL is not defined, using fallback");
}

export default {};
