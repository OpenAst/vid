import { io, Socket } from "socket.io-client";

let socket: Socket;

function getSocketBaseUrl() {
  const apiUrl =
    process.env.NEXT_PUBLIC_WS_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "http://localhost:8000";

  return apiUrl.replace(/\/$/, "");
}

export function initSocket(token: string): Socket {
  if (socket) return socket;

  socket = io(getSocketBaseUrl(), {
    auth: { token },
    withCredentials: true,
    autoConnect: false,
    reconnectionDelay: 1000,
    reconnectionAttempts: 5,
  });
  return socket;
}


export function getSocket(): Socket {
  if (!socket) throw new Error('Socket not initialized');
  return socket;
}
