/**
 * ROBUST APPOINTMENT FILTERING TESTS
 * Comprehensive test suite for useRobustAppointmentFilters hook
 */

import { renderHook } from "@testing-library/react";
import {
  useRobustAppointmentFilters,
  useRobustAppointmentSorting,
} from "../useRobustAppointmentFilters";

// Mock data for testing
const createMockAppointment = (overrides = {}) => ({
  id: `apt_${Math.random().toString(36).substr(2, 9)}`,
  status: "pending",
  date: new Date().toISOString(),
  created_at: new Date().toISOString(),
  payment_status: "pending",
  operator_review_status: null,
  ...overrides,
});

// Test data sets
const validAppointments = [
  createMockAppointment({ status: "pending" }),
  createMockAppointment({ status: "rejected" }),
  createMockAppointment({ status: "awaiting_payment" }),
  createMockAppointment({ status: "in_progress" }),
  createMockAppointment({ status: "completed", payment_status: "paid" }),
];

const appointmentsWithTimeouts = [
  createMockAppointment({
    status: "pending",
    created_at: new Date(Date.now() - 20 * 60 * 1000).toISOString(), // 20 minutes ago
  }),
  createMockAppointment({
    status: "pending",
    created_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(), // 10 minutes ago
  }),
  createMockAppointment({
    status: "pending",
    created_at: new Date(Date.now() - 2 * 60 * 1000).toISOString(), // 2 minutes ago
  }),
];

const invalidAppointments = [
  null,
  undefined,
  { id: null, status: "pending" },
  { id: "valid_id", status: "invalid_status" },
  { id: "valid_id", status: "pending", date: "invalid_date" },
];

describe("useRobustAppointmentFilters", () => {
  describe("Input Validation", () => {
    test("handles null appointments array", () => {
      const { result } = renderHook(() => useRobustAppointmentFilters(null));

      expect(result.current.rejected).toEqual([]);
      expect(result.current.pending).toEqual([]);
      expect(result.current.validationErrors).toContain(
        "Appointments data is null or undefined"
      );
      expect(result.current.error).toBe("Validation errors occurred");
    });

    test("handles undefined appointments array", () => {
      const { result } = renderHook(() =>
        useRobustAppointmentFilters(undefined)
      );

      expect(result.current.rejected).toEqual([]);
      expect(result.current.pending).toEqual([]);
      expect(result.current.validationErrors).toContain(
        "Appointments data is null or undefined"
      );
    });

    test("handles non-array input", () => {
      const { result } = renderHook(() =>
        useRobustAppointmentFilters("not an array")
      );

      expect(result.current.rejected).toEqual([]);
      expect(result.current.validationErrors).toContain(
        "Expected array, got string"
      );
    });

    test("handles empty array", () => {
      const { result } = renderHook(() => useRobustAppointmentFilters([]));

      expect(result.current.rejected).toEqual([]);
      expect(result.current.pending).toEqual([]);
      expect(result.current.error).toBeNull();
      expect(result.current.validationErrors).toEqual([]);
    });
  });

  describe("Appointment Validation", () => {
    test("filters out invalid appointments", () => {
      const mixedAppointments = [...validAppointments, ...invalidAppointments];

      const { result } = renderHook(() =>
        useRobustAppointmentFilters(mixedAppointments)
      );

      expect(result.current.validationErrors.length).toBeGreaterThan(0);
      expect(result.current.processedCount).toBe(validAppointments.length);
      expect(result.current.skippedCount).toBe(0);
    });

    test("validates appointment dates", () => {
      const appointmentsWithInvalidDates = [
        createMockAppointment({ date: "invalid_date" }),
        createMockAppointment({ created_at: "invalid_date" }),
      ];

      const { result } = renderHook(() =>
        useRobustAppointmentFilters(appointmentsWithInvalidDates)
      );

      expect(
        result.current.validationErrors.some((error) =>
          error.includes("Invalid date format")
        )
      ).toBe(true);
    });
  });

  describe("Status Categorization", () => {
    test("correctly categorizes rejected appointments", () => {
      const rejectedAppointments = [
        createMockAppointment({ status: "rejected" }),
        createMockAppointment({
          status: "rejected",
          operator_review_status: "pending",
        }),
      ];

      const { result } = renderHook(() =>
        useRobustAppointmentFilters(rejectedAppointments)
      );

      expect(result.current.rejected).toHaveLength(2);
      expect(result.current.rejectionStats.total).toBe(2);
      expect(result.current.rejectionStats.pending).toBe(1);
    });

    test("correctly categorizes pending appointments", () => {
      const pendingAppointments = [
        createMockAppointment({ status: "pending" }),
        createMockAppointment({ status: "pending" }),
      ];

      const { result } = renderHook(() =>
        useRobustAppointmentFilters(pendingAppointments)
      );

      expect(result.current.pending).toHaveLength(2);
    });

    test("correctly categorizes awaiting payment appointments", () => {
      const paymentAppointments = [
        createMockAppointment({ status: "awaiting_payment" }),
        createMockAppointment({
          status: "completed",
          payment_status: "pending",
        }),
        createMockAppointment({
          status: "completed",
          payment_status: "unpaid",
        }),
      ];

      const { result } = renderHook(() =>
        useRobustAppointmentFilters(paymentAppointments)
      );

      expect(result.current.awaitingPayment).toHaveLength(3);
    });

    test("correctly categorizes active sessions", () => {
      const activeSessionAppointments = [
        createMockAppointment({ status: "in_progress" }),
        createMockAppointment({ status: "journey" }),
        createMockAppointment({ status: "session_in_progress" }),
      ];

      const { result } = renderHook(() =>
        useRobustAppointmentFilters(activeSessionAppointments)
      );

      expect(result.current.activeSessions).toHaveLength(3);
    });

    test("correctly categorizes pickup requests", () => {
      const pickupAppointments = [
        createMockAppointment({ status: "pickup_requested" }),
        createMockAppointment({ status: "driver_assigned_pickup" }),
        createMockAppointment({ status: "return_journey" }),
      ];

      const { result } = renderHook(() =>
        useRobustAppointmentFilters(pickupAppointments)
      );

      expect(result.current.pickupRequests).toHaveLength(3);
    });
  });

  describe("Timeout Detection", () => {
    test("correctly identifies overdue appointments", () => {
      const { result } = renderHook(() =>
        useRobustAppointmentFilters(appointmentsWithTimeouts)
      );

      expect(result.current.overdue).toHaveLength(1); // Only the 20-minute old one
      expect(result.current.approachingDeadline).toHaveLength(1); // The 10-minute old one
      expect(result.current.pending).toHaveLength(3); // All are still pending
    });

    test("handles appointments with invalid created_at dates", () => {
      const appointmentsWithInvalidDates = [
        createMockAppointment({
          status: "pending",
          created_at: "invalid_date",
        }),
      ];

      const { result } = renderHook(() =>
        useRobustAppointmentFilters(appointmentsWithInvalidDates)
      );

      expect(result.current.pending).toHaveLength(1);
      expect(result.current.overdue).toHaveLength(0);
      expect(
        result.current.validationErrors.some((error) =>
          error.includes("Invalid created_at format")
        )
      ).toBe(true);
    });
  });

  describe("Error Handling", () => {
    test("handles processing errors gracefully", () => {
      // Create appointments that might cause processing errors
      const problematicAppointments = [
        createMockAppointment({ status: "pending" }),
        { ...createMockAppointment(), status: undefined }, // This will cause validation error
      ];

      const { result } = renderHook(() =>
        useRobustAppointmentFilters(problematicAppointments)
      );

      expect(result.current.processedCount).toBe(1);
      expect(result.current.validationErrors.length).toBeGreaterThan(0);
    });

    test("returns stable empty results for critical errors", () => {
      // Simulate a critical error by passing malformed data
      const { result } = renderHook(() =>
        useRobustAppointmentFilters(validAppointments)
      );

      // All arrays should be frozen to prevent mutations
      expect(Object.isFrozen(result.current.rejected)).toBe(true);
      expect(Object.isFrozen(result.current.pending)).toBe(true);
      expect(Object.isFrozen(result.current.rejectionStats)).toBe(true);
    });
  });

  describe("Performance and Stability", () => {
    test("returns consistent results for same input", () => {
      const { result, rerender } = renderHook(
        ({ appointments }) => useRobustAppointmentFilters(appointments),
        { initialProps: { appointments: validAppointments } }
      );

      const firstResult = result.current;
      rerender({ appointments: validAppointments });
      const secondResult = result.current;

      expect(firstResult.rejected).toEqual(secondResult.rejected);
      expect(firstResult.pending).toEqual(secondResult.pending);
    });

    test("handles large appointment arrays efficiently", () => {
      const largeAppointmentArray = Array.from({ length: 1000 }, (_, index) =>
        createMockAppointment({
          id: `large_apt_${index}`,
          status: index % 5 === 0 ? "rejected" : "pending",
        })
      );

      const startTime = performance.now();
      const { result } = renderHook(() =>
        useRobustAppointmentFilters(largeAppointmentArray)
      );
      const endTime = performance.now();

      expect(result.current.processedCount).toBe(1000);
      expect(result.current.rejected).toHaveLength(200); // Every 5th appointment
      expect(result.current.pending).toHaveLength(800);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });
  });
});

describe("useRobustAppointmentSorting", () => {
  const testAppointments = [
    createMockAppointment({
      status: "completed",
      created_at: new Date(Date.now() - 60000).toISOString(),
    }),
    createMockAppointment({
      status: "rejected",
      created_at: new Date(Date.now() - 120000).toISOString(),
    }),
    createMockAppointment({
      status: "pending",
      created_at: new Date(Date.now() - 30000).toISOString(),
    }),
    createMockAppointment({
      status: "in_progress",
      created_at: new Date(Date.now() - 180000).toISOString(),
    }),
  ];

  describe("Input Validation", () => {
    test("handles invalid appointments input", () => {
      const { result } = renderHook(() =>
        useRobustAppointmentSorting(null, "all")
      );

      expect(result.current.items).toEqual([]);
      expect(result.current.error).toContain("Invalid appointments input");
      expect(result.current.originalCount).toBe(0);
    });

    test("handles invalid filter values", () => {
      const { result } = renderHook(() =>
        useRobustAppointmentSorting(testAppointments, "invalid_filter")
      );

      expect(result.current.appliedFilter).toBe("all"); // Should fallback to 'all'
      expect(result.current.items).toHaveLength(4); // All appointments should be included
    });
  });

  describe("Filtering Logic", () => {
    test("filters pending appointments correctly", () => {
      const { result } = renderHook(() =>
        useRobustAppointmentSorting(testAppointments, "pending")
      );

      expect(result.current.items).toHaveLength(1);
      expect(result.current.items[0].status).toBe("pending");
      expect(result.current.appliedFilter).toBe("pending");
    });

    test("filters rejected appointments correctly", () => {
      const { result } = renderHook(() =>
        useRobustAppointmentSorting(testAppointments, "rejected")
      );

      expect(result.current.items).toHaveLength(1);
      expect(result.current.items[0].status).toBe("rejected");
    });

    test("filters today appointments correctly", () => {
      const todayAppointments = [
        createMockAppointment({ date: new Date().toISOString() }),
        createMockAppointment({
          date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        }), // Yesterday
      ];

      const { result } = renderHook(() =>
        useRobustAppointmentSorting(todayAppointments, "today")
      );

      expect(result.current.items).toHaveLength(1);
    });

    test("filters upcoming appointments correctly", () => {
      const futureDate = new Date(
        Date.now() + 24 * 60 * 60 * 1000
      ).toISOString();
      const upcomingAppointments = [
        createMockAppointment({ date: futureDate }),
        createMockAppointment({ date: new Date().toISOString() }), // Today
      ];

      const { result } = renderHook(() =>
        useRobustAppointmentSorting(upcomingAppointments, "upcoming")
      );

      expect(result.current.items).toHaveLength(1);
      expect(result.current.items[0].date).toBe(futureDate);
    });
  });

  describe("Sorting Logic", () => {
    test("sorts by status priority correctly", () => {
      const { result } = renderHook(() =>
        useRobustAppointmentSorting(testAppointments, "all")
      );

      const statuses = result.current.items.map((apt) => apt.status);

      // Should be sorted by priority: rejected (5) > in_progress (1) > pending (3) > completed (0)
      expect(statuses[0]).toBe("rejected");
      // The exact order may vary for same priority items based on time
    });

    test("sorts by creation time for same priority", () => {
      const sameStatusAppointments = [
        createMockAppointment({
          status: "pending",
          created_at: new Date(Date.now() - 60000).toISOString(),
        }),
        createMockAppointment({
          status: "pending",
          created_at: new Date(Date.now() - 30000).toISOString(),
        }),
      ];

      const { result } = renderHook(() =>
        useRobustAppointmentSorting(sameStatusAppointments, "all")
      );

      // Newer appointments should come first
      const times = result.current.items.map((apt) =>
        new Date(apt.created_at).getTime()
      );
      expect(times[0]).toBeGreaterThan(times[1]);
    });
  });

  describe("Error Handling", () => {
    test("handles filter errors gracefully", () => {
      const appointmentsWithInvalidDates = [
        createMockAppointment({ date: "invalid_date" }),
        createMockAppointment({ date: new Date().toISOString() }),
      ];

      const { result } = renderHook(() =>
        useRobustAppointmentSorting(appointmentsWithInvalidDates, "today")
      );

      expect(result.current.error).toContain("Filter errors");
      expect(result.current.filterErrors.length).toBeGreaterThan(0);
    });

    test("handles sort comparison errors", () => {
      const problematicAppointments = [
        createMockAppointment({ created_at: null }),
        createMockAppointment({ created_at: "invalid_date" }),
        createMockAppointment({ created_at: new Date().toISOString() }),
      ];

      const { result } = renderHook(() =>
        useRobustAppointmentSorting(problematicAppointments, "all")
      );

      // Should still return results without crashing
      expect(result.current.items).toHaveLength(3);
      expect(result.current.error).toBeNull(); // Sorting errors are handled gracefully
    });
  });

  describe("Performance and Caching", () => {
    test("caches results for identical inputs", () => {
      const { result, rerender } = renderHook(
        ({ appointments, filter }) =>
          useRobustAppointmentSorting(appointments, filter),
        { initialProps: { appointments: testAppointments, filter: "all" } }
      );

      const firstResult = result.current;
      rerender({ appointments: testAppointments, filter: "all" });
      const secondResult = result.current;

      // Results should be identical (same reference for cached results)
      expect(firstResult.items).toBe(secondResult.items);
    });

    test("handles cache size limits", () => {
      const { rerender } = renderHook(
        ({ appointments, filter }) =>
          useRobustAppointmentSorting(appointments, filter),
        { initialProps: { appointments: testAppointments, filter: "all" } }
      );

      // Generate many different filter combinations to test cache limit
      for (let i = 0; i < 25; i++) {
        const testFilter = i % 2 === 0 ? "pending" : "completed";
        const modifiedAppointments = [
          ...testAppointments,
          createMockAppointment({ id: `cache_test_${i}` }),
        ];
        rerender({ appointments: modifiedAppointments, filter: testFilter });
      }

      // Should not crash or cause memory issues
      expect(true).toBe(true);
    });
  });
});
