import { io, Socket } from "socket.io-client";

let socket: Socket

export function initSocket(token: string): Socket {
  if (!socket) return socket;

  socket = io(process.env.NEXT_PUBLIC_SOCKET_URL_DEV, {
    auth: { token },
    withCredentials: true,
    autoConnect: false,
    reconnectionDelay: 1000,
    reconnectionAttempts: 5
  });
  return socket;
};


export function getSocket(): Socket {
  if (!socket) throw new Error('Socket not initialized');
  return socket;
};