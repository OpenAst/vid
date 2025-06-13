import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { initializeRedisAdapter } from './redis';
import { setupCommentSocket } from './socket';
import { RedisAdapter } from '@socket.io/redis-adapter';

const app = express();
const httpServer = createServer(app);

async function startServer() {
  try {
    const { adapter, client, close } = await initializeRedisAdapter();

    const io = new Server(httpServer, {
      cors: {
        origin: "http://localhost:3000",
        methods: ["GET", "POST"],
        credentials: true
      },
    });
    io.adapter(adapter);

    setupCommentSocket(io, client);

    httpServer.listen(3001, () => {
      console.log('Server running on port 3001');
    });

    process.on('SIGTERM', async () => {
      await close();
      httpServer.close();
      console.log('Server gracefully stopped');
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();