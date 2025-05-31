import { io, Socket } from "socket.io-client";

let socket: Socket | undefined;

export function initSocket(token: string) {
  if (!socket) {
    socket = io(process.env.NEXT_PUBLIC_SOCKET_URL, {
      auth: { token },
      autoConnect: false,
      reconnectionDelay: 10000,
      reconnectionDelayMax: 10000
    });

    socket.on("connect", () => {
      console.log("Recovered ?:", socket?.recovered);
      
      setTimeout(() => {
        if (socket?.io.engine) {
          socket.io.engine.close();
        }
      }, 10000)
    });

    socket.on("comment-liked", ({ commentId, likes }) => {
      console.log(" Comment liked:", commentId, "Likes:", likes);
    })

    socket.on("new-comment", (data) => {
      console.log("New Comment:", data);
    });

    socket.on("video-liked", ({ videoId, user }) => {
      console.log("Video liked", videoId, "by", user?.id);
    })
    socket.on("disconnect", () => {
      console.log("Disconnected from socket");
    });
  }

  return socket;
}


export function getSocket(): Socket | undefined {
  return socket;
};