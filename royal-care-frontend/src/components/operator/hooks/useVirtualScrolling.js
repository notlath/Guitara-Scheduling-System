/**
 * Virtual Scrolling Hook for Large Lists
 * Optimizes rendering performance for large appointment lists
 */
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';

const ITEM_HEIGHT = 120; // Default item height
const BUFFER_SIZE = 5; // Items to render outside visible area
const VIRTUALIZATION_THRESHOLD = 50; // Enable virtualization for 50+ items

export const useVirtualScrolling = ({
  items = [],
  itemHeight = ITEM_HEIGHT,
  containerHeight = 600,
  bufferSize = BUFFER_SIZE,
  threshold = VIRTUALIZATION_THRESHOLD
}) => {
  const [scrollTop, setScrollTop] = useState(0);
  const [isScrolling, setIsScrolling] = useState(false);
  const containerRef = useRef(null);
  const scrollTimeoutRef = useRef(null);

  // Determine if virtualization should be enabled
  const shouldVirtualize = items.length > threshold;

  // Calculate visible range
  const visibleRange = useMemo(() => {
    if (!shouldVirtualize) {
      return { start: 0, end: items.length };
    }

    const start = Math.max(0, Math.floor(scrollTop / itemHeight) - bufferSize);
    const visibleCount = Math.ceil(containerHeight / itemHeight);
    const end = Math.min(items.length, start + visibleCount + bufferSize * 2);

    return { start, end };
  }, [scrollTop, itemHeight, containerHeight, bufferSize, shouldVirtualize, items.length]);

  // Handle scroll events
  const handleScroll = useCallback((e) => {
    const newScrollTop = e.target.scrollTop;
    setScrollTop(newScrollTop);
    setIsScrolling(true);

    // Clear existing timeout
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    // Set scrolling to false after scroll ends
    scrollTimeoutRef.current = setTimeout(() => {
      setIsScrolling(false);
    }, 150);
  }, []);

  // Scroll to specific item
  const scrollToItem = useCallback((index) => {
    if (containerRef.current && shouldVirtualize) {
      const scrollPosition = index * itemHeight;
      containerRef.current.scrollTop = scrollPosition;
    }
  }, [itemHeight, shouldVirtualize]);

  // Get visible items
  const visibleItems = useMemo(() => {
    if (!shouldVirtualize) {
      return items.map((item, index) => ({ ...item, virtualIndex: index }));
    }

    return items
      .slice(visibleRange.start, visibleRange.end)
      .map((item, index) => ({
        ...item,
        virtualIndex: visibleRange.start + index,
        offsetY: (visibleRange.start + index) * itemHeight
      }));
  }, [items, visibleRange, itemHeight, shouldVirtualize]);

  // Calculate total height
  const totalHeight = shouldVirtualize ? items.length * itemHeight : 'auto';

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  return {
    containerRef,
    visibleItems,
    totalHeight,
    shouldVirtualize,
    isScrolling,
    visibleRange,
    handleScroll,
    scrollToItem,
    containerHeight,
    itemHeight
  };
};

/**
 * Optimized Virtual List Component
 */
export const VirtualList = ({
  items,
  itemHeight = ITEM_HEIGHT,
  containerHeight = 600,
  renderItem,
  className = '',
  ...props
}) => {
  const {
    containerRef,
    visibleItems,
    totalHeight,
    shouldVirtualize,
    handleScroll
  } = useVirtualScrolling({
    items,
    itemHeight,
    containerHeight
  });

  if (!shouldVirtualize) {
    return (
      <div className={`virtual-list standard ${className}`} {...props}>
        {items.map((item, index) => renderItem(item, index))}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`virtual-list virtualized ${className}`}
      style={{ height: containerHeight, overflow: 'auto' }}
      onScroll={handleScroll}
      {...props}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        {visibleItems.map((item) => (
          <div
            key={item.id || item.virtualIndex}
            style={{
              position: 'absolute',
              top: item.offsetY,
              left: 0,
              right: 0,
              height: itemHeight
            }}
          >
            {renderItem(item, item.virtualIndex)}
          </div>
        ))}
      </div>
    </div>
  );
};

export default useVirtualScrolling;
