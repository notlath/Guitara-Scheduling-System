// import { Client } from "@stomp/stompjs";
// import SockJS from "sockjs-client";

// export const connectWebSocket = (userRole) => {
//   const client = new Client({
//     webSocketFactory: () => new SockJS(import.meta.env.VITE_WS_BASE_URL),
//     reconnectDelay: 5000,
//   });

//   client.onConnect = () => {
//     client.subscribe(`/topic/${userRole}-notifications`, (message) => {
//       // Handle real-time updates
//     });
//   };

//   client.activate();
// };
