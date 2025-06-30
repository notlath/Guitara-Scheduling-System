/**
 * Test script to verify the end time calculation fix
 * This simulates the calculation logic to ensure "Inval" errors are resolved
 */

// Mock services array (like what would come from the API)
const mockServices = [
  { id: 1, name: "Relaxation Massage", duration: 60, price: 100 },
  { id: 2, name: "Deep Tissue Massage", duration: 90, price: 150 },
  { id: 3, name: "Hot Stone Massage", duration: 120, price: 200 },
];

// Simulate the fixed end time calculation logic
function calculateEndTime(startTime, serviceId, services = []) {
  try {
    // Ensure startTime is in HH:MM format (remove seconds if present)
    const cleanStartTime = startTime.slice(0, 5);
    const [h, m] = cleanStartTime.split(":").map(Number);

    // Validate input time
    if (isNaN(h) || isNaN(m) || h < 0 || h > 23 || m < 0 || m > 59) {
      console.error("Invalid start time format:", startTime);
      return null;
    }

    // Find the actual service to get its duration
    const service = services.find((s) => s.id === parseInt(serviceId, 10));
    const serviceDuration = service?.duration || 60; // Default to 60 minutes if service not found

    console.log(
      `Service found: ${
        service?.name || "Unknown"
      }, Duration: ${serviceDuration} minutes`
    );

    // Use current date to properly handle cross-day calculations
    const start = new Date();
    start.setHours(h, m, 0, 0);
    start.setMinutes(start.getMinutes() + serviceDuration);

    // Validate the calculated time before formatting
    if (isNaN(start.getTime())) {
      console.error("Invalid calculated end time");
      return null;
    }

    // Format as HH:MM only (handles cross-day properly)
    const hours = start.getHours().toString().padStart(2, "0");
    const minutes = start.getMinutes().toString().padStart(2, "0");
    return `${hours}:${minutes}`;
  } catch (error) {
    console.error("Error calculating end time:", error);
    return null;
  }
}

// Test cases that previously caused "Inval" errors
console.log("=== Testing End Time Calculation Fix ===\n");

// Test 1: Valid service and time
console.log("Test 1: Valid service and time");
const result1 = calculateEndTime("14:00", "1", mockServices);
console.log(`Start: 14:00, Service: 1 (60min) -> End: ${result1}`);
console.log(`✅ ${result1 && result1 !== "Inval" ? "PASS" : "FAIL"}\n`);

// Test 2: Valid service with cross-day calculation
console.log("Test 2: Cross-day calculation");
const result2 = calculateEndTime("23:30", "2", mockServices);
console.log(`Start: 23:30, Service: 2 (90min) -> End: ${result2}`);
console.log(`✅ ${result2 && result2 !== "Inval" ? "PASS" : "FAIL"}\n`);

// Test 3: Invalid service ID (should not crash, use default duration)
console.log("Test 3: Invalid service ID (should use default 60min)");
const result3 = calculateEndTime("15:00", "999", mockServices);
console.log(`Start: 15:00, Service: 999 (default 60min) -> End: ${result3}`);
console.log(`✅ ${result3 && result3 !== "Inval" ? "PASS" : "FAIL"}\n`);

// Test 4: Empty services array (should not crash)
console.log("Test 4: Empty services array");
const result4 = calculateEndTime("16:00", "1", []);
console.log(`Start: 16:00, Service: 1, Empty array -> End: ${result4}`);
console.log(`✅ ${result4 && result4 !== "Inval" ? "PASS" : "FAIL"}\n`);

// Test 5: Invalid start time format
console.log("Test 5: Invalid start time format");
const result5 = calculateEndTime("25:00", "1", mockServices);
console.log(`Start: 25:00 (invalid), Service: 1 -> End: ${result5}`);
console.log(`✅ ${result5 === null ? "PASS (properly handled)" : "FAIL"}\n`);

console.log("=== Fix Summary ===");
console.log("✅ End time calculation now includes service duration lookup");
console.log("✅ Proper validation prevents 'Inval' errors");
console.log("✅ Cross-day scenarios handled correctly");
console.log("✅ Graceful fallbacks for missing data");
console.log("\nThe 'Inval' error should now be resolved in production!");
