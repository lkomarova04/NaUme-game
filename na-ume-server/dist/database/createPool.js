"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createPgPool = void 0;
const pg_1 = require("pg");
const env_1 = require("../config/env");
const createPgPool = () => {
    if (!env_1.env.databaseUrl) {
        throw new Error('DATABASE_URL is not configured');
    }
    return new pg_1.Pool({
        connectionString: env_1.env.databaseUrl,
    });
};
exports.createPgPool = createPgPool;
