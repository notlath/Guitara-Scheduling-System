// Debug script for logs page issues
// Run this in browser console to check the state

console.log("=== LOGS DEBUG SCRIPT ===");

// Check if we're on the logs page
console.log("Current URL:", window.location.href);

// Check localStorage for tokens
console.log("Token status:");
console.log("- knoxToken:", localStorage.getItem("knoxToken"));
console.log("- token:", localStorage.getItem("token"));
console.log("- authToken:", localStorage.getItem("authToken"));

// Check if the user is authenticated
console.log("User state:");
const authData = localStorage.getItem("authUser");
if (authData) {
  try {
    const parsed = JSON.parse(authData);
    console.log("- Auth user:", parsed);
  } catch (e) {
    console.log("- Auth user (raw):", authData);
  }
} else {
  console.log("- No auth user found");
}

// Test API call directly
console.log("Testing API call...");
const token = localStorage.getItem("knoxToken") || localStorage.getItem("token") || localStorage.getItem("authToken");
if (token) {
  fetch("http://localhost:8000/api/system-logs/?log_type=auth&page=1&page_size=10", {
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json"
    }
  })
  .then(response => {
    console.log("API Response Status:", response.status);
    return response.json();
  })
  .then(data => {
    console.log("API Response Data:", data);
  })
  .catch(error => {
    console.error("API Error:", error);
    
    // Try with Token format instead of Bearer
    return fetch("http://localhost:8000/api/system-logs/?log_type=auth&page=1&page_size=10", {
      headers: {
        "Authorization": `Token ${token}`,
        "Content-Type": "application/json"
      }
    })
    .then(response => {
      console.log("API Response Status (Token format):", response.status);
      return response.json();
    })
    .then(data => {
      console.log("API Response Data (Token format):", data);
    })
    .catch(error => {
      console.error("API Error (Token format):", error);
    });
  });
} else {
  console.log("No token found - cannot test API");
}

console.log("=== END DEBUG SCRIPT ===");
