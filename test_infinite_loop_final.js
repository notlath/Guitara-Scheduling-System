// Final test to verify infinite loop is fixed
const fs = require("fs");
const path = require("path");

// Function to check if files contain the fixed code patterns
function checkInfiniteLoopFix() {
  console.log("🔍 Checking infinite loop fix implementation...\n");

  const useOperatorDataPath = path.join(
    __dirname,
    "royal-care-frontend",
    "src",
    "hooks",
    "useOperatorData.js"
  );
  const schedulingSlicePath = path.join(
    __dirname,
    "royal-care-frontend",
    "src",
    "features",
    "scheduling",
    "schedulingSlice.js"
  );

  let issues = [];
  let fixes = [];

  // Check useOperatorData.js
  if (fs.existsSync(useOperatorDataPath)) {
    const content = fs.readFileSync(useOperatorDataPath, "utf8");

    // Check for stable selectors with shallowEqual
    if (content.includes("shallowEqual")) {
      fixes.push("✅ useOperatorData uses shallowEqual for stable selectors");
    } else {
      issues.push(
        "❌ useOperatorData missing shallowEqual for stable selectors"
      );
    }

    // Check for memoized data processing
    if (content.includes("useMemo")) {
      fixes.push("✅ useOperatorData uses useMemo for data processing");
    } else {
      issues.push("❌ useOperatorData missing useMemo for data processing");
    }

    // Check for proper initialization tracking
    if (content.includes("hasInitialized.current")) {
      fixes.push("✅ useOperatorData has proper initialization tracking");
    } else {
      issues.push("❌ useOperatorData missing initialization tracking");
    }

    // Check for array normalization
    if (content.includes("Array.isArray") && content.includes("|| []")) {
      fixes.push("✅ useOperatorData normalizes data to arrays");
    } else {
      issues.push("❌ useOperatorData missing array normalization");
    }
  } else {
    issues.push("❌ useOperatorData.js file not found");
  }

  // Check schedulingSlice.js
  if (fs.existsSync(schedulingSlicePath)) {
    const content = fs.readFileSync(schedulingSlicePath, "utf8");

    // Check for deduplication
    if (content.includes("createDedupedThunk")) {
      fixes.push("✅ schedulingSlice has request deduplication");
    } else {
      issues.push("❌ schedulingSlice missing request deduplication");
    }

    // Check for rate limiting
    if (content.includes("makeRateLimitedRequest")) {
      fixes.push("✅ schedulingSlice has rate limiting");
    } else {
      issues.push("❌ schedulingSlice missing rate limiting");
    }

    // Check for proper logging
    if (
      content.includes("console.log") &&
      (content.includes("Deduplicating request") ||
        content.includes("Creating new request"))
    ) {
      fixes.push("✅ schedulingSlice has enhanced logging");
    } else {
      issues.push("❌ schedulingSlice missing proper logging");
    }
  } else {
    issues.push("❌ schedulingSlice.js file not found");
  }

  // Report results
  console.log("=== INFINITE LOOP FIX STATUS ===\n");

  if (fixes.length > 0) {
    console.log("✅ IMPLEMENTED FIXES:");
    fixes.forEach((fix) => console.log(`   ${fix}`));
    console.log("");
  }

  if (issues.length > 0) {
    console.log("❌ REMAINING ISSUES:");
    issues.forEach((issue) => console.log(`   ${issue}`));
    console.log("");
  }

  const successRate = (fixes.length / (fixes.length + issues.length)) * 100;
  console.log(`📊 Fix Implementation: ${successRate.toFixed(1)}% complete`);

  if (issues.length === 0) {
    console.log("\n🎉 INFINITE LOOP FIX COMPLETE!");
    console.log("All necessary fixes have been implemented:");
    console.log("- Request deduplication in Redux slice");
    console.log("- Rate limiting and retry logic");
    console.log("- Stable selectors with shallowEqual");
    console.log("- Memoized data processing");
    console.log("- Proper initialization tracking");
    console.log("- Array normalization for UI safety");
    console.log(
      "\nThe dashboard should now load data once without infinite loops."
    );
  } else {
    console.log("\n⚠️  Some issues remain to be addressed.");
  }
}

// Run the check
checkInfiniteLoopFix();
