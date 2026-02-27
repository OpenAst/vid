"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeRedisAdapter = void 0;
const redis_1 = require("redis");
const redis_adapter_1 = require("@socket.io/redis-adapter");
const REDIS_URL = process.env.REDIS_URL;
const initializeRedisAdapter = async () => {
    const pubClient = (0, redis_1.createClient)({
        url: REDIS_URL
    });
    const subClient = pubClient.duplicate();
    pubClient.on('error', (err) => console.error('PUB Error:', err));
    subClient.on('error', (err) => console.error('SUB Error:', err));
    await Promise.all([pubClient.connect(), subClient.connect()]);
    console.log('✅ Redis clients connected');
    return {
        adapter: (0, redis_adapter_1.createAdapter)(pubClient, subClient),
        client: pubClient,
        close: async () => {
            await Promise.all([pubClient.quit(), subClient.quit()]);
        }
    };
};
exports.initializeRedisAdapter = initializeRedisAdapter;
