import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useEffect } from "react";
import { createRoot } from "react-dom/client";
import { queryClient } from "../lib/queryClient";

/**
 * DevTools component for development only
 * Renders ReactQueryDevtools in a separate root to avoid context issues
 */
const DevTools = () => {
  useEffect(() => {
    // Only render in development
    if (!import.meta.env.DEV) {
      return;
    }

    // Create a separate div for DevTools
    const devToolsContainer = document.createElement("div");
    devToolsContainer.id = "react-query-devtools";
    document.body.appendChild(devToolsContainer);

    // Create a separate React root for DevTools
    const devToolsRoot = createRoot(devToolsContainer);

    // Render DevTools with its own QueryClientProvider
    devToolsRoot.render(
      <QueryClientProvider client={queryClient}>
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    );

    // Cleanup function
    return () => {
      // Defer unmount to avoid race condition with React render
      setTimeout(() => {
        devToolsRoot.unmount();
        if (devToolsContainer.parentNode) {
          devToolsContainer.parentNode.removeChild(devToolsContainer);
        }
      }, 0);
    };
  }, []);

  return null; // This component doesn't render anything in the main tree
};

export default DevTools;
