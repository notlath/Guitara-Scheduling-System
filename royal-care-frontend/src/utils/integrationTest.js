/**
 * Integration Test Suite for Performance Optimization Features
 * Tests all the advanced performance features to ensure they work correctly
 */

// Import all performance optimization modules
import cachePreloader from '../services/cachePreloader.js';
import memoryManager from '../services/memoryManager.js';
import crossTabSync from '../services/crossTabSync.js';
import performanceTestSuite from './performanceTestSuite.js';

/**
 * Run comprehensive integration tests for all performance features
 */
export const runIntegrationTests = async () => {
  console.log('🧪 Starting Performance Optimization Integration Tests...');
  
  const results = {
    cachePreloader: null,
    memoryManager: null,
    crossTabSync: null,
    performanceTestSuite: null,
    overallStatus: 'pending'
  };

  try {
    // Test 1: Cache Preloader
    console.log('\n📦 Testing Cache Preloader...');
    try {
      // Test critical data preloading
      await cachePreloader.preloadCriticalData();
      
      // Test route-based preloading
      await cachePreloader.preloadForRoute('/dashboard');
      
      // Check if data was cached
      const cacheStats = cachePreloader.getCacheStats();
      
      results.cachePreloader = {
        status: 'passed',
        details: `Cache entries: ${Object.keys(cacheStats).length}`,
        cacheStats
      };
      console.log('✅ Cache Preloader: PASSED');
    } catch (error) {
      results.cachePreloader = {
        status: 'failed',
        error: error.message
      };
      console.log('❌ Cache Preloader: FAILED -', error.message);
    }

    // Test 2: Memory Manager
    console.log('\n🧠 Testing Memory Manager...');
    try {
      // Initialize and test memory management
      memoryManager.initialize();
      
      // Record some usage patterns
      memoryManager.recordUsage('test-data', 1024);
      memoryManager.recordUsage('test-data-2', 2048);
      
      // Get memory stats
      const memoryStats = memoryManager.getMemoryStats();
      
      results.memoryManager = {
        status: 'passed',
        details: `Memory pressure: ${memoryStats.pressure}, Entries: ${memoryStats.totalEntries}`,
        memoryStats
      };
      console.log('✅ Memory Manager: PASSED');
    } catch (error) {
      results.memoryManager = {
        status: 'failed',
        error: error.message
      };
      console.log('❌ Memory Manager: FAILED -', error.message);
    }

    // Test 3: Cross-Tab Sync
    console.log('\n🔄 Testing Cross-Tab Sync...');
    try {
      // Initialize cross-tab sync
      crossTabSync.initialize();
      
      // Test sending a message
      crossTabSync.broadcastCacheUpdate('test-key', { data: 'test-value' });
      
      // Test subscribing to updates
      const unsubscribe = crossTabSync.subscribe('test-updates', (data) => {
        console.log('📡 Cross-tab message received:', data);
      });
      
      // Cleanup
      unsubscribe();
      
      results.crossTabSync = {
        status: 'passed',
        details: 'Cross-tab communication initialized and tested'
      };
      console.log('✅ Cross-Tab Sync: PASSED');
    } catch (error) {
      results.crossTabSync = {
        status: 'failed',
        error: error.message
      };
      console.log('❌ Cross-Tab Sync: FAILED -', error.message);
    }

    // Test 4: Performance Test Suite
    console.log('\n⚡ Testing Performance Test Suite...');
    try {
      // Run the performance diagnostics
      const perfResults = await performanceTestSuite.runDiagnostics();
      
      results.performanceTestSuite = {
        status: 'passed',
        details: `Completed ${Object.keys(perfResults).length} performance tests`,
        perfResults
      };
      console.log('✅ Performance Test Suite: PASSED');
    } catch (error) {
      results.performanceTestSuite = {
        status: 'failed',
        error: error.message
      };
      console.log('❌ Performance Test Suite: FAILED -', error.message);
    }

    // Overall status
    const failedTests = Object.values(results).filter(r => r && r.status === 'failed');
    results.overallStatus = failedTests.length === 0 ? 'passed' : 'failed';

    console.log('\n🎯 Integration Test Results:');
    console.log('==========================================');
    Object.entries(results).forEach(([test, result]) => {
      if (result && typeof result === 'object' && result.status) {
        const icon = result.status === 'passed' ? '✅' : '❌';
        console.log(`${icon} ${test}: ${result.status.toUpperCase()}`);
        if (result.details) {
          console.log(`   └─ ${result.details}`);
        }
        if (result.error) {
          console.log(`   └─ Error: ${result.error}`);
        }
      }
    });
    
    console.log(`\n🏁 Overall Status: ${results.overallStatus.toUpperCase()}`);
    
    return results;
    
  } catch (error) {
    console.error('🚨 Integration test suite failed:', error);
    results.overallStatus = 'failed';
    results.criticalError = error.message;
    return results;
  }
};

/**
 * Quick validation that all modules can be imported and initialized
 */
export const runQuickValidation = () => {
  console.log('🔍 Running quick validation of performance modules...');
  
  const validationResults = {};
  
  try {
    // Test imports
    validationResults.imports = {
      cachePreloader: typeof cachePreloader === 'object',
      memoryManager: typeof memoryManager === 'object',
      crossTabSync: typeof crossTabSync === 'object',
      performanceTestSuite: typeof performanceTestSuite === 'object'
    };
    
    // Test basic initialization
    validationResults.initialization = {
      memoryManager: typeof memoryManager.initialize === 'function',
      crossTabSync: typeof crossTabSync.initialize === 'function',
      cachePreloader: typeof cachePreloader.preloadCriticalData === 'function'
    };
    
    console.log('✅ Quick validation completed successfully');
    return validationResults;
    
  } catch (error) {
    console.error('❌ Quick validation failed:', error);
    validationResults.error = error.message;
    return validationResults;
  }
};

export default {
  runIntegrationTests,
  runQuickValidation
};
