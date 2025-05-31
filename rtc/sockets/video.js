import axios from "axios";

export async function likeCommentInDjango(commentId, userToken) {
  const BASE_URL = process.env.DJANGO_API_URL || "http://localhost:8000"
  try {
    const response = await axios.post(
      `${BASE_URL}/api/comments/like`,
      { commentId: commentId },
      {
        headers: {
          Authorization: `JWT ${userToken}`,
          'Content-Type': 'application/json',
        }
      }
    );

    return response.data.likes;
  } catch (error) {
    console.error('Failed to like comment', error.response?.data || error.message);
    return null;
  }
}

export function videoSocket(io) {
  io.on('connection', (socket) => {
    if (socket.recovered) {
      console.log(`🔗 User connected: ${socket.user?.id}`);
    }
    socket.on('join-room', (roomId) => {
      socket.join(roomId);
      console.log(`${socket.user?.id} joined room ${roomId}`);
    });

    socket.on("new-comment", (data) => {
      io.to(data.roomId).emit("new-comment", {
        user: socket.user, 
        message: data.message,
      });
    });

    socket.on("send-comment", ({ parentId, text}) => {

    })
    socket.on("like-video", (videoId) => {
      io.emit("video-liked", { videoId, user: socket.user });
    });

    socket.on('signal', (data) => {
      socket.to(data.room).emit('signal', {
        userId: socket.user.id,
        signal: data.signal
      });
    });


    socket.on("like-comment", async ({ commentId, roomId }) => {
      try {
        const userToken = socket.user?.token;

        const newLikeCount = await likeCommentInDjango(commentId, userToken);

        if (newLikeCount !== null ) {
          io.to(roomId).emit("comment-liked", {
            commentId,
            likes: newLikeCount,
          });
        }
      } catch (error) {
        console.error("Error processing comment like:", error.message);
      }
    });

    socket.on('disconnect', () => {
      console.log(` Disconnected: ${socket.user?.id}`);
    });
  });
}
