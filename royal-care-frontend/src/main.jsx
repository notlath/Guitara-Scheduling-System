import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import App from "./App.jsx";
import { WebSocketProvider } from "./contexts/WebSocketContext"; // Import WebSocket provider
import "./index.css";
import { queryClient } from "./lib/queryClient"; // Import TanStack Query client
import store from "./store"; // Import the Redux store
import { initializeExtensionErrorSuppressor } from "./utils/extensionErrorSuppressor"; // Import extension error suppressor

// Initialize extension error suppressor to reduce console noise in production
initializeExtensionErrorSuppressor();

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <Provider store={store}>
        <WebSocketProvider>
          <App />
          {/* Add React Query DevTools for development */}
          <ReactQueryDevtools initialIsOpen={false} />
        </WebSocketProvider>
      </Provider>
    </QueryClientProvider>
  </StrictMode>
);
