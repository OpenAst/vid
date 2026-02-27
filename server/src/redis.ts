import { createClient, RedisClientType } from 'redis';
import { createAdapter } from '@socket.io/redis-adapter';

const REDIS_URL = process.env.REDIS_URL;

export const initializeRedisAdapter = async () => {
  const pubClient: RedisClientType = createClient({ 
    url: REDIS_URL
  });
  const subClient = pubClient.duplicate();

  pubClient.on('error', (err) => console.error('PUB Error:', err));
  subClient.on('error', (err) => console.error('SUB Error:', err));

  await Promise.all([pubClient.connect(), subClient.connect()]);
  console.log('✅ Redis clients connected');

  return {
    adapter: createAdapter(pubClient, subClient),
    client: pubClient,
    close: async () => {
      await Promise.all([pubClient.quit(), subClient.quit()]);
    }
  };
};