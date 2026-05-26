import Redis from 'ioredis';
import type { InternalSession } from '../domain/types';
import type { SessionRepository, SessionUpdateOptions } from './SessionRepository';

type SerializedSession = Omit<InternalSession, 'playerSockets' | 'disconnectTimers' | 'timer'>;

export class RedisSessionRepository implements SessionRepository {
  private readonly redis: Redis;
  private readonly keyPrefix = 'na-ume:session:';
  private readonly indexKey = 'na-ume:sessions';
  private readonly cache = new Map<string, InternalSession>();

  constructor(redisUrl: string) {
    this.redis = new Redis(redisUrl, {
      lazyConnect: false,
      maxRetriesPerRequest: 1,
    });
  }

  create(session: InternalSession) {
    this.cache.set(session.sessionId, session);
    void this.save(session);
    return session;
  }

  get(sessionId: string) {
    return this.cache.get(sessionId);
  }

  getAll() {
    return Array.from(this.cache.values());
  }

  update(session: InternalSession, options: SessionUpdateOptions = {}) {
    this.cache.set(session.sessionId, session);
    if (options.durable) {
      void this.save(session);
    }
    return session;
  }

  delete(sessionId: string) {
    this.cache.delete(sessionId);
    void this.redis.del(this.getKey(sessionId));
    void this.redis.srem(this.indexKey, sessionId);
  }

  async hydrate() {
    const sessionIds = await this.redis.smembers(this.indexKey);
    const sessions = await Promise.all(sessionIds.map((sessionId) => this.redis.get(this.getKey(sessionId))));

    sessions.forEach((serializedSession) => {
      if (!serializedSession) return;

      const session = JSON.parse(serializedSession) as SerializedSession;
      this.cache.set(session.sessionId, {
        ...session,
        playerSockets: new Map<string, Set<string>>(),
        disconnectTimers: new Map<string, NodeJS.Timeout>(),
        timer: undefined,
      });
    });
  }

  private async save(session: InternalSession) {
    const {
      playerSockets: _playerSockets,
      disconnectTimers: _disconnectTimers,
      timer: _timer,
      ...serializedSession
    } = session;

    await this.redis
      .multi()
      .set(this.getKey(session.sessionId), JSON.stringify(serializedSession))
      .sadd(this.indexKey, session.sessionId)
      .exec();
  }

  private getKey(sessionId: string) {
    return `${this.keyPrefix}${sessionId}`;
  }
}
