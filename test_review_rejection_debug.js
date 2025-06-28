/**
 * Test script to debug the review rejection functionality
 */

console.log("🧪 Testing Review Rejection Debug\n");

// Mock the parameters that should be passed to reviewRejection
const testParameters = {
  id: 123,
  reviewDecision: "accept",
  reviewNotes: "Test review notes",
};

console.log("📋 Expected parameters for reviewRejection:", testParameters);

// Test the API URL construction
const getBaseURL = () => {
  if (
    typeof window !== "undefined" &&
    window.location.hostname !== "localhost"
  ) {
    return "https://charismatic-appreciation-production.up.railway.app/api";
  }
  return "http://localhost:8000/api";
};

const API_URL = `${getBaseURL()}/scheduling/`;
const expectedUrl = `${API_URL}appointments/${testParameters.id}/review_rejection/`;

console.log("🔗 Expected API URL:", expectedUrl);

// Test the payload construction
const expectedPayload = {
  action: testParameters.reviewDecision,
  reason: testParameters.reviewNotes,
};

console.log("📦 Expected payload:", expectedPayload);

// Validate the parameters
const validateParameters = (params) => {
  const errors = [];

  if (!params.id || typeof params.id !== "number") {
    errors.push(`Invalid id: ${params.id} (type: ${typeof params.id})`);
  }

  if (
    !params.reviewDecision ||
    !["accept", "deny"].includes(params.reviewDecision)
  ) {
    errors.push(
      `Invalid reviewDecision: ${params.reviewDecision} (must be 'accept' or 'deny')`
    );
  }

  if (typeof params.reviewNotes !== "string") {
    errors.push(
      `Invalid reviewNotes: ${
        params.reviewNotes
      } (type: ${typeof params.reviewNotes})`
    );
  }

  return errors;
};

const validationErrors = validateParameters(testParameters);

if (validationErrors.length > 0) {
  console.log("❌ Parameter validation failed:");
  validationErrors.forEach((error) => console.log(`   - ${error}`));
} else {
  console.log("✅ Parameter validation passed");
}

console.log("\n💡 If the review rejection is still failing:");
console.log(
  "1. Check the browser network tab for the actual request being made"
);
console.log("2. Look for JavaScript errors in the console");
console.log("3. Verify the authentication token is valid");
console.log(
  "4. Check if the appointment ID exists and is in 'rejected' status"
);
console.log("5. Ensure the user has 'operator' role permissions");

export default testParameters;
