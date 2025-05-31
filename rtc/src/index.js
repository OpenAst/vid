import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import verifyJwt from '../auth/verifyJwt.js';
import { videoSocket } from '../sockets/video.js';

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  },
  maxDisconnectionDuration: 2 * 60 * 1000,
    skipMiddlewares: true,
});

io.use((socket, next) => {
  const token = socket.handshake.auth.token;

  const { valid, payload, error } = verifyJwt(token);
  if (!valid) return next(new Error('Unauthorized: ' + error));

  socket.user = { ...payload, token };
  next();
});

videoSocket(io);

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
