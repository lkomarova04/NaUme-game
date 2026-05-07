import cors from 'cors';
import express from 'express';
import { env } from './config/env';

export const createApp = () => {
  const app = express();

  app.use(cors({ origin: env.clientOrigin, credentials: true }));
  app.use(express.json());

  app.get('/health', (_req, res) => {
    res.json({
      ok: true,
      uptime: process.uptime(),
      timestamp: Date.now(),
    });
  });

  return app;
};
