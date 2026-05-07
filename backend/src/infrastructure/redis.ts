import { createClient, RedisClientType } from 'redis';

export class RedisClient {
  private client: RedisClientType | null = null;
  private isConnected: boolean = false;

  async connect(): Promise<void> {
    try {
      this.client = createClient({
        socket: {
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT || '6379'),
        },
        password: process.env.REDIS_PASSWORD || undefined,
      });

      this.client.on('error', (err: Error) => {
        // Só loga erro se ainda não sabemos que Redis não está disponível
        if (this.isConnected) {
          console.error('Redis Client Error', err);
        }
        this.isConnected = false;
      });

      await this.client.connect();
      this.isConnected = true;
      console.log('✓ Redis connected');
    } catch (error) {
      console.warn('⚠️  Redis connection failed - running in fallback mode');
      this.isConnected = false;
      // Não relança a exceção - permite que o servidor continue
    }
  }

  async acquireLock(key: string, ttlSeconds: number = 30): Promise<string | null> {
    if (!this.isConnected || !this.client) {
      // Fallback: sempre concede o lock quando Redis não está disponível
      return `${Date.now()}-${Math.random()}`;
    }
    const lockId = `${Date.now()}-${Math.random()}`;
    const result = await this.client.set(key, lockId, {
      NX: true,
      EX: ttlSeconds,
    });
    return result ? lockId : null;
  }

  async releaseLock(key: string, lockId: string): Promise<boolean> {
    if (!this.isConnected || !this.client) {
      // Fallback: sempre libera o lock quando Redis não está disponível
      return true;
    }
    const current = await this.client.get(key);
    if (current === lockId) {
      await this.client.del(key);
      return true;
    }
    return false;
  }

  async getCachedData<T>(key: string): Promise<T | null> {
    if (!this.isConnected || !this.client) {
      // Fallback: sem cache quando Redis não está disponível
      return null;
    }
    const data = await this.client.get(key);
    return data ? JSON.parse(data) : null;
  }

  async setCachedData<T>(key: string, data: T, ttlSeconds: number = 3600): Promise<void> {
    if (!this.isConnected || !this.client) {
      // Fallback: não faz nada quando Redis não está disponível
      return;
    }
    await this.client.setEx(key, ttlSeconds, JSON.stringify(data));
  }

  async invalidateCache(pattern: string): Promise<void> {
    if (!this.client) return;
    const keys = await this.client.keys(pattern);
    if (keys.length > 0) {
      await this.client.del(keys);
    }
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.quit();
    }
  }
}

export const redisClient = new RedisClient();
