import express from 'express';
import { ExpressAdapter } from '@nestjs/platform-express';
import { NestFactory } from '@nestjs/core';
import type { INestApplication } from '@nestjs/common';

import { AppModule } from '../src/app.module';

const server = express();

server.set('trust proxy', 1);

server.use((req, _res, next) => {
  if (req.url === '/' || req.url === '') {
    req.url = '/health';
  } else if (req.url === '/api') {
    req.url = '/health';
  } else if (req.url.startsWith('/api/')) {
    req.url = req.url.slice(4) || '/health';
  }

  next();
});

let appPromise: Promise<INestApplication> | null = null;

async function bootstrap() {
  if (!appPromise) {
    appPromise = (async () => {
      const app = await NestFactory.create(
        AppModule,
        new ExpressAdapter(server),
        {
          logger: ['error', 'warn', 'log'],
        },
      );

      const configuredOrigins = (
        process.env.CORS_ORIGINS || ''
      )
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean);

      app.enableCors({
        origin:
          configuredOrigins.length > 0
            ? configuredOrigins
            : true,
        credentials: true,
      });

      await app.init();

      return app;
    })();
  }

  return appPromise;
}

export default async function handler(
  req: express.Request,
  res: express.Response,
) {
  try {
    await bootstrap();
    return server(req, res);
  } catch (error: any) {
    console.error(
      'Vercel Nest bootstrap failed:',
      error?.stack || error,
    );

    if (!res.headersSent) {
      return res.status(500).json({
        ok: false,
        service: 'Support Command Center API',
        error: 'Backend bootstrap failed',
        errorCode: 'NEST_BOOTSTRAP_FAILED',
      });
    }
  }
}
