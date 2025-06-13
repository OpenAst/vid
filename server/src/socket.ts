// server/socket.ts
import { Server, Socket } from 'socket.io';
import { RedisClientType } from 'redis';
import { randomUUID } from 'crypto';

interface Comment {
  id: string;
  text: string;
  user: {
    id: string;
    name: string;
    avatar?: string;
  };
  likes: number;
  createdAt: string;
  replies?: Comment[];
}

export const setupCommentSocket = (
  io: Server,
  redisClient: RedisClientType,
) => {
  const commentIo = io.of('/comments');

  commentIo.use((socket: Socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error('Authentication required'));
    next();
  });

  commentIo.on('connection', (socket) => {
    console.log(`New comment connection: ${socket.id}`);

    // Join room handler
    socket.on('join-room', async (roomId: string) => {
      socket.join(roomId);
      console.log(`Socket ${socket.id} joined room ${roomId}`);

      // Fetch comment history from DB or cache
      const history = await redisClient.get(`comments:${roomId}`);
      socket.emit('comments-history', history ? JSON.parse(history) : []);
    });

    // New comment handler
    socket.on('send-comment', async ({ text, roomId, user }) => {
      const newComment: Comment = {
        id: randomUUID(),
        text,
        user,
        likes: 0,
        createdAt: new Date().toISOString()
      };

      // Broadcast to room
      commentIo.to(roomId).emit('new-comment', newComment);

      // Save to Redis
      const comments = await redisClient.get(`comments:${roomId}`);
      const updatedComments = comments 
        ? [...JSON.parse(comments), newComment] 
        : [newComment];
      
      await redisClient.set(`comments:${roomId}`, JSON.stringify(updatedComments));

    });

    // Like comment handler
    socket.on('like-comment', async ({ commentId, roomId }) => {
      try {
        const comments = await redisClient.get(`comments:${roomId}`);
        if (!comments) return;
  
        const parsedComments: Comment[] = JSON.parse(comments);
        const updatedComments = parsedComments.map(comment => {
          if (comment.id === commentId) {
            return { ...comment, likes: comment.likes + 1 };
          }
          return comment;
        });
  
        await redisClient.set(`comments:${roomId}`, JSON.stringify(updatedComments));
  
        // Find the liked comment to get current like count
        const likedComment = updatedComments.find(c => c.id === commentId);
        if (likedComment) {
          commentIo.to(roomId).emit('comment-liked', { 
            commentId, 
            likes: likedComment.likes 
          });
        }
      } catch (error) {
        console.log('Redis error:', error);
      }
    });

    // Reply handler
    socket.on('send-reply', async ({ parentId, text, roomId, user }) => {
      try {
        const comments = await redisClient.get(`comments:${roomId}`);
        if (!comments) return;
  
        const parsedComments: Comment[] = JSON.parse(comments);
        const parentComment = parsedComments.find(c => c.id === parentId);
        if (!parentComment) return;
  
        const newReply: Comment = {
          id: randomUUID(),
          text,
          user,
          likes: 0,
          createdAt: new Date().toISOString()
        };
  
        const updatedComments = parsedComments.map(comment => {
          if (comment.id === parentId) {
            return {
              ...comment,
              replies: [...(comment.replies || []), newReply]
            };
          }
          return comment;
        });
  
        await redisClient.set(`comments:${roomId}`, JSON.stringify(updatedComments));
  
        commentIo.to(roomId).emit('new-reply', { parentId, reply: newReply });
      } catch (error) {
        console.log('Redis error:', error);
      }
    });

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });
};