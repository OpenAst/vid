const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

io.on("connection", (socket: Socket) => {
  console.log("A user connected", socket.id);

  // join room
  socket.on("join-room", (roomId) => {
    socket.join(roomId);
    console.log('User joined room: ${roomId');
  });


})



