/**
 * Keyboard Shortcuts Hook for Operator Dashboard
 * Provides comprehensive keyboard navigation and shortcuts
 */
import { useCallback, useEffect, useRef, useState } from "react";

export const useKeyboardShortcuts = () => {
  const [activeShortcuts, setActiveShortcuts] = useState(new Set());
  const shortcutsRef = useRef(new Map());

  // Register a keyboard shortcut
  const registerShortcut = useCallback((key, callback, description = "") => {
    const shortcutKey = normalizeKey(key);
    shortcutsRef.current.set(shortcutKey, {
      callback,
      description,
      key: shortcutKey,
    });
    setActiveShortcuts(new Set(shortcutsRef.current.keys()));
  }, []);

  // Unregister a keyboard shortcut
  const unregisterShortcut = useCallback((key) => {
    const shortcutKey = normalizeKey(key);
    shortcutsRef.current.delete(shortcutKey);
    setActiveShortcuts(new Set(shortcutsRef.current.keys()));
  }, []);

  // Normalize key combination for consistency
  const normalizeKey = (key) => {
    return key
      .toLowerCase()
      .split("+")
      .map((k) => k.trim())
      .sort((a, b) => {
        const order = ["ctrl", "shift", "alt", "meta"];
        const aIndex = order.indexOf(a);
        const bIndex = order.indexOf(b);
        if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
        if (aIndex !== -1) return -1;
        if (bIndex !== -1) return 1;
        return a.localeCompare(b);
      })
      .join("+");
  };

  // Check if key combination matches
  const matchesShortcut = (event, shortcutKey) => {
    const parts = shortcutKey.split("+");
    const key = parts[parts.length - 1];
    const modifiers = parts.slice(0, -1);

    // Check main key
    const eventKey = event.key.toLowerCase();
    if (eventKey !== key && event.code.toLowerCase() !== key) {
      return false;
    }

    // Check modifiers
    const hasCtrl = modifiers.includes("ctrl") ? event.ctrlKey : !event.ctrlKey;
    const hasShift = modifiers.includes("shift")
      ? event.shiftKey
      : !event.shiftKey;
    const hasAlt = modifiers.includes("alt") ? event.altKey : !event.altKey;
    const hasMeta = modifiers.includes("meta") ? event.metaKey : !event.metaKey;

    return hasCtrl && hasShift && hasAlt && hasMeta;
  };

  // Handle keyboard events
  const handleKeyDown = useCallback((event) => {
    // Skip if user is typing in an input field
    if (
      event.target.tagName === "INPUT" ||
      event.target.tagName === "TEXTAREA" ||
      event.target.isContentEditable
    ) {
      return;
    }

    // Check all registered shortcuts
    for (const [shortcutKey, shortcutData] of shortcutsRef.current) {
      if (matchesShortcut(event, shortcutKey)) {
        event.preventDefault();
        event.stopPropagation();
        shortcutData.callback(event);
        break;
      }
    }
  }, []);

  // Set up global keyboard event listeners
  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleKeyDown]);

  // Get all active shortcuts for help/display purposes
  const getActiveShortcuts = useCallback(() => {
    return Array.from(shortcutsRef.current.entries()).map(([key, data]) => ({
      key,
      description: data.description,
    }));
  }, []);

  return {
    registerShortcut,
    unregisterShortcut,
    getActiveShortcuts,
    activeShortcuts,
  };
};

/**
 * Operator Dashboard specific keyboard shortcuts
 */
export const useOperatorKeyboardShortcuts = ({
  onSelectAll,
  onClearSelection,
  onBulkApprove,
  onBulkCancel,
  onOpenDriverAssignment,
  onOpenPaymentModal,
  onRefreshData,
  onSwitchView,
  onToggleSearch,
  onExportData,
}) => {
  const { registerShortcut, unregisterShortcut, getActiveShortcuts } =
    useKeyboardShortcuts();

  useEffect(() => {
    // Selection shortcuts
    if (onSelectAll) {
      registerShortcut("ctrl+a", onSelectAll, "Select all appointments");
    }
    if (onClearSelection) {
      registerShortcut("escape", onClearSelection, "Clear selection");
    }

    // Bulk action shortcuts
    if (onBulkApprove) {
      registerShortcut(
        "ctrl+shift+a",
        onBulkApprove,
        "Approve selected appointments"
      );
    }
    if (onBulkCancel) {
      registerShortcut(
        "ctrl+shift+c",
        onBulkCancel,
        "Cancel selected appointments"
      );
    }

    // Modal shortcuts
    if (onOpenDriverAssignment) {
      registerShortcut(
        "ctrl+shift+d",
        onOpenDriverAssignment,
        "Open driver assignment"
      );
    }
    if (onOpenPaymentModal) {
      registerShortcut(
        "ctrl+shift+p",
        onOpenPaymentModal,
        "Open payment modal"
      );
    }

    // Navigation shortcuts
    if (onRefreshData) {
      registerShortcut("f5", onRefreshData, "Refresh dashboard data");
      registerShortcut("ctrl+r", onRefreshData, "Refresh dashboard data");
    }
    if (onToggleSearch) {
      registerShortcut("ctrl+f", onToggleSearch, "Toggle search");
    }
    if (onExportData) {
      registerShortcut("ctrl+e", onExportData, "Export data");
    }

    // View switching shortcuts
    if (onSwitchView) {
      registerShortcut(
        "ctrl+1",
        () => onSwitchView("overview"),
        "Switch to Overview"
      );
      registerShortcut(
        "ctrl+2",
        () => onSwitchView("appointments"),
        "Switch to Appointments"
      );
      registerShortcut(
        "ctrl+3",
        () => onSwitchView("drivers"),
        "Switch to Drivers"
      );
      registerShortcut(
        "ctrl+4",
        () => onSwitchView("payments"),
        "Switch to Payments"
      );
      registerShortcut(
        "ctrl+5",
        () => onSwitchView("attendance"),
        "Switch to Attendance"
      );
    }

    // Cleanup function
    return () => {
      const shortcuts = [
        "ctrl+a",
        "escape",
        "ctrl+shift+a",
        "ctrl+shift+c",
        "ctrl+shift+d",
        "ctrl+shift+p",
        "f5",
        "ctrl+r",
        "ctrl+f",
        "ctrl+e",
        "ctrl+1",
        "ctrl+2",
        "ctrl+3",
        "ctrl+4",
        "ctrl+5",
      ];
      shortcuts.forEach(unregisterShortcut);
    };
  }, [
    onSelectAll,
    onClearSelection,
    onBulkApprove,
    onBulkCancel,
    onOpenDriverAssignment,
    onOpenPaymentModal,
    onRefreshData,
    onSwitchView,
    onToggleSearch,
    onExportData,
    registerShortcut,
    unregisterShortcut,
  ]);

  return {
    getActiveShortcuts,
  };
};

/**
 * Bulk Operations Hook with Performance Optimization
 */
export const useBulkOperations = () => {
  const [selectedItems, setSelectedItems] = useState(new Set());
  const [bulkActionLoading, setBulkActionLoading] = useState({});

  // Select all items
  const selectAll = useCallback((items) => {
    setSelectedItems(new Set(items.map((item) => item.id)));
  }, []);

  // Clear selection
  const clearSelection = useCallback(() => {
    setSelectedItems(new Set());
  }, []);

  // Toggle item selection
  const toggleSelection = useCallback((itemId) => {
    setSelectedItems((prev) => {
      const newSelection = new Set(prev);
      if (newSelection.has(itemId)) {
        newSelection.delete(itemId);
      } else {
        newSelection.add(itemId);
      }
      return newSelection;
    });
  }, []);

  // Get selected items data
  const getSelectedItems = useCallback(
    (allItems) => {
      return allItems.filter((item) => selectedItems.has(item.id));
    },
    [selectedItems]
  );

  // Execute bulk action with optimistic updates
  const executeBulkAction = useCallback(
    async (actionId, items, actionFn) => {
      setBulkActionLoading((prev) => ({ ...prev, [actionId]: true }));

      try {
        // Execute the bulk action
        await actionFn(items);

        // Clear selection after successful action
        clearSelection();

        return { success: true };
      } catch (error) {
        console.error(`Bulk action ${actionId} failed:`, error);
        return { success: false, error };
      } finally {
        setBulkActionLoading((prev) => ({ ...prev, [actionId]: false }));
      }
    },
    [clearSelection]
  );

  // Check if any bulk action is loading
  const isBulkLoading = Object.values(bulkActionLoading).some(
    (loading) => loading
  );

  return {
    selectedItems,
    selectedCount: selectedItems.size,
    selectAll,
    clearSelection,
    toggleSelection,
    getSelectedItems,
    executeBulkAction,
    bulkActionLoading,
    isBulkLoading,
  };
};
