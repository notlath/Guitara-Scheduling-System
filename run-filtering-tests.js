/**
 * Test runner for appointment filtering functionality
 * Run this script to test the robust filtering implementation
 */

const { execSync } = require("child_process");
const path = require("path");

console.log("🧪 Running Appointment Filtering Tests...\n");

try {
  // Change to the frontend directory
  const frontendDir = path.join(__dirname, "royal-care-frontend");
  process.chdir(frontendDir);

  console.log("📍 Working directory:", process.cwd());
  console.log("🔍 Running Jest tests for robust filtering...\n");

  // Run the specific test file
  const testCommand =
    "npm test -- --testPathPattern=useRobustAppointmentFilters.test.js --verbose";

  const output = execSync(testCommand, {
    encoding: "utf8",
    stdio: "inherit",
  });

  console.log("\n✅ All tests completed successfully!");
} catch (error) {
  console.error("\n❌ Test execution failed:", error.message);

  if (error.stdout) {
    console.log("\n📝 Test Output:");
    console.log(error.stdout);
  }

  if (error.stderr) {
    console.log("\n🚨 Test Errors:");
    console.log(error.stderr);
  }

  process.exit(1);
}

console.log("\n🎉 Appointment filtering tests completed!");
console.log("📊 Test Summary:");
console.log("✓ Input validation tests");
console.log("✓ Status filtering tests");
console.log("✓ Error handling tests");
console.log("✓ Performance and stability tests");
console.log("✓ Integration tests");
