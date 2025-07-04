import { QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import App from "./App.jsx";
import DevTools from "./components/DevTools.jsx";
import { WebSocketProvider } from "./contexts/WebSocketContext"; // Import WebSocket provider
import "./index.css";
import { queryClient } from "./lib/queryClient"; // Import TanStack Query client
import store from "./store"; // Import the Redux store
import { initializeExtensionErrorSuppressor } from "./utils/extensionErrorSuppressor"; // Import extension error suppressor

// Initialize extension error suppressor to reduce console noise in production
initializeExtensionErrorSuppressor();

// Make queryClient available globally for login cache invalidation
window.queryClient = queryClient;

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <Provider store={store}>
        <WebSocketProvider>
          <App />
          {import.meta.env.DEV && <DevTools />}
        </WebSocketProvider>
      </Provider>
    </QueryClientProvider>
  </StrictMode>
);
