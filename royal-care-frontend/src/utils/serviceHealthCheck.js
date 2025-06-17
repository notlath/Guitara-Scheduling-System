/**
 * Service Health Check Utility
 * Tests that all performance optimization services can be imported and initialized correctly
 */

// Import all services
import memoryManager from '../services/memoryManager';
import crossTabSync from '../services/crossTabSync';
import cachePreloader from '../services/cachePreloader';

/**
 * Perform a health check on all performance services
 * @returns {Object} Health check results
 */
export const performServiceHealthCheck = () => {
  const results = {
    timestamp: new Date().toISOString(),
    memoryManager: null,
    crossTabSync: null,
    cachePreloader: null,
    overall: 'unknown'
  };

  try {
    // Test Memory Manager
    console.log('🔍 Testing Memory Manager...');
    results.memoryManager = {
      imported: !!memoryManager,
      type: typeof memoryManager,
      hasInitialize: typeof memoryManager?.initialize === 'function',
      methods: memoryManager ? Object.getOwnPropertyNames(Object.getPrototypeOf(memoryManager)) : [],
      status: 'unknown'
    };

    if (memoryManager && typeof memoryManager.initialize === 'function') {
      results.memoryManager.status = 'healthy';
      console.log('✅ Memory Manager: Healthy');
    } else {
      results.memoryManager.status = 'error';
      console.error('❌ Memory Manager: Missing initialize method');
    }

    // Test Cross-Tab Sync
    console.log('🔍 Testing Cross-Tab Sync...');
    results.crossTabSync = {
      imported: !!crossTabSync,
      type: typeof crossTabSync,
      hasInitialize: typeof crossTabSync?.initialize === 'function',
      methods: crossTabSync ? Object.getOwnPropertyNames(Object.getPrototypeOf(crossTabSync)) : [],
      status: 'unknown'
    };

    if (crossTabSync && typeof crossTabSync.initialize === 'function') {
      results.crossTabSync.status = 'healthy';
      console.log('✅ Cross-Tab Sync: Healthy');
    } else {
      results.crossTabSync.status = 'error';
      console.error('❌ Cross-Tab Sync: Missing initialize method');
    }

    // Test Cache Preloader
    console.log('🔍 Testing Cache Preloader...');
    results.cachePreloader = {
      imported: !!cachePreloader,
      type: typeof cachePreloader,
      hasPreloadCriticalData: typeof cachePreloader?.preloadCriticalData === 'function',
      methods: cachePreloader ? Object.getOwnPropertyNames(Object.getPrototypeOf(cachePreloader)) : [],
      status: 'unknown'
    };

    if (cachePreloader && typeof cachePreloader.preloadCriticalData === 'function') {
      results.cachePreloader.status = 'healthy';
      console.log('✅ Cache Preloader: Healthy');
    } else {
      results.cachePreloader.status = 'error';
      console.error('❌ Cache Preloader: Missing preloadCriticalData method');
    }

    // Overall status
    const allHealthy = Object.values(results)
      .filter(result => typeof result === 'object' && result?.status)
      .every(result => result.status === 'healthy');

    results.overall = allHealthy ? 'healthy' : 'degraded';

    console.log('🏥 Service Health Check Summary:', {
      overall: results.overall,
      memoryManager: results.memoryManager.status,
      crossTabSync: results.crossTabSync.status,
      cachePreloader: results.cachePreloader.status
    });

  } catch (error) {
    console.error('💥 Service Health Check Failed:', error);
    results.overall = 'error';
    results.error = error.message;
  }

  return results;
};

/**
 * Quick service validation - logs results and returns boolean
 * @returns {boolean} True if all services are healthy
 */
export const validateServices = () => {
  const results = performServiceHealthCheck();
  return results.overall === 'healthy';
};

export default {
  performServiceHealthCheck,
  validateServices
};
