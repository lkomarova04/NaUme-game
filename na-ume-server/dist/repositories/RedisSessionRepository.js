"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RedisSessionRepository = void 0;
const ioredis_1 = __importDefault(require("ioredis"));
class RedisSessionRepository {
    redis;
    keyPrefix = 'na-ume:session:';
    indexKey = 'na-ume:sessions';
    cache = new Map();
    constructor(redisUrl) {
        this.redis = new ioredis_1.default(redisUrl, {
            lazyConnect: false,
            maxRetriesPerRequest: 1,
        });
    }
    create(session) {
        this.cache.set(session.sessionId, session);
        void this.save(session);
        return session;
    }
    get(sessionId) {
        return this.cache.get(sessionId);
    }
    getAll() {
        return Array.from(this.cache.values());
    }
    update(session, options = {}) {
        this.cache.set(session.sessionId, session);
        if (options.durable) {
            void this.save(session);
        }
        return session;
    }
    delete(sessionId) {
        this.cache.delete(sessionId);
        void this.redis.del(this.getKey(sessionId));
        void this.redis.srem(this.indexKey, sessionId);
    }
    async hydrate() {
        const sessionIds = await this.redis.smembers(this.indexKey);
        const sessions = await Promise.all(sessionIds.map((sessionId) => this.redis.get(this.getKey(sessionId))));
        sessions.forEach((serializedSession) => {
            if (!serializedSession)
                return;
            const session = JSON.parse(serializedSession);
            this.cache.set(session.sessionId, {
                ...session,
                playerSockets: new Map(),
                disconnectTimers: new Map(),
                timer: undefined,
            });
        });
    }
    async save(session) {
        const { playerSockets: _playerSockets, disconnectTimers: _disconnectTimers, timer: _timer, ...serializedSession } = session;
        await this.redis
            .multi()
            .set(this.getKey(session.sessionId), JSON.stringify(serializedSession))
            .sadd(this.indexKey, session.sessionId)
            .exec();
    }
    getKey(sessionId) {
        return `${this.keyPrefix}${sessionId}`;
    }
}
exports.RedisSessionRepository = RedisSessionRepository;
