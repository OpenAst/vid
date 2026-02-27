import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { initializeRedisAdapter } from './redis';
import { setupCommentSocket, likeSystem } from './socket';

const FRONTEND_URL = process.env.FRONTEND_URL;
const PORT = process.env.PORT;

const app = express();
const httpServer = createServer(app);

async function startServer() {
  try {
    const { adapter, client, close } = await initializeRedisAdapter();

    const io = new Server(httpServer, {
      cors: {
        origin: FRONTEND_URL,
        methods: ["GET", "POST"],
        credentials: true
      },
    });
    io.adapter(adapter);

    setupCommentSocket(io, client);
    likeSystem(io, client);

    httpServer.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
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