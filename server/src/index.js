"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const redis_1 = require("./redis");
const socket_1 = require("./socket");
const FRONTEND_URL = process.env.FRONTEND_URL;
const app = (0, express_1.default)();
const httpServer = (0, http_1.createServer)(app);
async function startServer() {
    try {
        const { adapter, client, close } = await (0, redis_1.initializeRedisAdapter)();
        const io = new socket_io_1.Server(httpServer, {
            cors: {
                origin: FRONTEND_URL,
                methods: ["GET", "POST"],
                credentials: true
            },
        });
        io.adapter(adapter);
        (0, socket_1.setupCommentSocket)(io, client);
        (0, socket_1.likeSystem)(io, client);
        httpServer.listen(3001, () => {
            console.log('Server running on port 3001');
        });
        process.on('SIGTERM', async () => {
            await close();
            httpServer.close();
            console.log('Server gracefully stopped');
        });
    }
    catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}
startServer();
