/**
 * Quick token test script to run in browser console
 * Copy and paste this into the browser console to debug token issues
 */

console.log("🔧 Token Test Script");
console.log("===================");

// Check current token
const token = localStorage.getItem("knoxToken");
console.log("Raw token:", token);

if (!token) {
  console.log("❌ No token found - need to log in");
} else {
  console.log("✅ Token found, length:", token.length);

  // Test API call with current token
  const testApiCall = async () => {
    try {
      console.log("🔄 Testing API call...");

      const headers = {
        Authorization: token.startsWith("Token ") ? token : `Token ${token}`,
        "Content-Type": "application/json",
      };

      console.log("Headers:", headers);

      const response = await fetch(
        "http://localhost:8000/api/scheduling/appointments/",
        {
          method: "GET",
          headers: headers,
        }
      );

      console.log("Response status:", response.status);

      if (response.status === 401) {
        const responseText = await response.text();
        console.log("❌ 401 Error response:", responseText);

        // Try to get a new token by checking if we have valid user data
        const userData = localStorage.getItem("user");
        if (userData) {
          console.log("User data exists:", JSON.parse(userData));
          console.log("💡 Try logging out and back in to get a fresh token");
        }
      } else if (response.ok) {
        console.log("✅ API call successful!");
        const data = await response.json();
        console.log("Response data:", data);
      } else {
        console.log("⚠️ Other error:", response.status, response.statusText);
      }
    } catch (error) {
      console.log("❌ API call failed:", error);
    }
  };

  // Run the test
  testApiCall();

  // Also provide quick functions
  window.quickTokenTest = testApiCall;
}
window.clearAuth = () => {
  localStorage.removeItem("knoxToken");
  localStorage.removeItem("user");
  sessionStorage.clear();
  console.log("✅ Auth data cleared - please refresh page");
};

console.log("💡 Available functions:");
console.log("- quickTokenTest() - test current token");
console.log("- clearAuth() - clear all auth data");
