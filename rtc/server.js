const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const { PeerServer } = require("peer");
const app = express();
const server = http.createServer(app);

const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ['GET', 'POST']
  }
});

io.on("connection", (socket) => {
  console.log("New client connected");

  socket.on("join-room", (roomId, userId) => {
    socket.join(roomId);
    socket.broadcast.to(roomId).emit("user-connected", userId);
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected");
  });
});

const peerServer = PeerServer({ port: 9000, path: "/" });
console.log("WebRTC PeerServer running on port 9000");


server.listen(5000, () => console.log("Websocket server running on port 5000"));