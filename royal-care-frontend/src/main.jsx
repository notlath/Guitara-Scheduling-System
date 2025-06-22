import { QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import App from "./App.jsx";
import { WebSocketProvider } from "./contexts/WebSocketContext"; // Import WebSocket provider
import "./index.css";
import { queryClient } from "./lib/queryClient"; // Import TanStack Query client
import store from "./store"; // Import the Redux store

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <Provider store={store}>
        <WebSocketProvider>
          <App />
        </WebSocketProvider>
      </Provider>
    </QueryClientProvider>
  </StrictMode>
);
