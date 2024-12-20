import { io } from "socket.io-client"

const socket = io("http://localhost:4000");

socket.on("connect", () => {
  console.log("connected to the server!")
})

socket.on("new-comment", (comment) => {
  console.log("New comment:", comment);
});

const sendComment = (comment) => {
  socket.emit("post-comment"), { videoId: "123", comment};
};