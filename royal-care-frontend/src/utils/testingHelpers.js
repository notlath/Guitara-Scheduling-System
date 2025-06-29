import { api } from '../services/api';

/**
 * Testing utilities for switching between user roles with real authentication
 * Use these in browser console for quick role switching
 */

// Real login function using the API
const loginAsUser = async (credentials) => {
  try {
    console.log(`🔐 Logging in as ${credentials.username}...`);
    
    const response = await api.post('/auth/login/', credentials);
    
    if (response.data.message === "2FA code sent") {
      console.error(`❌ 2FA required for ${credentials.username}. Use regular login flow.`);
      return false;
    }
    
    // Store the real user data and token
    localStorage.setItem("user", JSON.stringify(response.data.user));
    localStorage.setItem("knoxToken", response.data.token);
    
    console.log(`✅ Successfully logged in as ${response.data.user.first_name} ${response.data.user.last_name} (${response.data.user.role})`);
    return true;
    
  } catch (error) {
    console.error(`❌ Login failed for ${credentials.username}:`, error.response?.data?.error || error.message);
    return false;
  }
};

// Quick role switching functions - use in browser console
window.switchToOperator = async () => {
  const success = await loginAsUser({
    username: "operator1",
    password: "testpass123"
  });
  if (success) {
    console.log("🔄 Reloading page...");
    window.location.reload();
  }
};

window.switchToTherapist = async () => {
  const success = await loginAsUser({
    username: "therapist1", 
    password: "testpass123"
  });
  if (success) {
    console.log("🔄 Reloading page...");
    window.location.reload();
  }
};

window.switchToDriver = async () => {
  const success = await loginAsUser({
    username: "driver1",
    password: "testpass123"
  });
  if (success) {
    console.log("🔄 Reloading page...");
    window.location.reload();
  }
};

window.clearAuth = () => {
  localStorage.removeItem("user");
  localStorage.removeItem("knoxToken");
  console.log("🚪 Logged out");
  window.location.reload();
};

// Show current user info
window.showCurrentUser = () => {
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const token = localStorage.getItem("knoxToken");
  
  console.log("👤 Current User:", user);
  console.log("🔑 Token:", token ? "Present" : "None");
  
  if (user.first_name) {
    console.log(`📝 Logged in as: ${user.first_name} ${user.last_name} (${user.role})`);
  } else {
    console.log("❌ No user logged in");
  }
};

// Log available functions
console.log("🧪 Testing helpers with real authentication loaded!");
console.log("📚 Available functions:");
console.log("- switchToOperator() - Login as operator1");
console.log("- switchToTherapist() - Login as therapist1"); 
console.log("- switchToDriver() - Login as driver1");
console.log("- showCurrentUser() - Show current user info");
console.log("- clearAuth() - Logout");
console.log("");
console.log("💡 Test credentials:");
console.log("- operator1 / testpass123");
console.log("- therapist1 / testpass123");
console.log("- driver1 / testpass123");
