import { io, Socket } from "socket.io-client";

function getSocketBaseUrl() {
  const apiUrl =
    process.env.NEXT_PUBLIC_REALTIME_URL ||
    process.env.NEXT_PUBLIC_WS_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "http://localhost:4000";

  return apiUrl.replace(/\/$/, "");
}

export function createRealtimeSocket(token: string): Socket {
  return io(getSocketBaseUrl(), {
    auth: { token },
    withCredentials: true,
    autoConnect: false,
    reconnectionDelay: 1000,
    reconnectionAttempts: 5,
  });
}
