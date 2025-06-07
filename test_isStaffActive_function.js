/**
 * Test the isStaffActive function with various input types
 */

// Copy the isStaffActive function from AvailabilityManager.jsx
const isStaffActive = (staff) => {
  if (!staff) {
    console.log("🔍 isStaffActive: No staff object provided");
    return false;
  }

  const isActive = staff.is_active;

  console.log(
    `🔍 isStaffActive check for ${staff.first_name} ${staff.last_name}:`,
    {
      rawValue: isActive,
      type: typeof isActive,
      stringified: String(isActive),
      staffId: staff.id,
    }
  );

  // Handle undefined/null - default to true for existing users
  if (isActive === undefined || isActive === null) {
    console.log(`   ⚠️  Undefined/null value, defaulting to true`);
    return true;
  }

  // Handle various data types that might come from the API
  if (typeof isActive === "boolean") {
    console.log(`   ✅ Boolean value: ${isActive}`);
    return isActive;
  }

  if (typeof isActive === "string") {
    const lowerValue = isActive.toLowerCase();
    const result =
      lowerValue === "true" ||
      lowerValue === "1" ||
      lowerValue === "yes" ||
      lowerValue === "active";
    console.log(`   📝 String value: "${isActive}" -> ${result}`);
    return result;
  }

  if (typeof isActive === "number") {
    const result = isActive === 1 || isActive > 0;
    console.log(`   🔢 Number value: ${isActive} -> ${result}`);
    return result;
  }

  // If it's an object, try to extract a boolean value
  if (typeof isActive === "object") {
    console.log(`   📦 Object value:`, isActive);
    // Sometimes APIs return objects with nested values
    if (isActive.value !== undefined) {
      return isStaffActive({ ...staff, is_active: isActive.value });
    }
  }

  // Default to true if uncertain (assume active unless explicitly disabled)
  console.warn(
    `🧪 Warning: Unexpected is_active value for ${staff.first_name} ${staff.last_name}, defaulting to true:`,
    isActive,
    typeof isActive
  );
  return true;
};

// Test cases
const testCases = [
  {
    id: 1,
    first_name: "John",
    last_name: "Doe",
    is_active: true,
    expected: true,
  },
  {
    id: 2,
    first_name: "Jane",
    last_name: "Smith",
    is_active: false,
    expected: false,
  },
  {
    id: 3,
    first_name: "Bob",
    last_name: "Johnson",
    is_active: "true",
    expected: true,
  },
  {
    id: 4,
    first_name: "Alice",
    last_name: "Brown",
    is_active: "false",
    expected: false,
  },
  {
    id: 5,
    first_name: "Charlie",
    last_name: "Wilson",
    is_active: 1,
    expected: true,
  },
  {
    id: 6,
    first_name: "Diana",
    last_name: "Davis",
    is_active: 0,
    expected: false,
  },
  {
    id: 7,
    first_name: "Eve",
    last_name: "Miller",
    is_active: undefined,
    expected: true,
  },
  {
    id: 8,
    first_name: "Frank",
    last_name: "Garcia",
    is_active: null,
    expected: true,
  },
  {
    id: 9,
    first_name: "Grace",
    last_name: "Martinez",
    is_active: "1",
    expected: true,
  },
  {
    id: 10,
    first_name: "Henry",
    last_name: "Anderson",
    is_active: "0",
    expected: false,
  },
];

console.log("🧪 Testing isStaffActive function with various input types:");
console.log("=" * 60);

let passCount = 0;
let failCount = 0;

testCases.forEach((testCase, index) => {
  const result = isStaffActive(testCase);
  const passed = result === testCase.expected;

  console.log(`\nTest ${index + 1}: ${passed ? "✅ PASS" : "❌ FAIL"}`);
  console.log(`  Expected: ${testCase.expected}, Got: ${result}`);

  if (passed) {
    passCount++;
  } else {
    failCount++;
  }
});

console.log("\n" + "=" * 60);
console.log(`Summary: ${passCount} passed, ${failCount} failed`);

if (failCount === 0) {
  console.log(
    "🎉 All tests passed! The isStaffActive function handles all data types correctly."
  );
} else {
  console.log("⚠️ Some tests failed. The function may need adjustment.");
}
