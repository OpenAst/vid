// server/socket.ts
import { Server, Socket } from 'socket.io';
import { RedisClientType } from 'redis';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

interface UserInfo {
  id: string;
  username: string;
  avatar?: string;
}

interface Comment {
  id: string;
  text: string;
  user: UserInfo;
  likedBy: string[];
  likes: number;
  createdAt: string;
  replies?: Comment[];
}

export const setupCommentSocket = (
  io: Server,
  redisClient: RedisClientType,
) => {
  const commentIo = io.of('/comments');

  // Middleware to authenticate socket via JWT cookie
  commentIo.use((socket: Socket, next) => {
    const cookieHeader = socket.handshake.headers.cookie || '';
    const cookies = Object.fromEntries(
      cookieHeader
        .split(';')
        .map(c => c.trim().split('=').map(decodeURIComponent))
    );
    const token = cookies.access;
    if (!token) return next(new Error('Authentication required'));

    socket.data.token = token;
    next();
  });

  commentIo.on('connection', (socket) => {
    console.log(`New comment connection: ${socket.id}`);

    socket.on('join-room', async (roomId: string) => {
      socket.join(roomId);
      console.log(`Socket ${socket.id} joined room ${roomId}`);

      try {
        const history = await redisClient.get(`comments:${roomId}`);
        socket.emit('comments-history', history ? JSON.parse(history) : []);
      } catch (err) {
        console.error('Redis fetch error:', err);
      }
    });

    socket.on('send-comment', async ({ text, roomId, user }) => {
      try {
        const res = await axios.post(
          `${process.env.DJANGO_API_URL}/api/comments/create/${roomId}/`,
          {
            video: roomId,
            user: user.id,
            content: text,
          },
          {
            headers: {
              Authorization: `JWT ${socket.data.token}`,
              'Content-Type': 'application/json',
            },
            withCredentials: true,
          }
        );

        const createdComment = res.data;
        console.log('Received comment', createdComment);

        // Cache in Redis
        const cached = await redisClient.get(`comments:${roomId}`);
        const updatedComments = cached
          ? [...JSON.parse(cached), createdComment]
          : [createdComment];

        await redisClient.set(`comments:${roomId}`, JSON.stringify(updatedComments));

        // Broadcast
        commentIo.to(roomId).emit('new-comment', createdComment);

        console.log('Comment stored successfully:', createdComment.id);
      } catch (err: any) {
        console.error('Failed to sync comment to Django:', err.message);
        if (err.response) {
          console.error('Django Response Status:', err.response.status);
          console.error('Django Response Data:', err.response.data);
        }
      }
    });

    // Like a comment
    socket.on('vote-comment', async ({ commentId, roomId, userId }) => {
      try {
        const data = await redisClient.get(`comments:${roomId}`);
        if (!data) return;

        const parsed: Comment[] = JSON.parse(data);

        const updated = parsed.map(comment => {
          if (comment.id === commentId) {
            const likedBy = new Set(comment.likedBy || []);
            if (!likedBy.has(userId)) {
              likedBy.add(userId);
              comment.likes += 1;
              comment.likedBy = Array.from(likedBy);
              console.log("Comment liked successfully", comment.id);
            }
          }
          return comment;
        });
        await redisClient.set(`comments:${roomId}`, JSON.stringify(updated));

        const likedComment = updated.find(c => c.id === commentId);
        if (likedComment) {
          commentIo.to(roomId).emit('comment-liked', {
            commentId,
            likes: likedComment.likes,
          });
        }

        // Persist like to Django
        await axios.post(
          `${process.env.DJANGO_API_URL}/api/comments/vote/`,
          {
            value: 1,
            commentId,
          },
          {
            headers: {
              Authorization: `JWT ${socket.data.token}`,
              'Content-Type': 'application/json',
            },
          }
        );
      } catch (error) {
        console.error('Redis or Django like error:', error);
      }
    });


    socket.on('send-reply', async ({ parentId, text, roomId, user }) => {
      try {
        // Save reply in Django
        const res = await axios.post(
          `${process.env.DJANGO_API_URL}/api/comments/reply/${parentId}/`,
          {
            user: user.id,
            content: text,
          },
          {
            headers: {
              Authorization: `JWT ${socket.data.token}`,
              'Content-Type': 'application/json',
            },
          }
        );

        const newReply = res.data;

        // Update Redis cache
        const comments = await redisClient.get(`comments:${roomId}`);
        if (!comments) return;

        const parsedComments: Comment[] = JSON.parse(comments);
        const updatedComments = parsedComments.map(comment => {
          if (comment.id === parentId) {
            return {
              ...comment,
              replies: [...(comment.replies || []), newReply],
            };
          }
          return comment;
        });

        await redisClient.set(`comments:${roomId}`, JSON.stringify(updatedComments));

        // Emit reply event
        commentIo.to(roomId).emit('new-reply', { parentId, reply: newReply });
      } catch (error) {
        console.error('Reply error:', error);
      }
    });

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });
};

// Video Like System
export const likeSystem = (io: Server, redisClient: RedisClientType) => {
  const videoLike = io.of('/video-likes');

  // Reuse existing auth middleware
  videoLike.use((socket: Socket, next) => {
    const cookieHeader = socket.handshake.headers.cookie || '';
    const cookies = Object.fromEntries(
      cookieHeader
        .split(';')
        .map(c => c.trim().split('=').map(decodeURIComponent))
    );
    const token = cookies.access;
    if (!token) return next(new Error('Authentication required'));

    socket.data.token = token;
    next();
  });

  videoLike.on('connection', (socket) => {
    console.log(`New video-like connection: ${socket.id}`);

    socket.on('like-video', async ({ videoId, userId }) => {
      console.log(`User ${userId} liking video ${videoId}`);
      try {
        // Persist to Django
        const res = await axios.post(
          `${process.env.DJANGO_API_URL}/api/videos/vote/`,
          {
            video: videoId,
            value: 1
          },
          {
            headers: {
              Authorization: `JWT ${socket.data.token}`,
              'Content-Type': 'application/json',
            },
          }
        );

        const data = res.data;
        // Backend returns { value: 1 } for like, { value: "0" } (or 0) for remove
        // Check logic based on views.py

        const voteValue = parseInt(data.value); // Ensure it's number

        if (voteValue === 1) {
          videoLike.emit('video-liked', { videoId, userId });
          console.log(`Video ${videoId} liked by ${userId}`);
        } else if (voteValue === 0) {
          videoLike.emit('video-unliked', { videoId, userId });
          console.log(`Video ${videoId} unliked by ${userId}`);
        }

      } catch (err: any) {
        console.error(`Failed to like video ${videoId}:`, err.response?.data || err.message);
      }
    });

    socket.on('disconnect', () => {
      console.log(`Video-like socket disconnected: ${socket.id}`);
    });
  });
};
