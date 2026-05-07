import { Pool } from 'pg';
import { env } from '../config/env';

export const createPgPool = () => {
  if (!env.databaseUrl) {
    throw new Error('DATABASE_URL is not configured');
  }

  return new Pool({
    connectionString: env.databaseUrl,
  });
};
