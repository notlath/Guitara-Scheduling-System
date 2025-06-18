// Test script for username generation logic

// Helper function to capitalize names properly
const capitalizeName = (name) => {
  if (!name || typeof name !== "string") return "";

  // Split by spaces and capitalize each word
  return name
    .trim()
    .split(/\s+/) // Split by any whitespace (handles multiple spaces)
    .filter((word) => word.length > 0) // Remove empty strings
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
};

// Helper function to generate default username based on role and name
const generateDefaultUsername = (role, firstName, lastName) => {
  if (!firstName && !lastName) return "";

  // Clean and prepare names - prioritize lastName, fallback to firstName
  const cleanLastName =
    (lastName || "")
      .trim()
      .split(/\s+/)[0]
      ?.replace(/[^a-zA-Z]/g, "")
      .toLowerCase() || "";
  const cleanFirstName =
    (firstName || "")
      .trim()
      .split(/\s+/)[0]
      ?.replace(/[^a-zA-Z]/g, "")
      .toLowerCase() || "";

  // Use lastName if available, otherwise use firstName
  const name = cleanLastName || cleanFirstName;

  const prefixes = {
    Therapists: "rct",
    Drivers: "rcd",
    Operators: "rco",
  };

  const prefix = prefixes[role];
  if (!prefix || !name) return "";

  return `${prefix}_${name}`;
};

// Test cases
console.log("=== Username Generation Tests ===");

// Test 1: Normal names
console.log("Test 1 - Normal names:");
console.log(
  "John Doe -> Therapist:",
  generateDefaultUsername("Therapists", "John", "Doe")
); // Expected: rct_doe
console.log(
  "John Doe -> Driver:",
  generateDefaultUsername("Drivers", "John", "Doe")
); // Expected: rcd_doe
console.log(
  "John Doe -> Operator:",
  generateDefaultUsername("Operators", "John", "Doe")
); // Expected: rco_doe

// Test 2: Multiple names
console.log("\nTest 2 - Multiple names:");
console.log(
  "Juan Carlos De La Cruz -> Therapist:",
  generateDefaultUsername("Therapists", "Juan Carlos", "De La Cruz")
); // Expected: rct_de
console.log(
  "Maria Luisa Santos Garcia -> Driver:",
  generateDefaultUsername("Drivers", "Maria Luisa", "Santos Garcia")
); // Expected: rcd_santos

// Test 3: Only first name
console.log("\nTest 3 - Only first name:");
console.log(
  "John (no last name) -> Therapist:",
  generateDefaultUsername("Therapists", "John", "")
); // Expected: rct_john

// Test 4: Only last name
console.log("\nTest 4 - Only last name:");
console.log(
  "(no first name) Smith -> Driver:",
  generateDefaultUsername("Drivers", "", "Smith")
); // Expected: rcd_smith

// Test 5: Names with special characters
console.log("\nTest 5 - Names with special characters:");
console.log(
  "José María -> Therapist:",
  generateDefaultUsername("Therapists", "José", "María")
); // Expected: rct_mara
console.log(
  "O'Connor -> Driver:",
  generateDefaultUsername("Drivers", "Patrick", "O'Connor")
); // Expected: rcd_oconnor

// Test 6: Case sensitivity
console.log("\nTest 6 - Case sensitivity:");
console.log(
  "JOHN SMITH -> Therapist:",
  generateDefaultUsername("Therapists", "JOHN", "SMITH")
); // Expected: rct_smith
console.log(
  "john smith -> Driver:",
  generateDefaultUsername("Drivers", "john", "smith")
); // Expected: rcd_smith

// Test 7: Capitalization test
console.log("\nTest 7 - Name capitalization:");
console.log("john doe ->", capitalizeName("john doe")); // Expected: John Doe
console.log("MARY JANE ->", capitalizeName("MARY JANE")); // Expected: Mary Jane
console.log(
  "juan carlos de la cruz ->",
  capitalizeName("juan carlos de la cruz")
); // Expected: Juan Carlos De La Cruz

console.log("\n=== All tests completed ===");
