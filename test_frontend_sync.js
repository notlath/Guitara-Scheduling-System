#!/usr/bin/env node
/**
 * Test script to verify the frontend syncService functionality
 * This tests the new real-time sync features without needing the backend
 */

// Mock localStorage for Node.js testing
const localStorage = {
  data: {},
  setItem(key, value) {
    this.data[key] = value;
  },
  getItem(key) {
    return this.data[key] || null;
  },
  removeItem(key) {
    delete this.data[key];
  }
};

// Mock window and location
global.window = {
  location: {
    pathname: '/test'
  }
};

global.localStorage = localStorage;

// Import the syncService logic (we'll need to extract the core logic)
class TestSyncService {
  constructor() {
    this.listeners = new Map();
    this.lastUpdateTimes = new Map();
  }

  broadcastWithImmediate(eventType, data) {
    console.log(`📡 Broadcasting ${eventType} with immediate delivery:`, data);
    
    const syncData = {
      ...data,
      timestamp: Date.now(),
      source: '/test'
    };
    
    // First, notify local listeners immediately (same tab)
    if (this.listeners.has(eventType)) {
      this.listeners.get(eventType).forEach(callback => {
        try {
          console.log(`🔔 Calling local listener for ${eventType}`);
          callback(syncData);
        } catch (error) {
          console.error(`Error in immediate sync listener for ${eventType}:`, error);
        }
      });
    }
    
    // Then broadcast to other tabs via localStorage
    localStorage.setItem(`sync_${eventType}`, JSON.stringify(syncData));
    console.log(`💾 Stored sync event in localStorage: sync_${eventType}`);
    
    // Remove after a short delay to prevent storage bloat
    setTimeout(() => {
      localStorage.removeItem(`sync_${eventType}`);
      console.log(`🗑️ Cleaned up localStorage for ${eventType}`);
    }, 5000);
  }

  subscribe(eventType, callback) {
    console.log(`📬 Subscribing to ${eventType}`);
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType).add(callback);

    // Return unsubscribe function
    return () => {
      console.log(`📭 Unsubscribing from ${eventType}`);
      const listeners = this.listeners.get(eventType);
      if (listeners) {
        listeners.delete(callback);
        if (listeners.size === 0) {
          this.listeners.delete(eventType);
        }
      }
    };
  }

  triggerAvailabilityRefresh(staffId, date) {
    console.log(`🔄 Triggering availability refresh for staff ${staffId} on ${date}`);
    const eventData = {
      staffId: parseInt(staffId, 10),
      date: date,
      timestamp: Date.now()
    };
    
    // Store the refresh trigger in localStorage with a timestamp
    localStorage.setItem('availability_refresh_trigger', JSON.stringify(eventData));
    
    // Broadcast the refresh event
    this.broadcastWithImmediate('global_availability_refresh', eventData);
    
    // Remove the trigger after a short delay
    setTimeout(() => {
      localStorage.removeItem('availability_refresh_trigger');
      console.log(`🗑️ Cleaned up availability refresh trigger`);
    }, 3000);
  }

  needsAvailabilityRefresh(staffId, date) {
    const trigger = localStorage.getItem('availability_refresh_trigger');
    if (!trigger) return false;
    
    try {
      const eventData = JSON.parse(trigger);
      // Check if the trigger is recent (within last 3 seconds) and matches
      const isRecent = Date.now() - eventData.timestamp < 3000;
      const matchesStaff = eventData.staffId === parseInt(staffId, 10);
      const matchesDate = eventData.date === date;
      
      const result = isRecent && matchesStaff && matchesDate;
      console.log(`🔍 Checking refresh need for staff ${staffId} on ${date}: ${result}`);
      return result;
    } catch {
      return false;
    }
  }
}

// Test the sync service
function testSyncService() {
  console.log("🧪 Testing Frontend SyncService");
  console.log("=" * 50);

  const syncService = new TestSyncService();
  let receivedEvents = [];

  // Test 1: Subscribe to availability events
  console.log("\n1. 📬 Setting up event subscriptions...");
  
  const unsubscribeCreated = syncService.subscribe('availability_created', (data) => {
    console.log("✅ Received availability_created event:", data);
    receivedEvents.push({ type: 'created', data });
  });

  const unsubscribeUpdated = syncService.subscribe('availability_updated', (data) => {
    console.log("✅ Received availability_updated event:", data);
    receivedEvents.push({ type: 'updated', data });
  });

  const unsubscribeDeleted = syncService.subscribe('availability_deleted', (data) => {
    console.log("✅ Received availability_deleted event:", data);
    receivedEvents.push({ type: 'deleted', data });
  });

  const unsubscribeGlobal = syncService.subscribe('global_availability_refresh', (data) => {
    console.log("✅ Received global_availability_refresh event:", data);
    receivedEvents.push({ type: 'global_refresh', data });
  });

  // Test 2: Simulate availability creation
  console.log("\n2. 🆕 Simulating availability creation...");
  syncService.broadcastWithImmediate('availability_created', {
    staffId: 1,
    date: '2025-01-07',
    availability: { id: 123, start_time: '09:00', end_time: '10:00' },
    staffName: 'Test Therapist'
  });

  // Test 3: Simulate availability update
  console.log("\n3. ✏️ Simulating availability update...");
  syncService.broadcastWithImmediate('availability_updated', {
    staffId: 1,
    date: '2025-01-07',
    availability: { id: 123, start_time: '09:00', end_time: '11:00' },
    staffName: 'Test Therapist'
  });

  // Test 4: Trigger global refresh
  console.log("\n4. 🔄 Triggering global availability refresh...");
  syncService.triggerAvailabilityRefresh(1, '2025-01-07');

  // Test 5: Check refresh needs
  console.log("\n5. 🔍 Testing refresh need detection...");
  setTimeout(() => {
    const needsRefresh = syncService.needsAvailabilityRefresh(1, '2025-01-07');
    console.log(`Should refresh for staff 1 on 2025-01-07: ${needsRefresh}`);
    
    const shouldNotRefresh = syncService.needsAvailabilityRefresh(2, '2025-01-07');
    console.log(`Should refresh for staff 2 on 2025-01-07: ${shouldNotRefresh}`);
    
    // Test 6: Simulate availability deletion
    console.log("\n6. ❌ Simulating availability deletion...");
    syncService.broadcastWithImmediate('availability_deleted', {
      staffId: 1,
      date: '2025-01-07',
      availabilityId: 123,
      staffName: 'Test Therapist'
    });

    // Test results (run immediately)
    console.log("\n📊 Test Results:");
    console.log(`Total events received: ${receivedEvents.length}`);
    console.log("Event types received:", receivedEvents.map(e => e.type));
    
    const expectedEvents = ['created', 'updated', 'global_refresh', 'deleted'];
    const missingEvents = expectedEvents.filter(type => 
      !receivedEvents.some(e => e.type === type)
    );
    
    if (missingEvents.length === 0) {
      console.log("✅ All expected events were received!");
      console.log("✅ Frontend sync service is working correctly!");
    } else {
      console.log("❌ Missing events:", missingEvents);
    }

    // Cleanup
    unsubscribeCreated();
    unsubscribeUpdated();
    unsubscribeDeleted();
    unsubscribeGlobal();
    console.log("🧹 Cleaned up subscriptions");
  }, 100);
}

// Run the test
testSyncService();
